import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { DatabaseService } from '../../../../packages/database/src/index';
import { users } from '../../../../packages/database/src/schema';
import { eq } from 'drizzle-orm';
import { PaymentService } from '../services/payment-service';

export const handleWebOnboardingPremium = async (req: Request, res: Response) => {
  const { phoneNumber, language } = req.body;

  if (!phoneNumber || !language) {
    return res.status(400).json({ error: 'Missing phoneNumber or language' });
  }

  try {
    const db = container.resolve(DatabaseService);
    let user = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    if (!user) {
      [user] = await db.insert(users).values({
        phoneNumber,
        preferredLanguage: language,
        paymentStatus: 'pending_payment',
      }).returning();
    } else {
      // Update existing user to pending_payment if they are free
      if (user.paymentStatus === 'free') {
        await db.updateUser(user.id, { paymentStatus: 'pending_payment' });
        user.paymentStatus = 'pending_payment'; // Update local user object for consistency
      }
    }

    if (!user) {
      throw new Error('Failed to create or retrieve user');
    }

    const paymentService = container.resolve(PaymentService);
    const gumroadUrl = paymentService.generatePaymentLink(user);

    return res.status(200).json({ gumroadUrl });
  } catch (error) {
    console.error('Error in web onboarding premium:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handleWebOnboardingFree = async (req: Request, res: Response) => {
  const { phoneNumber, language } = req.body;

  if (!phoneNumber || !language) {
    return res.status(400).json({ error: 'Missing phoneNumber or language' });
  }

  try {
    const db = container.resolve(DatabaseService);
    let user = await db.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    if (!user) {
      [user] = await db.insert(users).values({
        phoneNumber,
        preferredLanguage: language,
        paymentStatus: 'free',
      }).returning();
    }
    
    // For free users, we just need to ensure they exist and can be redirected to WhatsApp
    // The actual WhatsApp message will be sent by the bot when they first interact.
    const whatsappLink = `https://wa.me/${phoneNumber}`; // Assuming direct link is sufficient for now

    return res.status(200).json({ success: true, whatsappLink });
  } catch (error) {
    console.error('Error in web onboarding free:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
