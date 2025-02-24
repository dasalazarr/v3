import OpenAI from "openai";
import { config } from "~/config";

class aiServices {
  private openAI: OpenAI;

  constructor(apiKey: string) {
    this.openAI = new OpenAI({ 
      apiKey,
      baseURL: config.baseURL || "https://api.deepseek.com/v1"  // Default DeepSeek URL
    });
  }

  async chat(prompt: string, messages: any[]): Promise<string> {
    try {
      const completion = await this.openAI.chat.completions.create({
        model: config.Model || "deepseek-chat",  // Use uppercase Model from config
        messages: [
          { role: "system", content: prompt },
          ...messages,
        ],
      });

      return completion.choices[0]?.message?.content || "No response";
    } catch (err) {
      console.error("Error al conectar con DeepSeek:", err);
      return "ERROR";
    }
  }

  async chatWithAssistant(message: string): Promise<{ response: string; threadId: string }> {
    try {
      const response = await this.chat("You are a helpful assistant.", [
        { role: "user", content: message }
      ]);

      return { 
        response,
        threadId: '' // DeepSeek no maneja threads como OpenAI
      };
    } catch (error) {
      console.error("Error en chatWithAssistant:", error);
      throw error;
    }
  }
}

export default aiServices;