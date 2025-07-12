
import {
  TrainingPlannerAgent,
  PerformanceAnalystAgent,
  NutritionRecoveryAgent,
  MotivationAgent,
  ConversationAgent,
} from "./agents/index.js";
import { AgentTool, AgentContext } from "./agents/BaseAgent";
import { users } from "@running-coach/database";
import { eq } from "drizzle-orm";

class HeadCoach {
  private readonly tools: AgentTool;
  private agents: {
    planner: TrainingPlannerAgent;
    analyst: PerformanceAnalystAgent;
    nutrition: NutritionRecoveryAgent;
    motivator: MotivationAgent;
    conversation: ConversationAgent;
  };

  constructor(tools: AgentTool) {
    this.tools = tools;
    this.agents = {
      planner: new TrainingPlannerAgent(tools),
      analyst: new PerformanceAnalystAgent(tools),
      nutrition: new NutritionRecoveryAgent(tools),
      motivator: new MotivationAgent(tools),
      conversation: new ConversationAgent(tools),
    };
  }

  async handleMessage(context: AgentContext): Promise<string> {
    // 1. Retrieve conversation history and user profile
    const conversationHistory = await this.tools.chatBuffer.getConversationContext(context.userId);
    const [userProfile] = await this.tools.database.query.select().from(users).where(eq(users.id, context.userId)).limit(1);
    const updatedContext = { ...context, conversationHistory, userProfile };

    // 2. HeadCoach decides which agents to activate using LLM
    const agentDescriptions = [
      `TrainingPlannerAgent: Role: ${this.agents.planner.role}. Personality: ${this.agents.planner.personality}. Task: Creates, adjusts, and explains training plans. Keywords: plan, schedule, training, workout.`,
      `PerformanceAnalystAgent: Role: ${this.agents.analyst.role}. Personality: ${this.agents.analyst.personality}. Task: Reviews completed workout data, identifies trends, and provides feedback. Keywords: completed, finished, run, workout, performance.`,
      `NutritionRecoveryAgent: Role: ${this.agents.nutrition.role}. Personality: ${this.agents.nutrition.personality}. Task: Advises on pre/post-run nutrition, hydration, and recovery techniques. Keywords: food, eat, drink, recover, nutrition, stretch, sleep.`,
      `MotivationAgent: Role: ${this.agents.motivator.role}. Personality: ${this.agents.motivator.personality}. Task: Provides encouragement, mental strategies, and motivational support. Keywords: motivate, encouragement, mental, discipline, tired, hard.`,
    ];

    const selectionPrompt = `
      System: You are the Head Coach. Your role is to analyze the user's message and decide which specialized agents should process it.
      Here are the available agents and their descriptions:
      ${agentDescriptions.join("\n")}

      User's message: ${updatedContext.userMessage}
      User's profile: ${JSON.stringify(updatedContext.userProfile)}
      Conversation History: ${updatedContext.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n")}

      Based on the user's message, user profile, and conversation history, list the names of the agents that should be activated, separated by commas. If no specific agent is needed, activate only the MotivationAgent. Example: "TrainingPlannerAgent, MotivationAgent".
    `;

    const selectedAgentsResponse = await this.tools.llmClient.generateResponse(selectionPrompt, undefined, "none") as string;
    const selectedAgentNames = selectedAgentsResponse.split(",").map(name => name.trim());

    const agentOutputs: string[] = [];

    // Execute selected agents
    for (const agentName of selectedAgentNames) {
      switch (agentName) {
        case "TrainingPlannerAgent":
          agentOutputs.push(await this.agents.planner.run(updatedContext));
          break;
        case "PerformanceAnalystAgent":
          agentOutputs.push(await this.agents.analyst.run(updatedContext));
          break;
        case "NutritionRecoveryAgent":
          agentOutputs.push(await this.agents.nutrition.run(updatedContext));
          break;
        case "MotivationAgent":
          agentOutputs.push(await this.agents.motivator.run(updatedContext));
          break;
        default:
          console.warn(`Unknown agent selected by HeadCoach: ${agentName}`);
      }
    }

    // If no agents produced output, ensure at least a default response
    if (agentOutputs.length === 0) {
      agentOutputs.push(await this.agents.motivator.run(updatedContext));
    }

    // 3. Synthesize the response
    const finalResponse = await this.agents.conversation.run({
      ...updatedContext,
      agentOutputs,
    });

    // 4. Save conversation history
    await this.tools.chatBuffer.addMessage(context.userId, "user", context.userMessage);
    await this.tools.chatBuffer.addMessage(context.userId, "assistant", finalResponse);

    return finalResponse;
  }
}

export { HeadCoach };
