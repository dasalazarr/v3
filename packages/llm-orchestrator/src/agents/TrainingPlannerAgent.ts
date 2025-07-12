
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";
import { PlanBuilder } from "@running-coach/plan-generator";

export class TrainingPlannerAgent extends BaseAgent {
  name = "Coach-Planner";
  role = "Expert Running Planner";
  personality = "Methodical, encouraging, and data-driven.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Based on the user's goals, experience, and available days, create a detailed and personalized running plan. Use the plan-generator tool. Explain the purpose of each workout.`;
  }

  async run(context: AgentContext): Promise<string> {
    console.log(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      // In a real scenario, the LLM would interpret the user's request and
      // provide parameters for PlanBuilder.generatePlan().
      // For now, we'll use some dummy values or try to extract very basic info.
      const request = {
        userId: context.userId,
        currentVDOT: 40, // Placeholder: should come from user profile or previous assessment
        targetRace: '5k' as '5k' | '10k' | 'half_marathon' | 'marathon', // Placeholder: should be extracted from user message
        weeklyFrequency: 3, // Placeholder: should be extracted from user message
        experienceLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced', // Placeholder: should be extracted from user profile
      };

      console.log(`[${this.name}] Generating plan with request: ${JSON.stringify(request)}`);
            const trainingPlan = PlanBuilder.generatePlan(request);
      console.log(`[${this.name}] Plan generated: ${JSON.stringify(trainingPlan)}`);

      const prompt = `
        System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
        
        The user has requested a training plan. Here is the generated plan in JSON format:
        ${JSON.stringify(trainingPlan, null, 2)}

        Your task is to explain this training plan to the user. Focus on key aspects, what they should expect, and how it aligns with their goals. Use a friendly and encouraging tone. Do not include the JSON directly in your response.
        User's original message: ${context.userMessage}
      `;
      console.log(`[${this.name}] Sending prompt to LLM.`);
      const llmResponse = await this.tools.llmClient.generateResponse(prompt);
      console.log(`[${this.name}] Received LLM response.`);
      return llmResponse;
    } catch (error) {
      console.error(`[${this.name}] Error processing request for user ${context.userId}:`, error);
      return "Lo siento, no pude generar un plan de entrenamiento en este momento. Por favor, inténtalo de nuevo más tarde.";
    }
  }
}
