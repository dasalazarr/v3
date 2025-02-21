import { EVENTS } from '@builderbot/bot';
import { injectable, inject, container } from 'tsyringe';
import { AIServices } from './aiservices';
import { redis } from '../config';

// Define our own context interface based on the available properties
interface BotContext {
  body: string;
  from: string;
  [key: string]: any;
}

export enum MessageIntent {
  PRODUCT_INQUIRY = 'PRODUCT_INQUIRY',
  FAQ = 'FAQ',
  APPOINTMENT_SCHEDULING = 'APPOINTMENT_SCHEDULING',
  APPOINTMENT_STATUS = 'APPOINTMENT_STATUS',
  UNKNOWN = 'UNKNOWN'
}

export interface ClassifiedMessage {
  intent: MessageIntent;
  confidence: number;
  originalMessage: string;
  phoneNumber: string;
  timestamp: Date;
  analysis?: {
    sentiment: string;
    urgency: string;
    additionalContext?: string;
  };
}

@injectable()
export class MessageClassifier {
  private cacheKey = 'msg_classifier:';
  
  constructor(
    @inject('AIService') private aiService: AIServices,
    @inject('Redis') private redis: any
  ) {}

  public async classifyMessage(ctx: BotContext): Promise<ClassifiedMessage> {
    const message = ctx.body;
    const phoneNumber = ctx.from;
    const cacheKey = `${this.cacheKey}${message}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Classify message using AI
      const classification = await this.aiService.classifyMessage(message);
      
      const result: ClassifiedMessage = {
        intent: classification.intent || MessageIntent.UNKNOWN,
        confidence: classification.confidence || 0,
        originalMessage: message,
        phoneNumber,
        timestamp: new Date(),
        analysis: {
          sentiment: classification.sentiment || 'neutral',
          urgency: classification.urgency || 'normal',
          additionalContext: classification.additionalContext
        }
      };

      // Cache the result
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // Cache for 1 hour

      return result;
    } catch (error) {
      console.error('Error classifying message:', error);
      return {
        intent: MessageIntent.UNKNOWN,
        confidence: 0,
        originalMessage: message,
        phoneNumber,
        timestamp: new Date()
      };
    }
  }
}

// Register dependencies
container.register('Redis', { useValue: redis });
container.registerSingleton('MessageClassifier', MessageClassifier);

// Export singleton instance
export default container.resolve(MessageClassifier);
