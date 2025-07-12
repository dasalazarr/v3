
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent";

export class PerformanceAnalystAgent extends BaseAgent {
  name = "Coach-Analyst";
  role = "Performance Analyst";
  personality = "Analytical, insightful, and focused on continuous improvement.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Analyze the user's completed workout data. Compare it with the planned workout. Identify trends and provide actionable feedback for improvement.`;
  }

  async run(context: AgentContext): Promise<string> {
    // In a real implementation, this would fetch data from the database
    // and then call the LLM with the prompt.
    console.log(`Running ${this.name} for user ${context.userId}`);
    // const workoutData = await this.tools.database.getWorkoutHistory(context.userId);
    return "Based on your last workout, your pace was 10 seconds faster than planned. This is a great sign of progress. Keep it up!";
  }
}
