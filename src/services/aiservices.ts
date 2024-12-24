import OpenAI from "openai";
import { config } from "~/config";

class aiServices {
  private openAI: OpenAI;

  constructor(apiKey: string) {
    this.openAI = new OpenAI({ apiKey });
  }

  async chat(prompt: string, messages: any[]): Promise<string> {
    try {
      const completion = await this.openAI.chat.completions.create({
        model: config.Model,
        messages: [
          { role: "system", content: prompt },
          ...messages,
        ],
      });

      return completion.choices[0]?.message?.content || "No response";
    } catch (err) {
      console.error("Error al conectar con OpenAI:", err);
      return "ERROR";
    }
  }

  async chatWithAssistant(message: string, threadId?: string): Promise<{ response: string; threadId: string }> {
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
      return { response: "ERROR", threadId: threadId || "" };
    }
  
  }
}

export default aiServices;