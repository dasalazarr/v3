import OpenAI from "openai";
import { config } from "~/config";
import * as fs from 'fs';
import * as path from 'path';

class aiServices {
  private openAI: OpenAI;
  private systemPrompt: string;

  constructor(apiKey: string) {
    console.log("Initializing AI service with baseURL:", config.baseURL);
    console.log("Using model:", config.Model);
    
    this.openAI = new OpenAI({ 
      apiKey,
      baseURL: config.baseURL || "https://api.deepseek.com"
    });

    // Load system prompt
    try {
      const promptPath = path.join(process.cwd(), 'assets', 'prompts', 'prompt_DeepSeek.txt');
      this.systemPrompt = fs.readFileSync(promptPath, 'utf-8');
      console.log("✅ Sistema prompt cargado correctamente");
    } catch (error) {
      console.error("❌ Error al cargar el prompt:", error);
      this.systemPrompt = "Eres un asistente amable y profesional de Gabriani.";
    }
  }

  async chat(prompt: string, messages: any[]): Promise<string> {
    try {
      console.log("Making API request with model:", config.Model);
      
      const completion = await this.openAI.chat.completions.create({
        model: config.Model || "deepseek-chat",
        messages: [
          { role: "system", content: this.systemPrompt }, // Use loaded system prompt
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
      const response = await this.chat(this.systemPrompt, [
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