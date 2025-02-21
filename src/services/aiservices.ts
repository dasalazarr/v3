import OpenAI from "openai";
import { config } from "~/config";
import { RagService } from './ragService';
import { injectable, inject, container } from 'tsyringe';
import { MessageIntent } from "./messageClassifier";

interface FormattedResponse {
  resumenEjecutivo: string;
  datosClave?: string[];
  recomendacionPrincipal?: string;
  proximosPasos?: string[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MessageClassification {
  intent: MessageIntent;
  confidence: number;
  sentiment: string;
  urgency: string;
  additionalContext?: string;
}

interface ConfigType {
  apiKey: string;
}

@injectable()
export class AIServices {
  private openAI: OpenAI;
  
  constructor(
    @inject('Config') private readonly config: ConfigType,
    @inject('RagService') private readonly ragService: RagService
  ) {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY or apiKey in your environment variables.");
    }
    this.openAI = new OpenAI({ apiKey: this.config.apiKey });
  }

  private cleanFormatting(text: string): string {
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/###/g, '')
      .replace(/\n\s*#/g, '\n')
      .trim();
  }

  private formatResponse(content: string): FormattedResponse {
    const cleanContent = this.cleanFormatting(content);
    try {
      const parsed = JSON.parse(cleanContent);
      if (parsed.resumenEjecutivo) return parsed;
    } catch {
      return {
        resumenEjecutivo: cleanContent,
        datosClave: [],
        recomendacionPrincipal: "",
        proximosPasos: []
      };
    }
  }

  async chat(systemPrompt: string, messages: ChatMessage[]): Promise<FormattedResponse> {
    try {
      const completion = await this.openAI.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return this.formatResponse(completion.choices[0]?.message?.content || "");
    } catch (error) {
      console.error("Error in chat completion:", error);
      throw error;
    }
  }

  async classifyMessage(message: string): Promise<MessageClassification> {
    const systemPrompt = `Analiza el siguiente mensaje de WhatsApp y clasifícalo según estas categorías:
      - PRODUCT_INQUIRY: Consultas sobre productos, precios o catálogo
      - FAQ: Preguntas frecuentes o solicitudes de información general
      - APPOINTMENT_SCHEDULING: Solicitudes para agendar o programar citas
      - APPOINTMENT_STATUS: Consultas sobre el estado de citas existentes
      - UNKNOWN: Si no corresponde a ninguna categoría anterior

      Responde en formato JSON con los siguientes campos:
      {
        "intent": "CATEGORIA",
        "confidence": 0.0-1.0,
        "sentiment": "positivo|neutral|negativo",
        "urgency": "alta|media|baja",
        "additionalContext": "contexto adicional relevante"
      }`;

    try {
      const result = await this.chat(systemPrompt, [
        { role: 'user', content: message }
      ]);

      const classification = JSON.parse(result.resumenEjecutivo);
      return {
        intent: classification.intent as MessageIntent,
        confidence: classification.confidence,
        sentiment: classification.sentiment,
        urgency: classification.urgency,
        additionalContext: classification.additionalContext
      };
    } catch (error) {
      console.error('Error clasificando mensaje:', error);
      return {
        intent: MessageIntent.UNKNOWN,
        confidence: 0,
        sentiment: 'neutral',
        urgency: 'media',
        additionalContext: 'Error en la clasificación'
      };
    }
  }

  async searchSimilarQuestions(question: string): Promise<string[]> {
    return this.ragService.searchSimilarQuestions(question);
  }
}

// Register dependencies
container.register<ConfigType>('Config', { useValue: { apiKey: config.apiKey } });

// Export singleton instance
export default container.resolve(AIServices);