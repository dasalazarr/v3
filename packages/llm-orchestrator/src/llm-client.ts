

import OpenAI from "openai";

export class LLMClient {
  private openai: OpenAI;
  private model: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    });
    this.model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      return completion.choices[0].message?.content || "";
    } catch (error) {
      console.error("Error generating LLM response:", error);
      return "Lo siento, tuve un problema al procesar tu solicitud. Por favor, inténtalo de nuevo.";
    }
  }
}
