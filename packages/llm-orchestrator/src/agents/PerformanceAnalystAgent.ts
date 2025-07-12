
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";
import { users } from "@running-coach/database";
import { eq } from "drizzle-orm";

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
    console.log(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      // Fetch user data and workout history
      console.log(`[${this.name}] Fetching user data for ${context.userId}`);
      const [user] = await this.tools.database.query.select().from(users).where(eq(users.id, context.userId)).limit(1);
      console.log(`[${this.name}] User data fetched: ${JSON.stringify(user)}`);
      
      // In a real scenario, you'd also fetch workout data related to the user
      const workoutData = "(Simulated workout data: 5km in 25 minutes, felt great)"; // Placeholder

      const prompt = `
        System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
        
        User's message: ${context.userMessage}
        User's profile (partial): ${JSON.stringify(user)}
        User's workout data: ${workoutData}

        Analyze the provided workout data and user message. Compare it with any implied plan or previous performance. Identify trends (positive or negative) and provide actionable feedback for improvement. Be concise and insightful.
      `;
      console.log(`[${this.name}] Sending prompt to LLM.`);
      const llmResponse = await this.tools.llmClient.generateResponse(prompt);
      console.log(`[${this.name}] Received LLM response.`);
      return llmResponse;
    } catch (error) {
      console.error(`[${this.name}] Error processing request for user ${context.userId}:`, error);
      return "Lo siento, no pude analizar tu rendimiento en este momento. Por favor, inténtalo de nuevo más tarde.";
    }
  }
}
