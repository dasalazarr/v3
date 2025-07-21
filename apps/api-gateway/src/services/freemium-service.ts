import { ChatBuffer } from '@running-coach/vector-memory';
import { PaymentService } from './payment-service';
import { User } from '../../../packages/database/src/schema';

export class FreemiumService {
  constructor(
    private chatBuffer: ChatBuffer,
    private messageLimit: number,
    private paymentService: PaymentService
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

  public async checkMessageAllowance(user: User): Promise<{ allowed: boolean; link?: string }> {
    if (user.paymentStatus === 'premium') {
      return { allowed: true };
    }
    const { key, ttl } = this.getMonthKey(user.id);
    const count = await this.chatBuffer.incrementKey(key, ttl);
    if (count > this.messageLimit) {
      const paymentLink = this.paymentService.generatePaymentLink(user);
      return { allowed: false, link: paymentLink };
    }
    return { allowed: true };
  }
}
