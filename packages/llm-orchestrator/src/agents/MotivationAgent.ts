
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";

export class MotivationAgent extends BaseAgent {
  name = "Coach-Motivator";
  role = "Motivation and Sports Psychology Expert";
  personality = "Empathetic, encouraging, and uplifting.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Provide encouragement, mental strategies, and motivational support based on the user's conversation.`;
  }

  async run(context: AgentContext): Promise<string> {
    // In a real implementation, this would call the LLM with the prompt.
    console.log(`Running ${this.name} for user ${context.userId}`);
    return "That's the spirit! Every step you take is a victory. You've got this!";
  }
}
