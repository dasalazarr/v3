import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { FreemiumService } from '../services/freemium-service.js';

export const handleWebOnboardingPremium = async (req: Request, res: Response) => {
  const { phoneNumber, language } = req.body;

  if (!phoneNumber || !language) {
    return res.status(400).json({ error: 'Missing phoneNumber or language' });
  }

  try {
    const db = container.resolve<Database>('Database');
    let [user] = await db.query.select().from(users).where(eq(users.phoneNumber, phoneNumber)).limit(1);

    if (!user) {
      [user] = await db.query.insert(users)
        .values({
          phoneNumber,
          preferredLanguage: language,
          subscriptionStatus: 'pending_payment',
        })
        .returning();
    } else {
      // Update existing user to pending_payment if they are free
      if (user.subscriptionStatus === 'free') {
        await db.query
          .update(users)
          .set({ subscriptionStatus: 'pending_payment', updatedAt: new Date() })
          .where(eq(users.id, user.id));
        user.subscriptionStatus = 'pending_payment'; // Update local user object for consistency
      }
    }

    if (!user) {
      throw new Error('Failed to create or retrieve user');
    }

    const freemiumService = container.resolve<FreemiumService>('FreemiumService');
    const gumroadUrl = freemiumService.generatePaymentLink(user);

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
    const db = container.resolve<Database>('Database');
    let [user] = await db.query.select().from(users).where(eq(users.phoneNumber, phoneNumber)).limit(1);

    if (!user) {
      [user] = await db.query.insert(users)
        .values({
        phoneNumber,
        preferredLanguage: language,
        subscriptionStatus: 'free',
        })
        .returning();
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
