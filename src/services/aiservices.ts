import OpenAI from "openai";
import { config } from "~/config";

interface FormattedResponse {
  resumenEjecutivo: string;
  datosClave?: string[];
  recomendacionPrincipal?: string;
  proximosPasos?: string[];
}

class aiServices {
  private openAI: OpenAI;

  constructor(apiKey: string) {
    this.openAI = new OpenAI({ apiKey });
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

  async chat(prompt: string, messages: any[]): Promise<FormattedResponse> {
    try {
      const completion = await this.openAI.chat.completions.create({
        model: config.Model,
        messages: [
          { role: "system", content: prompt },
          ...messages,
        ],
      });

      const content = completion.choices[0]?.message?.content || "No response";
      return this.formatResponse(content);
    } catch (err) {
      console.error("Error al conectar con OpenAI:", err);
      return this.formatResponse("ERROR");
    }
  }

  async chatWithAssistant(message: string, threadId?: string): Promise<{ response: string; threadId: string }> {
    try {
      if (!config.assistant_id) {
        throw new Error("assistant_id no está configurado en las variables de entorno");
      }

      console.log("Using assistant_id:", config.assistant_id);
      
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

      if (run.status === 'completed') {
        const messages = await this.openAI.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (lastMessage && lastMessage.content && lastMessage.content[0].type === 'text') {
          return { 
            response: lastMessage.content[0].text.value,
            threadId: thread.id 
          };
        }
      }

      return { response: "No se pudo obtener una respuesta", threadId: thread.id };
    } catch (err) {
      console.error("Error al conectar con OpenAI Assistant:", err);
      if (err instanceof Error) {
        console.error("Detalles del error:", err.message);
      }
      return { response: "ERROR", threadId: threadId || "" };
    }
  }
}

export default aiServices;