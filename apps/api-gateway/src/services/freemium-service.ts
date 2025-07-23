import { ChatBuffer } from '@running-coach/vector-memory';
import { users } from '@running-coach/database';

type User = typeof users.$inferSelect;

export class FreemiumService {
  constructor(
    private chatBuffer: ChatBuffer,
    private messageLimit: number,
    private gumroadProductIdEn: string,
    private gumroadProductIdEs: string,
  ) {}

  private getMonthKey(userId: string): { key: string; ttl: number } {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    
    const firstDayOfNextMonth = new Date(Date.UTC(year, month + 1, 1));
    const ttl = Math.floor((firstDayOfNextMonth.getTime() - now.getTime()) / 1000);
    
    const key = `msg:${userId}:${year}-${month + 1}`
    return { key, ttl };
  }

  public async checkMessageAllowance(user: User): Promise<{ allowed: boolean; link?: string }> {
    if (user.subscriptionStatus === 'premium') {
      return { allowed: true };
    }
    const { key, ttl } = this.getMonthKey(user.id);
    const count = await this.chatBuffer.incrementKey(key, ttl);
    if (count > this.messageLimit) {
      const link = this.generatePaymentLink(user);
      return { allowed: false, link };
    }
    return { allowed: true };
  }

  public generatePaymentLink(user: User): string {
    const productId = user.preferredLanguage === 'es' ? this.gumroadProductIdEs : this.gumroadProductIdEn;
    const url = `https://gumroad.com/l/${productId}`;
    // Pass the user's phone number in the `custom_fields` to identify them in the webhook
    return `${url}?custom_fields[phone_number]=${encodeURIComponent(user.phoneNumber)}`;
  }
}
