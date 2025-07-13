
import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";
import { users, runs } from "@running-coach/database";
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
    this.tools.logger.info(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      // Fetch user data and workout history
      this.tools.logger.info(`[${this.name}] Fetching user data for ${context.userId}`);
      const [user] = await this.tools.database.query.select().from(users).where(eq(users.id, context.userId)).limit(1);
      this.tools.logger.info(`[${this.name}] User data fetched: ${JSON.stringify(user)}`);
      
      this.tools.logger.info(`[${this.name}] Fetching recent runs for user ${context.userId}`);
      const recentRuns = await this.tools.database.query.select().from(runs).where(eq(runs.userId, context.userId)).orderBy(runs.date).limit(5);
      this.tools.logger.info(`[${this.name}] Recent runs fetched: ${JSON.stringify(recentRuns)}`);

      const prompt = `
        System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
        
        User's message: ${context.userMessage}
        User's profile (partial): ${JSON.stringify(user)}
        Recent workout data (last 5 runs): ${JSON.stringify(recentRuns)}

        Analyze the provided workout data and user message. Compare it with any implied plan or previous performance. Identify trends (positive or negative) and provide actionable feedback for improvement. Be concise and insightful.
      `;
      this.tools.logger.info(`[${this.name}] Sending prompt to LLM.`);
      const llmResponse = await this.tools.llmClient.generateResponse(prompt, undefined, "none") as string;
      this.tools.logger.info(`[${this.name}] Received LLM response.`);
      return llmResponse;
    } catch (error) {
      this.tools.logger.error(`[${this.name}] Error processing request for user ${context.userId}:`, error);
      return "Lo siento, no pude analizar tu rendimiento en este momento. Por favor, inténtalo de nuevo más tarde.";
    }
  }
}
