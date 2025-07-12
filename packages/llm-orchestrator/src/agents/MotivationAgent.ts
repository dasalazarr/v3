
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";

export class MotivationAgent extends BaseAgent {
  name = "Coach-Motivator";
  role = "Motivation and Sports Psychology Expert";
  personality = "Empathetic, encouraging, and uplifting.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Provide concise encouragement, mental strategies, or motivational support based on the user's current message and conversation history. Focus on uplifting the user and reinforcing positive habits.`;
  }

  async run(context: AgentContext): Promise<string> {
    console.log(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      const prompt = this.getPrompt(context);
      console.log(`[${this.name}] Sending prompt to LLM.`);
      const llmResponse = await this.tools.llmClient.generateResponse(prompt, undefined, "none") as string;
      console.log(`[${this.name}] Received LLM response.`);
      return llmResponse;
    } catch (error) {
      console.error(`[${this.name}] Error processing request for user ${context.userId}:`, error);
      return "Siempre estoy aquí para apoyarte. ¡Sigue adelante!";
    }
  }
}
