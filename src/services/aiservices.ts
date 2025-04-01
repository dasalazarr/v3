import { config } from "../config";
import * as fs from 'fs';
import * as path from 'path';
import { singleton, inject } from 'tsyringe';
import { SheetsService } from './sheetsServices';

@singleton()
export class AIService {
  private systemPrompt: string;
  private baseURL: string;
  private apiKey: string;

  // Almacenamiento de contexto de conversación por usuario
  private conversationContexts: Map<string, Array<{role: string, content: string}>> = new Map();

  constructor(
    @inject("SheetsService") private sheetsService: SheetsService
  ) {
    this.baseURL = config.baseURL || "https://api.deepseek.com/v1";
    this.apiKey = config.apiKey;

    // Load system prompt
    try {
      const promptPath = path.join(process.cwd(), 'assets', 'prompts', 'prompt_DeepSeek.txt');
      this.systemPrompt = fs.readFileSync(promptPath, 'utf8');
      console.log("✅ Sistema prompt cargado correctamente");
    } catch (error) {
      console.error("❌ Error al cargar el prompt:", error);
      this.systemPrompt = "Eres un asistente amable y profesional de Ecotec.";
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
    
    // Agregar los nuevos mensajes
    context.push({ role: 'user', content: userMessage });
    context.push({ role: 'assistant', content: botResponse });
    
    // Mantener solo los últimos 5 pares de mensajes (10 mensajes en total)
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
      // Si ya tenemos contexto para este usuario, no necesitamos cargarlo de nuevo
      if (this.conversationContexts.has(phoneNumber)) {
        return;
      }

      // Obtener las últimas 5 conversaciones del usuario desde Sheets
      const conversations = await this.sheetsService.getLastUserConversations(phoneNumber, 5);
      
      // Convertir las conversaciones al formato de contexto
      const context: Array<{role: string, content: string}> = [];
      for (const conv of conversations) {
        if (conv.userMessage) context.push({ role: 'user', content: conv.userMessage });
        if (conv.botResponse) context.push({ role: 'assistant', content: conv.botResponse });
      }
      
      // Guardar el contexto
      this.conversationContexts.set(phoneNumber, context);
    } catch (error) {
      console.error('Error al cargar el historial de conversaciones:', error);
      // Si hay un error, inicializamos con un contexto vacío
      this.conversationContexts.set(phoneNumber, []);
    }
  }

  async chat(prompt: string, messages: any[]): Promise<string> {
    try {
      console.log("Making API request to DeepSeek with model:", config.Model);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: config.Model || "deepseek-chat",
          messages: [
            {
              role: "system",
              content: this.systemPrompt
            },
            ...messages,
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error: any) {
      console.error("Error in DeepSeek chat completion:", error);

      // Manejo específico de errores
      if (error.message?.includes('401')) {
        return "Error de autenticación con DeepSeek. Por favor, verifica tu API key.";
      } else if (error.message?.includes('429')) {
        return "Se ha excedido el límite de solicitudes a DeepSeek. Por favor, intenta más tarde.";
      } else if (error.message?.includes('500')) {
        return "Error en el servidor de DeepSeek. Por favor, intenta más tarde.";
      }

      return "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.";
    }
  }

  async processMessage(message: string, phoneNumber: string): Promise<string> {
    try {
      // Cargar el historial de conversaciones
      await this.loadConversationHistory(phoneNumber);
      
      // Obtener el contexto actual
      const context = this.getUserContext(phoneNumber);
      
      // Procesar con DeepSeek
      const messages = [
        ...context,
        { role: "user", content: message }
      ];

      // Enviar a DeepSeek
      const aiResponse = await this.chat(message, messages);
      
      // Actualizar el contexto de la conversación
      this.updateUserContext(phoneNumber, message, aiResponse);
      
      // Guardar la conversación en Sheets
      await this.sheetsService.addConverToUser(phoneNumber, [
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]);

      return aiResponse;
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      return "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.";
    }
  }
}

// Exportamos la clase, no una instancia
export default AIService;