
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
    this.tools.logger.info(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      const tools = [
        {
          type: "function",
          function: {
            name: "generatePlan",
            description: "Generates a personalized running training plan based on user's goals and profile.",
            parameters: {
              type: "object",
              properties: {
                targetRace: {
                  type: "string",
                  enum: ["5k", "10k", "half_marathon", "marathon"],
                  description: "The user's target race distance (e.g., '5k', 'marathon').",
                },
                weeklyFrequency: {
                  type: "number",
                  description: "Number of runs per week (e.g., 3, 5).",
                },
                experienceLevel: {
                  type: "string",
                  enum: ["beginner", "intermediate", "advanced"],
                  description: "User's running experience level.",
                },
                currentVDOT: {
                  type: "number",
                  description: "User's current VDOT score, if known. Defaults to 40 if not provided.",
                },
              },
              required: ["targetRace", "weeklyFrequency", "experienceLevel"],
            },
          },
        },
      ];

      const prompt = `
        System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
        ${context.channel ? `You are responding via the ${context.channel} channel.` : ''}
        
        The user wants a training plan. Extract the necessary parameters from the user's message and call the 'generatePlan' tool. If any required information is missing, ask the user for it.
        User's message: ${context.userMessage}
        User's profile: ${JSON.stringify(context.userProfile)}
        Conversation History: ${context.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n")}
      `;

      this.tools.logger.info(`[${this.name}] Sending prompt to LLM.`);
      const llmResponse = await this.tools.llmClient.generateResponse(prompt, tools, "auto");
      this.tools.logger.info(`[${this.name}] Received LLM response.`);

      if (typeof llmResponse === 'string') {
        // LLM did not call a tool, it's a direct response (e.g., asking for more info)
        this.tools.logger.info(`[${this.name}] LLM did not call tool, direct response: ${llmResponse}`);
        return llmResponse;
      } else if (llmResponse.name === 'generatePlan') {
        this.tools.logger.info(`[${this.name}] LLM called generatePlan with arguments: ${JSON.stringify(llmResponse.arguments)}`);
        const args = JSON.parse(llmResponse.arguments);

        const request = {
          userId: context.userId,
          currentVDOT: args.currentVDOT || 40, // Use LLM extracted or default
          targetRace: args.targetRace as '5k' | '10k' | 'half_marathon' | 'marathon',
          weeklyFrequency: args.weeklyFrequency,
          experienceLevel: args.experienceLevel as 'beginner' | 'intermediate' | 'advanced',
        };

        this.tools.logger.info(`[${this.name}] Generating plan with request: ${JSON.stringify(request)}`);
        const trainingPlan = PlanBuilder.generatePlan(request);
        this.tools.logger.info(`[${this.name}] Plan generated: ${JSON.stringify(trainingPlan)}`);

        const explanationPrompt = `
          System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
          ${context.channel ? `You are responding via the ${context.channel} channel.` : ''}
          
          The user has requested a training plan. Here is the generated plan in JSON format:
          ${JSON.stringify(trainingPlan, null, 2)}

          Your task is to explain this training plan to the user. Focus on key aspects, what they should expect, and how it aligns with their goals. Use a friendly and encouraging tone. Do not include the JSON directly in your response.
          User's original message: ${context.userMessage}
        `;
        const explanationResponse = await this.tools.llmClient.generateResponse(explanationPrompt);
        return explanationResponse as string;
      }
      return "Lo siento, no pude generar un plan de entrenamiento. ¿Podrías darme más detalles?";
    } catch (error) {
      this.tools.logger.error(`[${this.name}] Error processing request for user ${context.userId}:`, error);
      return "Lo siento, no pude generar un plan de entrenamiento en este momento. Por favor, inténtalo de nuevo más tarde.";
    }
  }
}
