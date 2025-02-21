import { EVENTS } from '@builderbot/bot';
import { injectable, inject } from 'tsyringe';
import aiServices from './aiservices';
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
    @inject('AIService') private aiService: aiServices,
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

      // Si no está en cache, clasificar
      const systemPrompt = `Analiza el siguiente mensaje de WhatsApp y clasifícalo según estas categorías:
        - PRODUCT_INQUIRY: Consultas sobre productos, precios o catálogo
        - FAQ: Preguntas frecuentes o solicitudes de información general
        - APPOINTMENT_SCHEDULING: Solicitudes para agendar o programar citas
        - APPOINTMENT_STATUS: Consultas sobre el estado de citas existentes
        - UNKNOWN: Si no corresponde a ninguna categoría anterior`;

      const result = await this.aiService.chat(systemPrompt, [
        { role: 'user', content: message }
      ]);

      // Extraer la información del resultado
      const aiResponse = JSON.parse(result.resumenEjecutivo);

      const classification: ClassifiedMessage = {
        intent: aiResponse.intent as MessageIntent,
        confidence: aiResponse.confidence,
        originalMessage: message,
        phoneNumber,
        timestamp: new Date(),
        analysis: aiResponse.analysis
      };

      // Cache result
      await this.redis.set(cacheKey, JSON.stringify(classification), 'EX', 3600);
      
      return classification;
    } catch (error) {
      console.error('Error clasificando mensaje:', error);
      return this.fallbackClassification(message, phoneNumber);
    }
  }

  private fallbackClassification(message: string, phoneNumber: string): ClassifiedMessage {
    const normalizedMessage = message.toLowerCase();
    const keywords = {
      [MessageIntent.PRODUCT_INQUIRY]: ['precio', 'producto', 'catálogo', 'costo', 'cuánto', 'vale'],
      [MessageIntent.FAQ]: ['cómo', 'qué', 'cuando', 'dónde', 'por qué', 'ayuda'],
      [MessageIntent.APPOINTMENT_SCHEDULING]: ['agendar', 'cita', 'reservar', 'programar'],
      [MessageIntent.APPOINTMENT_STATUS]: ['estado', 'verificar', 'confirmar', 'mi cita']
    };

    let bestMatch = MessageIntent.UNKNOWN;
    let highestScore = 0;

    for (const [intent, intentKeywords] of Object.entries(keywords)) {
      const matches = intentKeywords.filter(keyword => normalizedMessage.includes(keyword));
      const score = matches.length / intentKeywords.length;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = intent as MessageIntent;
      }
    }

    return {
      intent: highestScore > 0.3 ? bestMatch : MessageIntent.UNKNOWN,
      confidence: highestScore,
      originalMessage: message,
      phoneNumber,
      timestamp: new Date(),
      analysis: {
        sentiment: 'neutral',
        urgency: 'media'
      }
    };
  }
}

export const messageClassifier = new MessageClassifier();
