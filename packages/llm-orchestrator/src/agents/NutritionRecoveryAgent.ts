
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent";

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
    // In a real implementation, this would query the vector memory
    // and then call the LLM with the prompt.
    console.log(`Running ${this.name} for user ${context.userId}`);
    // const relevantInfo = await this.tools.vectorMemory.search(context.userMessage, { namespace: 'nutrition' });
    return "Remember to have a snack with a 4:1 carb-to-protein ratio within 45 minutes of finishing your run to maximize recovery.";
  }
}
