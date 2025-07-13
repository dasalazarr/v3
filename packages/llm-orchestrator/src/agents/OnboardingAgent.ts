

import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";
import { users } from "@running-coach/database";
import { eq } from "drizzle-orm";
import { I18nService } from "@running-coach/shared";

interface OnboardingQuestion {
  key: keyof typeof users.$inferInsert;
  prompt: string; // i18n key or direct string
  validation: {
    type: 'number' | 'text' | 'choice';
    options?: { [key: string]: string[] }; // For 'choice' type
    range?: { min: number; max: number }; // For 'number' type
    error: string; // i18n key or direct string
  };
  condition?: (userProfile: any) => boolean;
}

const onboardingQuestions: OnboardingQuestion[] = [
  {
    key: 'onboardingGoal',
    prompt: 'onboarding:onboarding_goal_prompt',
    validation: {
      type: 'choice',
      options: {
        'first_race': ['primera carrera', 'correr por primera vez'],
        'improve_time': ['mejorar tiempo', 'ser mas rapido'],
        'stay_fit': ['mantenerme en forma', 'salud', 'bienestar'],
      },
      error: 'onboarding:onboarding_goal_error',
    },
  },
  {
    key: 'goalRace',
    prompt: 'onboarding:goal_race_prompt',
    validation: {
      type: 'choice',
      options: {
        '5k': ['5k', '5k', 'cinco k'],
        '10k': ['10k', 'diez k'],
        'half_marathon': ['21k', 'media maraton', 'media', 'half'],
        'marathon': ['42k', 'maraton'],
        'ultra': ['ultra', 'ultramaraton'],
      },
      error: 'onboarding:goal_race_error',
    },
  },
  {
    key: 'experienceLevel',
    prompt: 'onboarding:experience_level_prompt',
    validation: {
      type: 'choice',
      options: {
        beginner: ['principiante', 'nunca he corrido'],
        intermediate: ['intermedio', 'corro ocasional'],
        advanced: ['avanzado', 'corro seguido'],
      },
      error: 'onboarding:experience_level_error',
    },
  },
  {
    key: 'weeklyFrequency',
    prompt: 'onboarding:weekly_frequency_prompt',
    validation: { type: 'number', range: { min: 1, max: 7 }, error: 'onboarding:weekly_frequency_error' },
  },
  {
    key: 'age',
    prompt: 'onboarding:age_prompt',
    validation: { type: 'number', range: { min: 16, max: 80 }, error: 'onboarding:age_error' },
    condition: (userProfile) => !userProfile.age,
  },
  {
    key: 'gender',
    prompt: 'onboarding:gender_prompt',
    validation: {
      type: 'choice',
      options: {
        male: ['masculino', 'hombre'],
        female: ['femenino', 'mujer'],
        other: ['otro', 'no binario'],
      },
      error: 'onboarding:gender_error',
    },
    condition: (userProfile) => !userProfile.gender,
  },
  {
    key: 'injuryHistory',
    prompt: 'onboarding:injury_history_prompt',
    validation: { type: 'text', error: 'onboarding:injury_history_error' },
    condition: (userProfile) => !userProfile.injuryHistory,
  },
];

export class OnboardingAgent extends BaseAgent {
  name = "Onboarding-Coach";
  role = "Onboarding Specialist";
  personality = "Friendly, clear, and guiding.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Guide the user through the onboarding process, collecting critical information like goal race, experience level, weekly frequency, injury history, age, and gender. Store each piece of information in the database as it's collected. If information is missing or invalid, ask for it again. Once all information is collected, mark onboarding as complete and provide a motivational micro-milestone.`;
  }

  async run(context: AgentContext): Promise<string> {
    console.log(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      let userProfile = context.userProfile;
      const lang = userProfile?.preferredLanguage || 'es';

      // If onboarding is already completed, this agent should not run
      if (userProfile?.onboardingCompleted) {
        console.log(`[${this.name}] Onboarding already completed for user ${context.userId}.`);
        return ""; // Return empty string, HeadCoach will handle next step
      }

      // If it's the very first message from the user, send a warm welcome
      if (context.conversationHistory.length === 0) {
        const welcomePrompt = `
          System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
          ${context.channel ? `You are responding via the ${context.channel} channel.` : ''}
          
          Your task is to provide a warm welcome message to the user and then ask the first onboarding question: "${this.tools.i18nService.t(onboardingQuestions[0].prompt, lang)}".
          Make sure to greet them by name if available in userProfile.phoneNumber, otherwise use a generic greeting.
          User's message: ${context.userMessage}
        `;
        const welcomeMessage = await this.tools.llmClient.generateResponse(welcomePrompt, undefined, "none") as string;
        // Store the current question key
        await this.tools.database.query.update(users).set({ currentOnboardingQuestion: onboardingQuestions[0].key }).where(eq(users.id, context.userId));
        return welcomeMessage;
      }

      // --- Process previous answer (if any) ---
      const currentQuestionKey = userProfile?.currentOnboardingQuestion;
      const lastQuestionAsked = currentQuestionKey ? onboardingQuestions.find(q => q.key === currentQuestionKey) : undefined;

      if (lastQuestionAsked) {
        const validationResult = this.validateAnswer(context.userMessage, lastQuestionAsked);

        if (validationResult.isValid) {
          await this.tools.database.query.update(users).set({
            [lastQuestionAsked.key]: validationResult.parsedValue,
            currentOnboardingQuestion: null // Clear the current question
          }).where(eq(users.id, context.userId));
          userProfile = { ...userProfile, [lastQuestionAsked.key]: validationResult.parsedValue, currentOnboardingQuestion: null }; // Update local profile
          console.log(`[${this.name}] Updated user ${context.userId} with ${String(lastQuestionAsked.key)}: ${validationResult.parsedValue}`);
        } else {
          // Invalid answer, re-ask the question with error
          const prompt = `
            System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
            ${context.channel ? `You are responding via the ${context.channel} channel.` : ''}
            
            The user's last response was invalid for the question: "${this.tools.i18nService.t(lastQuestionAsked.prompt, lang)}".
            The validation error is: "${this.tools.i18nService.t(lastQuestionAsked.validation.error, lang)}".
            
            Your task is to politely re-ask the question, explaining the error. Provide options if it's a choice question.
            User's message: ${context.userMessage}
            Conversation History: ${context.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n")}
          `;
          const llmResponse = await this.tools.llmClient.generateResponse(prompt, undefined, "none") as string;
          // Keep the current question key as it's still pending
          return llmResponse;
        }
      }

      // --- Find the next question to ask ---
      let nextQuestion: OnboardingQuestion | undefined;
      for (const q of onboardingQuestions) {
        // Check if the question's key is not set in userProfile AND condition is met (if exists)
        if (!userProfile?.[q.key] && (!q.condition || q.condition(userProfile))) {
          nextQuestion = q;
          break;
        }
      }

      // --- Ask the next question or complete onboarding ---
      if (nextQuestion) {
        const prompt = `
          System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
          ${context.channel ? `You are responding via the ${context.channel} channel.` : ''}
          
          Your task is to ask the user the following onboarding question:
          "${this.tools.i18nService.t(nextQuestion.prompt, lang)}"
          
          If it's a choice question, provide the options clearly.
          User's message: ${context.userMessage}
          Conversation History: ${context.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n")}
        `;
        const llmResponse = await this.tools.llmClient.generateResponse(prompt, undefined, "none") as string;
        // Store the current question key
        await this.tools.database.query.update(users).set({ currentOnboardingQuestion: nextQuestion.key }).where(eq(users.id, context.userId));
        return llmResponse;
      } else {
        // All questions answered, complete onboarding
        await this.tools.database.query.update(users).set({ 
          onboardingCompleted: true, 
          currentOnboardingQuestion: null,
          updatedAt: new Date()
        }).where(eq(users.id, context.userId));
        console.log(`[${this.name}] Onboarding completed for user ${context.userId}. Profile: goalRace=${userProfile?.goalRace}, experienceLevel=${userProfile?.experienceLevel}, weeklyFrequency=${userProfile?.weeklyFrequency}, age=${userProfile?.age}`);

        // Generate micro-milestone
        const microMilestonePrompt = `
          System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
          ${context.channel ? `You are responding via the ${context.channel} channel.` : ''}
          
          The user has just completed their onboarding. Their goal race is ${userProfile?.goalRace || 'a race'}, experience level is ${userProfile?.experienceLevel || 'unknown'}, and they want to run ${userProfile?.weeklyFrequency || 'a few'} times a week.
          
          Your task is to provide a warm, motivating micro-milestone for them. Example: "¡Genial, Juan! Empezaremos con 3 rodajes suaves esta semana para construir base. ¿Listo para comenzar?" or "¡Felicidades! Tu meta de 5K es perfecta. ¡En 3 semanas, correrás 5K sin parar! ¿Listo para empezar?"
          Make it personal and encouraging.
        `;
        const microMilestone = await this.tools.llmClient.generateResponse(microMilestonePrompt, undefined, "none") as string;

        // Trigger TrainingPlannerAgent (HeadCoach will handle this after this agent returns empty)
        return microMilestone;
      }

    } catch (error) {

      console.error(`[${this.name}] Error during onboarding for user ${context.userId}:`, error);
      return "Lo siento, hubo un problema durante tu proceso de registro. Por favor, inténtalo de nuevo más tarde.";
    }
  }

  private validateAnswer(answer: string, question: OnboardingQuestion): { isValid: boolean; parsedValue?: any } {
    const lowerAnswer = answer.toLowerCase().trim();

    switch (question.validation.type) {
      case 'number':
        const num = parseInt(lowerAnswer, 10);
        if (!isNaN(num) && num >= question.validation.range!.min && num <= question.validation.range!.max) {
          return { isValid: true, parsedValue: num };
        }
        break;
      case 'choice':
        for (const [value, keywords] of Object.entries(question.validation.options!)) {
          if (keywords.some(kw => lowerAnswer.includes(kw))) {
            return { isValid: true, parsedValue: value };
          }
        }
        break;
      case 'text':
      default:
        return { isValid: true, parsedValue: answer };
    }
    return { isValid: false };
  }

  private findQuestionByPrompt(prompt: string): OnboardingQuestion | undefined {
    // This is a simplified way to find the question. In a real scenario,
    // you might store the question key in the chat buffer or use a more robust matching.
    for (const q of onboardingQuestions) {
      if (prompt.includes(q.prompt)) {
        return q;
      }
    }
    return undefined;
  }
}