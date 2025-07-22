import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { Database } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { users } from '@running-coach/database';
import crypto from 'crypto';

export const handleGumroadWebhook = async (req: Request, res: Response) => {
  const secret = container.resolve<string>('GUMROAD_WEBHOOK_SECRET');
  const sentSignature = req.header('X-Gumroad-Signature');

  if (!sentSignature) {
    return res.status(401).json({ error: 'No signature provided' });
  }

  const computedSignature = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');

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
    const db = container.resolve(Database);
    const [user] = await db.query.users.findMany({ where: eq(users.phoneNumber, phoneNumber) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.update(users).set({
      paymentStatus: 'premium',
      premiumActivatedAt: new Date(),
    }).where(eq(users.id, user.id));

    console.log(`✅ User ${user.id} (${user.phoneNumber}) upgraded to premium.`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing Gumroad webhook:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};