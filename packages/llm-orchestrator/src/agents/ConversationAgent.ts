

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
    console.log(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      const prompt = `
        System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
        ${context.channel ? `You are responding via the ${context.channel} channel. Keep your response concise, use appropriate formatting for mobile, and consider using emojis where natural and helpful.` : ''}
        
        Synthesize the following agent responses into a single, coherent, and natural-sounding message for the user. Ensure the tone is consistent with your personality. If there are no agent responses, acknowledge the user's message and offer further assistance.
        
        Agent Responses:
        ${context.agentOutputs?.join("\n") || "(No specific responses from other agents. Please acknowledge the user's message and offer further assistance.)"}

        User's original message: ${context.userMessage}
      `;
      console.log(`[${this.name}] Sending prompt to LLM.`);
      const llmResponse = await this.tools.llmClient.generateResponse(prompt);
      console.log(`[${this.name}] Received LLM response.`);
      return llmResponse;
    } catch (error) {
      console.error(`[${this.name}] Error processing request for user ${context.userId}:`, error);
      return "Lo siento, no pude procesar tu solicitud en este momento. Por favor, inténtalo de nuevo.";
    }
  }
}

