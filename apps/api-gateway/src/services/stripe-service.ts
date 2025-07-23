import Stripe from 'stripe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

export class StripeService {
  private stripe: Stripe;
  constructor(
    apiKey: string,
    private webhookSecret: string,
    private db: Database
  ) {
    // Initialize Stripe client
    this.stripe = new Stripe(apiKey, { apiVersion: '2025-06-30.basil' });
  }

  public async createCheckoutSession(phone: string, priceId: string) {
    return await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.SUCCESS_URL || 'https://example.com/success',
      cancel_url: process.env.CANCEL_URL || 'https://example.com/cancel',
      metadata: { phone }
    });
  }

  public constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  public async handleEvent(event: Stripe.Event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const phone = session.metadata?.phone;
      if (phone) {
        await this.db.query
          .update(users)
          .set({ subscriptionStatus: 'premium', updatedAt: new Date() })
          .where(eq(users.phoneNumber, phone));
      }
    }
  }
}

