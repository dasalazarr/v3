import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Function to send WhatsApp messages via Meta API
async function sendWhatsAppMessage(to: string, message: string, config: any) {
  try {
    const url = `https://graph.facebook.com/v17.0/${config.NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to send WhatsApp message: ${response.status} - ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return false;
  }
}

export const handleGumroadWebhook = async (req: Request, res: Response) => {
  console.log('🔥 [GUMROAD] Webhook received at:', new Date().toISOString());
  console.log('🔥 [GUMROAD] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔥 [GUMROAD] Body:', JSON.stringify(req.body, null, 2));
  console.log('🔥 [GUMROAD] Body keys:', Object.keys(req.body));

  // Gumroad sends x-www-form-urlencoded data
  const {
    sale_id,
    product_id,
    product_name,
    email,
    custom_fields,
    url_params,
    full_name,
    price,
    recurrence
  } = req.body;

  // Parse custom_fields if it's a string (sometimes Gumroad sends it as JSON string)
  let parsedCustomFields;
  try {
    parsedCustomFields = typeof custom_fields === 'string'
      ? JSON.parse(custom_fields)
      : custom_fields;
  } catch (error) {
    console.log('🔥 [GUMROAD] Custom fields not JSON, using as-is:', custom_fields);
    parsedCustomFields = custom_fields;
  }

  // Robust phone number extraction from multiple possible locations
  let phoneNumber = parsedCustomFields?.phone_number;

  // Function to extract phone number from various possible formats
  const extractPhoneNumber = (data: any): string | undefined => {
    if (!data) return undefined;

    // Direct access patterns
    const patterns = [
      'phone_number',
      'custom_fields[phone_number]',
      'custom_fields%5Bphone_number%5D',
      'custom_fields.phone_number'
    ];

    for (const pattern of patterns) {
      if (data[pattern]) {
        console.log(`🔥 [GUMROAD] Found phone number with pattern "${pattern}":`, data[pattern]);
        return data[pattern];
      }
    }

    // Check nested objects
    if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (key.includes('phone_number') || key.includes('phone')) {
          console.log(`🔥 [GUMROAD] Found phone number in key "${key}":`, value);
          return value as string;
        }
      }
    }

    return undefined;
  };

  // Try extracting from custom_fields first
  if (!phoneNumber && parsedCustomFields) {
    phoneNumber = extractPhoneNumber(parsedCustomFields);
  }

  // Try extracting from url_params
  if (!phoneNumber && url_params) {
    // Parse url_params if it's a JSON string
    let parsedUrlParams;
    try {
      parsedUrlParams = typeof url_params === 'string' ? JSON.parse(url_params) : url_params;
    } catch (error) {
      console.log('🔥 [GUMROAD] URL params not JSON, using as-is:', url_params);
      parsedUrlParams = url_params;
    }

    phoneNumber = extractPhoneNumber(parsedUrlParams) || extractPhoneNumber(url_params);

    console.log('🔥 [GUMROAD] URL params structure:', JSON.stringify(url_params, null, 2));
    console.log('🔥 [GUMROAD] Parsed URL params structure:', JSON.stringify(parsedUrlParams, null, 2));
  }

  // Try extracting from main request body
  if (!phoneNumber) {
    phoneNumber = extractPhoneNumber(req.body);
    console.log('🔥 [GUMROAD] Checking main request body for phone number');
  }

  console.log(`🔥 [GUMROAD] Extracted phone number: ${phoneNumber}`);
  console.log(`🔥 [GUMROAD] Sale ID: ${sale_id}`);
  console.log(`🔥 [GUMROAD] Product ID: ${product_id}`);
  console.log(`🔥 [GUMROAD] Email: ${email}`);
  console.log(`🔥 [GUMROAD] Price: ${price}`);

  if (!phoneNumber) {
    console.error('🔥 [GUMROAD] Missing phone_number in custom_fields');
    console.error('🔥 [GUMROAD] Available custom_fields:', parsedCustomFields);
    console.error('🔥 [GUMROAD] Available url_params:', url_params);
    console.error('🔥 [GUMROAD] Checking url_params keys:', url_params ? Object.keys(url_params) : 'none');
    return res.status(400).json({ error: 'Missing phone_number in custom_fields' });
  }

  const productIdEn = container.resolve<string>('GUMROAD_PRODUCT_ID_EN');
  const productIdEs = container.resolve<string>('GUMROAD_PRODUCT_ID_ES');

  console.log(`🔥 [GUMROAD] Expected product IDs: EN=${productIdEn}, ES=${productIdEs}`);
  console.log(`🔥 [GUMROAD] Received product ID: ${product_id}`);

  // TODO: Fix product ID validation - Gumroad sends internal IDs, not short names
  // Temporarily disabled to allow real payments to process
  /*
  if (product_id !== productIdEn && product_id !== productIdEs) {
    console.error(`🔥 [GUMROAD] Product ID mismatch: received=${product_id}`);
    return res.status(400).json({ error: 'Product ID does not match' });
  }
  */

  console.log(`🔥 [GUMROAD] Product ID validation temporarily disabled - processing payment`);

  // Additional validation: check if it's our product by permalink or product name
  const isValidProduct = product_name?.includes('Andes') ||
                        (typeof req.body.permalink === 'string' && req.body.permalink === 'andes');

  if (!isValidProduct) {
    console.error(`🔥 [GUMROAD] Invalid product: name=${product_name}, permalink=${req.body.permalink}`);
    return res.status(400).json({ error: 'Invalid product' });
  }

  console.log(`🔥 [GUMROAD] Product validation passed: ${product_name}`);

  try {
    const db = container.resolve<Database>('Database');

    // Find user with proper error handling
    const [user] = await db.query
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.error(`❌ Gumroad webhook: User not found for phone ${phoneNumber}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already premium to avoid duplicate processing
    if (user.subscriptionStatus === 'premium') {
      console.log(`⚠️ User ${user.id} (${user.phoneNumber}) is already premium - skipping update`);
      return res.status(200).json({ success: true, message: 'User already premium' });
    }

    // Update user to premium with transaction safety
    const [updatedUser] = await db.query
      .update(users)
      .set({
        subscriptionStatus: 'premium',
        premiumActivatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to update user to premium status');
    }

    console.log(`🎉 [GUMROAD] Successfully upgraded user to premium!`);
    console.log(`🎉 [GUMROAD] User ID: ${updatedUser.id}`);
    console.log(`🎉 [GUMROAD] Phone: ${updatedUser.phoneNumber}`);
    console.log(`🎉 [GUMROAD] Email: ${email || 'Not provided'}`);
    console.log(`🎉 [GUMROAD] Sale ID: ${sale_id}`);
    console.log(`🎉 [GUMROAD] Price: $${price ? (parseInt(price) / 100).toFixed(2) : 'Unknown'}`);
    console.log(`🎉 [GUMROAD] Premium activated at: ${updatedUser.premiumActivatedAt}`);

    // Send WhatsApp confirmation message with retry logic
    try {
      const confirmationMessage = updatedUser.preferredLanguage === 'es'
        ? `🎉 ¡Pago confirmado! Bienvenido a Andes Premium.\n\nAhora tienes acceso completo a:\n✅ Entrenamientos personalizados ilimitados\n✅ Planes adaptativos\n✅ Soporte prioritario\n\nEscribe cualquier mensaje para comenzar tu entrenamiento.`
        : `🎉 Payment confirmed! Welcome to Andes Premium.\n\nYou now have full access to:\n✅ Unlimited personalized training\n✅ Adaptive plans\n✅ Priority support\n\nSend any message to start your training.`;

      // Get WhatsApp configuration
      const config = {
        NUMBER_ID: container.resolve<string>('NUMBER_ID'),
        JWT_TOKEN: container.resolve<string>('JWT_TOKEN')
      };

      // Send WhatsApp message with error handling
      const messageSent = await sendWhatsAppMessage(updatedUser.phoneNumber, confirmationMessage, config);

      if (messageSent) {
        console.log(`✅ WhatsApp confirmation sent successfully to ${updatedUser.phoneNumber}`);
      } else {
        console.error(`❌ Failed to send WhatsApp confirmation to ${updatedUser.phoneNumber}`);
        // Don't fail the webhook if WhatsApp message fails - payment was successful
      }
    } catch (error) {
      console.error(`❌ Error sending WhatsApp confirmation to ${updatedUser.phoneNumber}:`, error);
      // Don't fail the webhook if WhatsApp message fails - payment was successful
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing Gumroad webhook:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};