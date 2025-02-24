import OpenAI from "openai";
import { config } from "~/config";

class aiServices {
  private openAI: OpenAI;

  constructor(apiKey: string) {
    console.log("Initializing AI service with baseURL:", config.baseURL);
    console.log("Using model:", config.Model);
    
    this.openAI = new OpenAI({ 
      apiKey,
      baseURL: config.baseURL || "https://api.deepseek.com"
    });
  }

  async chat(prompt: string, messages: any[]): Promise<string> {
    try {
      console.log("Making API request with model:", config.Model);
      console.log("Using baseURL:", config.baseURL);
      
      const completion = await this.openAI.chat.completions.create({
        model: config.Model || "deepseek-chat",
        messages: [
          { role: "system", content: prompt },
          ...messages.map(msg => ({
            role: msg.role || "user",
            content: msg.content
          }))
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      if (!completion.choices?.[0]?.message?.content) {
        console.error("No response content in completion:", completion);
        return "Lo siento, hubo un error al procesar tu mensaje.";
      }

      return completion.choices[0].message.content;
    } catch (err: any) {
      console.error("Error al conectar con DeepSeek. Detalles:");
      console.error("Status:", err.status);
      console.error("Message:", err.message);
      if (err.response) {
        console.error("Response data:", err.response.data);
        console.error("Response headers:", err.response.headers);
      }
      return "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.";
    }
  }

  async chatWithAssistant(message: string): Promise<{ response: string; threadId: string }> {
    try {
      const response = await this.chat("You are a helpful assistant.", [
        { role: "user", content: message }
      ]);

      return { 
        response,
        threadId: ''
      };
    } catch (error) {
      console.error("Error en chatWithAssistant:", error);
      throw error;
    }
  }
}

export default aiServices;