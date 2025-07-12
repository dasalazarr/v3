
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
    // In a real implementation, this would call the LLM with the prompt.
    // For now, we'll simulate the output.
    console.log(`Running ${this.name} for user ${context.userId}`);
                        const plan = PlanBuilder.generatePlan({
      userId: context.userId,
      currentVDOT: 40, // Dummy value
      targetRace: '5k', // Dummy value
      weeklyFrequency: 3, // Dummy value
      experienceLevel: 'beginner', // Dummy value
    });
    return `Here is your personalized training plan: ${JSON.stringify(plan, null, 2)}`;
  }
}
