

import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";

export class ConversationAgent extends BaseAgent {
  name = "Coach-Interface";
  role = "Conversational Interface";
  personality = "Clear, friendly, and natural.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Synthesize the inputs from other agents into a single, coherent, and natural-sounding message to the user.`;
  }

  async run(context: AgentContext): Promise<string> {
    // In a real implementation, this would call the LLM with the prompt
    // and the collected outputs from other agents.
    console.log(`Running ${this.name} for user ${context.userId}`);
    const finalResponse = context.agentOutputs?.join("\n") || "";
    return finalResponse;
  }
}

