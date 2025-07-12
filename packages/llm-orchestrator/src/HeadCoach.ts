
import {
  TrainingPlannerAgent,
  PerformanceAnalystAgent,
  NutritionRecoveryAgent,
  MotivationAgent,
  ConversationAgent,
} from "./agents";
import { AgentTool, AgentContext } from "./agents/BaseAgent";

class HeadCoach {
  private agents: {
    planner: TrainingPlannerAgent;
    analyst: PerformanceAnalystAgent;
    nutrition: NutritionRecoveryAgent;
    motivator: MotivationAgent;
    conversation: ConversationAgent;
  };

  constructor(tools: AgentTool) {
    this.agents = {
      planner: new TrainingPlannerAgent(tools),
      analyst: new PerformanceAnalystAgent(tools),
      nutrition: new NutritionRecoveryAgent(tools),
      motivator: new MotivationAgent(tools),
      conversation: new ConversationAgent(tools),
    };
  }

  async handleMessage(context: AgentContext): Promise<string> {
    // 1. Simple routing logic (to be improved with an LLM call)
    const userMessage = context.userMessage.toLowerCase();
    const agentOutputs: string[] = [];

    if (userMessage.includes("plan") || userMessage.includes("schedule")) {
      agentOutputs.push(await this.agents.planner.run(context));
    } else if (userMessage.includes("completed") || userMessage.includes("finished")) {
      agentOutputs.push(await this.agents.analyst.run(context));
      agentOutputs.push(await this.agents.nutrition.run(context));
      agentOutputs.push(await this.agents.motivator.run(context));
    } else {
      // Default to a motivational message for now
      agentOutputs.push(await this.agents.motivator.run(context));
    }

    // 2. Synthesize the response
    const finalResponse = await this.agents.conversation.run({
      ...context,
      agentOutputs,
    });

    return finalResponse;
  }
}

export { HeadCoach };
