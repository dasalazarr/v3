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
  const secret = container.resolve<string>('GUMROAD_WEBHOOK_SECRET');
  const sentSignature = req.header('X-Gumroad-Signature');

  if (!sentSignature) {
    return res.status(401).json({ error: 'No signature provided' });
  }

  const computedSignature = crypto.createHmac('sha256', secret).update((req as any).rawBody).digest('hex');

  if (computedSignature !== sentSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { custom_fields, product_id } = req.body;
  const phoneNumber = custom_fields?.phone_number;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Missing phone_number in custom_fields' });
  }

  const productIdEn = container.resolve<string>('GUMROAD_PRODUCT_ID_EN');
  const productIdEs = container.resolve<string>('GUMROAD_PRODUCT_ID_ES');

  if (product_id !== productIdEn && product_id !== productIdEs) {
    return res.status(400).json({ error: 'Product ID does not match' });
  }

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

    console.log(`✅ User ${user.id} (${user.phoneNumber}) upgraded to premium successfully`);

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