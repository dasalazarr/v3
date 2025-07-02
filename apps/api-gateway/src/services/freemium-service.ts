import { ChatBuffer } from '@running-coach/vector-memory';

export class FreemiumService {
  constructor(
    private chatBuffer: ChatBuffer,
    private messageLimit: number,
    private paywallLink: string
  ) {}

  private getMonthKey(userId: string): string {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
    return `msg:${userId}:${year}-${month}`;
  }

  public async checkMessageAllowance(user: any): Promise<{ allowed: boolean; link?: string }> {
    if (user.subscriptionStatus === 'active') {
      return { allowed: true };
    }
    const key = this.getMonthKey(user.id);
    const count = await this.chatBuffer.incrementKey(key, 60 * 60 * 24 * 31);
    if (count > this.messageLimit) {
      return { allowed: false, link: this.paywallLink };
    }
    return { allowed: true };
  }
}
