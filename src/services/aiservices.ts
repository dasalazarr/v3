import OpenAI from "openai";
import { config } from "~/config";
import RagService from './ragService';

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

class aiServices {
  private openAI: OpenAI;
  private ragService: RagService;

  constructor(apiKey: string) {
    this.openAI = new OpenAI({ apiKey });
    this.ragService = new RagService();
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

  async chat(prompt: string, messages: ChatMessage[], useRag: boolean = false): Promise<FormattedResponse> {
    try {
      let context: string[] = [];
      let systemPrompt = prompt;

      if (useRag) {
        try {
          context = await this.ragService.queryDocuments(prompt);
          if (context.length > 0) {
            const ragPrompt = await this.ragService.generateResponse(prompt, context);
            systemPrompt = ragPrompt;
          }
        } catch (ragError) {
          console.error('Error en RAG, continuando sin contexto:', ragError);
        }
      }

      const completion = await this.openAI.chat.completions.create({
        model: config.Model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: useRag ? 0.3 : 0.7, // Menor temperatura para respuestas basadas en RAG
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.formatResponse(content);
    } catch (err) {
      console.error("Error en chat:", err);
      return this.formatResponse(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  async chatWithAssistant(message: string, threadId?: string): Promise<{ response: string; threadId: string }> {
    if (!config.assistant_id) {
      throw new Error("assistant_id no está configurado en las variables de entorno");
    }

    try {
      const thread = threadId 
        ? { id: threadId }
        : await this.openAI.beta.threads.create();

      await this.openAI.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message
      });

      const run = await this.openAI.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: config.assistant_id
      });

      if (run.status !== 'completed') {
        throw new Error(`Run failed with status: ${run.status}`);
      }

      const messages = await this.openAI.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (lastMessage?.content?.[0]?.type !== 'text') {
        throw new Error('No valid response from assistant');
      }

      return { 
        response: lastMessage.content[0].text.value,
        threadId: thread.id 
      };
    } catch (error) {
      console.error('Error in chatWithAssistant:', error);
      throw error;
    }
  }
}

export default aiServices;