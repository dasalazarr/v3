
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";

export class NutritionRecoveryAgent extends BaseAgent {
  name = "Coach-Nutritionist";
  role = "Nutrition and Recovery Expert";
  personality = "Knowledgeable, practical, and supportive.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Provide advice on pre-run meals, post-run recovery nutrition, and hydration strategies. Use the vector-memory to access curated knowledge.`;
  }

  async run(context: AgentContext): Promise<string> {
    console.log(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      // Search vector memory for relevant nutrition/recovery info
      console.log(`[${this.name}] Searching vector memory for: "${context.userMessage}"`);
      const relevantInfo = await this.tools.vectorMemory.retrieveContext(context.userId, context.userMessage, 3);
      const infoText = relevantInfo.relevantMemories.map((item: { content: string }) => item.content).join("\n");
      console.log(`[${this.name}] Relevant info from vector memory: ${infoText.substring(0, 100)}...`);

      const prompt = `
        System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
        
        User's message: ${context.userMessage}
        Relevant knowledge from vector memory:
        ${infoText || "(No specific information found for this query)"}

        Provide concise advice on pre-run meals, post-run recovery nutrition, and hydration strategies based on the user's message and the provided knowledge.
      `;
      console.log(`[${this.name}] Sending prompt to LLM.`);
      const llmResponse = await this.tools.llmClient.generateResponse(prompt);
      console.log(`[${this.name}] Received LLM response.`);
      return llmResponse;
    } catch (error) {
      console.error(`[${this.name}] Error processing request for user ${context.userId}:`, error);
      return "Lo siento, no pude proporcionarte consejos de nutrición o recuperación en este momento. Por favor, inténtalo de nuevo más tarde.";
    }
  }
}
