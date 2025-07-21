
import { inject, injectable } from 'tsyringe';
import { config } from '../config';
import { User } from '../../../packages/database/src/schema';
import { i18n } from '../../../packages/shared/src/i18n-service';

@injectable()
export class PaymentService {
  constructor() {}

  public generatePaymentLink(user: User): string {
    const productId = user.preferredLanguage === 'es' ? config.GUMROAD_PRODUCT_ID_ES : config.GUMROAD_PRODUCT_ID_EN;
    const url = `https://gumroad.com/l/${productId}?user_id=${user.id}`;
    return url;
  }
}
