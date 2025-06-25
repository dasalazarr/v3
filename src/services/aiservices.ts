import { config } from "../config";
import * as fs from 'fs';
import * as path from 'path';
import { singleton, inject } from 'tsyringe';
import { SheetsService } from './sheetsServices';

export interface StructuredFeedback {
  reaction: string;
  analysis: string;
  tips: string;
  question: string;
}

export interface TrainingData {
  distance: { value: number | null; unit: string | null };
  time: { value: number | null; unit: string | null };
  pace: { value: string | null; unit: string | null };
  perception: string | null;
  notes: string | null;
}

@singleton()
export class AIService {
  private systemPrompt: string;
  private extractionPrompt: string;
  private baseURL: string;
  private apiKey: string;

  private conversationContexts: Map<string, Array<{role: string, content: string}>> = new Map();

  constructor(
    @inject("SheetsService") private sheetsService: SheetsService
  ) {
    this.baseURL = config.baseURL || "https://api.deepseek.com/v1";
    this.apiKey = config.apiKey;

    try {
      const promptPath = path.join(process.cwd(), 'assets', 'prompts', 'prompt_DeepSeek.txt');
      this.systemPrompt = fs.readFileSync(promptPath, 'utf8');
      console.log("✅ Sistema prompt cargado correctamente");
    } catch (error) {
      console.error("❌ Error al cargar el prompt:", error);
      this.systemPrompt = "Eres un asistente amable y profesional.";
    }

    try {
      const extractionPromptPath = path.join(process.cwd(), 'assets', 'prompts', 'prompt_Extraction_DeepSeek.txt');
      this.extractionPrompt = fs.readFileSync(extractionPromptPath, 'utf8');
      console.log("✅ Prompt de extracción cargado correctamente");
    } catch (error) {
      console.error("❌ Error al cargar el prompt de extracción:", error);
      this.extractionPrompt = ""; // Should not happen, will cause errors
    }
  }

  private getUserContext(phoneNumber: string): Array<{role: string, content: string}> {
    if (!this.conversationContexts.has(phoneNumber)) {
      this.conversationContexts.set(phoneNumber, []);
    }
    return this.conversationContexts.get(phoneNumber) || [];
  }

  private updateUserContext(phoneNumber: string, userMessage: string, botResponse: string): void {
    const context = this.getUserContext(phoneNumber);
    context.push({ role: 'user', content: userMessage });
    context.push({ role: 'assistant', content: botResponse });
    
    const maxContextLength = 10;
    if (context.length > maxContextLength) {
      const newContext = context.slice(context.length - maxContextLength);
      this.conversationContexts.set(phoneNumber, newContext);
    } else {
      this.conversationContexts.set(phoneNumber, context);
    }
  }

  async loadConversationHistory(phoneNumber: string): Promise<void> {
    try {
      if (this.conversationContexts.has(phoneNumber) && this.conversationContexts.get(phoneNumber)!.length > 0) {
        return;
      }
      const conversations = await this.sheetsService.getLastUserConversations(phoneNumber, 5);
      const context: Array<{role: string, content: string}> = [];
      for (const conv of conversations) {
        if (conv.userMessage) context.push({ role: 'user', content: conv.userMessage });
        if (conv.botResponse) context.push({ role: 'assistant', content: conv.botResponse });
      }
      this.conversationContexts.set(phoneNumber, context);
    } catch (error) {
      console.error('Error al cargar el historial de conversaciones:', error);
      this.conversationContexts.set(phoneNumber, []);
    }
  }

  private async _executeChatCompletion(messages: any[], temperature: number = 0.7, max_tokens: number = 1000, jsonResponse: boolean = false): Promise<string> {
    try {
      console.log(`[AIService] Making API request to DeepSeek (JSON mode: ${jsonResponse})`);

      const body: any = {
        model: config.Model || "deepseek-chat",
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens,
      };

      if (jsonResponse) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error("Respuesta inválida de la API de DeepSeek: no 'choices'");
      }
      return data.choices[0].message.content;

    } catch (error: any) {
      console.error("❌ Error in DeepSeek chat completion:", error);
      throw error; // Re-throw to be handled by the calling public method
    }
  }

  public async processMessage(message: string, phoneNumber: string, userName: string): Promise<StructuredFeedback | null> {
    if (!this.systemPrompt) {
      console.error('❌ [AIService] El prompt principal no está cargado.');
      return null;
    }

    console.log(`[AIService] Procesando mensaje para ${phoneNumber} (${userName}).`);
    const conversationHistory = await this.loadConversationHistory(phoneNumber);
    
    // Usa un nombre genérico si no se proporciona uno, para evitar errores.
    const personalizedPrompt = this.systemPrompt.replace('{userName}', userName || 'atleta');

    const messages: any[] = [
      { role: 'system', content: personalizedPrompt },
      ...this.getUserContext(phoneNumber),
      { role: 'user', content: message },
    ];

    try {
      console.log('[AIService] Solicitando feedback estructurado a la IA...');
      // Forzar modo JSON en la respuesta
      const response = await this._executeChatCompletion(messages, 0.7, 1000, true);

      if (response) {
        console.log('[AIService] Respuesta de IA recibida, intentando parsear JSON...');
        // Limpiar el string de la respuesta por si viene con formato markdown
        const cleanedResponse = response.replace(/```json\n|```/g, '').trim();
        const structuredResponse: StructuredFeedback = JSON.parse(cleanedResponse);
        console.log('✅ [AIService] JSON parseado exitosamente.');
        
        // Guardar el contexto de la conversación
        this.updateUserContext(phoneNumber, message, JSON.stringify(structuredResponse, null, 2));

        await this.sheetsService.addConverToUser(phoneNumber, [
          { role: 'user', content: message },
          { role: 'assistant', content: JSON.stringify(structuredResponse, null, 2) }
        ]);
        
        return structuredResponse;
      }
      return null;
    } catch (error) {
      console.error('❌ [AIService] Error al procesar el mensaje o parsear la respuesta JSON:', error);
      return null;
    }
  }

  public async getGeneralResponse(message: string, phoneNumber: string): Promise<string | null> {
    const faqSystemPrompt = 'Eres Andes, un amigable y experto coach de running. Responde las preguntas de los usuarios de forma clara, directa y motivadora. Sé breve.';
    console.log(`[AIService] Procesando pregunta general para ${phoneNumber}.`);
    
    await this.loadConversationHistory(phoneNumber);
    const context = this.getUserContext(phoneNumber);

    const messages: any[] = [
        { role: 'system', content: faqSystemPrompt },
        ...context,
        { role: 'user', content: message },
    ];

    try {
        const response = await this._executeChatCompletion(messages, 0.7, 1000, false);
        if (response) {
            this.updateUserContext(phoneNumber, message, response);
            await this.sheetsService.addConverToUser(phoneNumber, [
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            ]);
            return response;
        }
        return 'No se recibió respuesta de la IA.';
    } catch (error) {
        console.error('❌ [AIService] Error al procesar la pregunta general:', error);
        return 'Hubo un error al contactar a la IA.';
    }
  }

  public async extractTrainingData(userMessage: string): Promise<TrainingData | null> {
    if (!this.extractionPrompt) {
      console.error("❌ El prompt de extracción no está cargado. No se puede extraer data.");
      return null;
    }

    const messages = [
        { role: "system", content: this.extractionPrompt },
        { role: "user", content: userMessage }
    ];

    try {
        const jsonString = await this._executeChatCompletion(messages, 0.1, 500, true);
        const cleanedJsonString = jsonString.replace(/```json\n|```/g, '').trim();
        const parsedData: TrainingData = JSON.parse(cleanedJsonString);
        console.log(`[AIService] Datos extraídos:`, parsedData);
        return parsedData;
    } catch (error) {
        console.error("❌ Error al extraer o parsear los datos del entrenamiento:", error);
        return null;
    }
  }
}

// Exportamos la clase, no una instancia
export default AIService;