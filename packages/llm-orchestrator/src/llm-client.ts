

import OpenAI from "openai";

import { Logger } from "pino";

export class LLMClient {
  private openai: OpenAI;
  private model: string;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    });
    this.model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }

  async generateResponse(prompt: string, tools?: any[], tool_choice?: "auto" | "none" | { type: "function"; function: { name: string; }; }): Promise<string | OpenAI.Chat.Completions.ChatCompletionMessage.FunctionCall> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "user", content: prompt }];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        tools,
        tool_choice,
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        // Assuming only one tool call for simplicity
        return responseMessage.tool_calls[0].function;
      } else {
        return responseMessage?.content || "";
      }
    } catch (error) {
      this.logger.error("Error generating LLM response:", error);
      return "Lo siento, tuve un problema al procesar tu solicitud. Por favor, inténtalo de nuevo.";
    }
  }
}
