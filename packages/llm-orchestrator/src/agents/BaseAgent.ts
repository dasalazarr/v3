import { VectorMemory } from "@running-coach/vector-memory";
import { PlanBuilder } from "@running-coach/plan-generator";

export interface AgentTool {
  vectorMemory: VectorMemory;
    planBuilder: PlanBuilder;
  // Future tools can be added here
}

export interface AgentContext {
  userId: string;
  conversationHistory: string[];
  userMessage: string;
  agentOutputs?: string[]; // Optional field for synthesized responses
}

export abstract class BaseAgent {
  abstract name: string;
  abstract role: string;
  abstract personality: string;

  protected tools: AgentTool;

  constructor(tools: AgentTool) {
    this.tools = tools;
  }

  abstract run(context: AgentContext): Promise<string>;

  protected getPrompt(context: AgentContext): string {
    return `
      System: You are ${this.name}, a ${this.role}.
      Your personality is: ${this.personality}.
      Conversation History:
      ${context.conversationHistory.join("\n")}
      User Message: ${context.userMessage}
      Your Task: ${this.getTask(context)}
    `;
  }

  protected abstract getTask(context: AgentContext): string;
}
