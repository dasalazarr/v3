import { ChatBuffer } from '@running-coach/vector-memory';

export class FreemiumService {
  constructor(
    private chatBuffer: ChatBuffer,
    private messageLimit: number,
    private paywallLink: string
  ) {}

  private getMonthKey(userId: string): { key: string; ttl: number } {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    
    // Calculate the first day of the next month
    const firstDayOfNextMonth = new Date(Date.UTC(year, month + 1, 1));
    
    // Calculate the remaining seconds in the current month
    const ttl = Math.floor((firstDayOfNextMonth.getTime() - now.getTime()) / 1000);
    
    const key = `msg:${userId}:${year}-${month + 1}`
    return { key, ttl };
  }

  public async checkMessageAllowance(user: any): Promise<{ allowed: boolean; link?: string }> {
    if (user.subscriptionStatus === 'active') {
      return { allowed: true };
    }
    const { key, ttl } = this.getMonthKey(user.id);
    const count = await this.chatBuffer.incrementKey(key, ttl);
    if (count > this.messageLimit) {
      return { allowed: false, link: this.paywallLink };
    }
    return { allowed: true };
  }
}
