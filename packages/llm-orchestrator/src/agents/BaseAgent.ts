import { VectorMemory } from "@running-coach/vector-memory";
import { PlanBuilder } from "@running-coach/plan-generator";
import { LLMClient } from "../llm-client.js";
import { Database } from "@running-coach/database";
import { ChatBuffer } from "@running-coach/vector-memory"; // Assuming ChatBuffer is also in vector-memory
import { Logger } from "pino";

export interface AgentTool {
  vectorMemory: VectorMemory;
  planBuilder: PlanBuilder;
  llmClient: LLMClient;
  database: Database;
  chatBuffer: ChatBuffer;
  logger: Logger;
  i18nService: I18nService;
  // Future tools can be added here
}

export interface AgentContext {
  userId: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userMessage: string;
  userProfile?: any; // Added userProfile to context
  channel?: string; // Added channel to context
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
    const channelInfo = context.channel ? `You are responding via the ${context.channel} channel.` : '';
    return `
      System: You are ${this.name}, a ${this.role}.
      Your personality is: ${this.personality}.
      ${channelInfo}
      Conversation History:
      ${context.conversationHistory.join("\n")}
      User Message: ${context.userMessage}
      Your Task: ${this.getTask(context)}
    `;
  }

  protected abstract getTask(context: AgentContext): string;
}
