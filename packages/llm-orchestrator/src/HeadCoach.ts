
import {
  TrainingPlannerAgent,
  PerformanceAnalystAgent,
  NutritionRecoveryAgent,
  MotivationAgent,
  ConversationAgent,
  OnboardingAgent,
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
    onboarding: OnboardingAgent;
  };

  constructor(tools: AgentTool) {
    this.tools = tools;
    this.agents = {
      planner: new TrainingPlannerAgent(tools),
      analyst: new PerformanceAnalystAgent(tools),
      nutrition: new NutritionRecoveryAgent(tools),
      motivator: new MotivationAgent(tools),
      conversation: new ConversationAgent(tools),
      onboarding: new OnboardingAgent(tools),
    };
  }

  async handleMessage(context: AgentContext): Promise<string> {
    let agentOutputs: string[] = [];
    let selectedAgentNames: string[] = [];

    // 1. Retrieve conversation history and user profile
    const conversationHistory = await this.tools.chatBuffer.getConversationContext(context.userId);
    const [userProfile] = await this.tools.database.query.select().from(users).where(eq(users.id, context.userId)).limit(1);
    const updatedContext = { ...context, conversationHistory, userProfile };

    // 2. Prioritize OnboardingAgent if onboarding is not completed
    if (!updatedContext.userProfile?.onboardingCompleted) {
      console.log(`[HeadCoach] Onboarding not completed. Activating OnboardingAgent.`);
      agentOutputs.push(await this.agents.onboarding.run(updatedContext));
      // If OnboardingAgent returns a response, it means it's still in progress or completed
      if (agentOutputs[0] && agentOutputs[0] !== "") {
        // If onboarding is completed by this turn, trigger planner
        if (updatedContext.userProfile?.onboardingCompleted) {
          console.log(`[HeadCoach] Onboarding completed. Triggering TrainingPlannerAgent.`);
          agentOutputs.push(await this.agents.planner.run(updatedContext));
        }
        // If OnboardingAgent returned a message, it's the primary response
        const finalResponse = await this.agents.conversation.run({
          ...updatedContext,
          agentOutputs,
        });
        await this.tools.chatBuffer.addMessage(context.userId, "user", context.userMessage);
        await this.tools.chatBuffer.addMessage(context.userId, "assistant", finalResponse);
        console.log(`[HeadCoach] Final synthesized response (Onboarding): ${finalResponse}`);
        return finalResponse;
      }
    }

    // 2. HeadCoach decides which agents to activate using LLM (if onboarding is complete or not handled by OnboardingAgent)
    const agentDescriptions = [
      `OnboardingAgent: Role: ${this.agents.onboarding.role}. Personality: ${this.agents.onboarding.personality}. Task: Guides new users through initial setup and data collection. Keywords: start, hello, new user, register.`,
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
    console.log(`[HeadCoach] Agent selection response: ${selectedAgentsResponse}`);
    selectedAgentNames = selectedAgentsResponse.split(",").map(name => name.trim());

    agentOutputs = [];

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
        case "OnboardingAgent":
          agentOutputs.push(await this.agents.onboarding.run(updatedContext));
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

    console.log(`[HeadCoach] Final synthesized response: ${finalResponse}`);
    return finalResponse;
  }
}

export { HeadCoach };
