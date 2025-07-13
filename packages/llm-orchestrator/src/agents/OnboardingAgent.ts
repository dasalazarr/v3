

import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";
import { users } from "@running-coach/database";
import { eq } from "drizzle-orm";

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
    key: 'goalRace',
    prompt: '¡Hola! Para empezar, ¿cuál es tu meta principal? ¿Correr 5K, 10K, una Media Maratón (21K) o una Maratón (42K)?',
    validation: {
      type: 'choice',
      options: {
        '5k': ['5k', '5k', 'cinco k'],
        '10k': ['10k', 'diez k'],
        'half_marathon': ['21k', 'media maraton', 'media', 'half'],
        'marathon': ['42k', 'maraton'],
      },
      error: 'No entendí tu meta. Por favor, elige entre 5K, 10K, Media Maratón o Maratón.',
    },
  },
  {
    key: 'experienceLevel',
    prompt: 'Genial. Ahora, cuéntame sobre tu experiencia. ¿Eres principiante, intermedio o avanzado?',
    validation: {
      type: 'choice',
      options: {
        beginner: ['principiante', 'nunca he corrido'],
        intermediate: ['intermedio', 'corro ocasional'],
        advanced: ['avanzado', 'corro seguido'],
      },
      error: 'No entendí tu nivel de experiencia. Por favor, elige entre principiante, intermedio o avanzado.',
    },
  },
  {
    key: 'weeklyMileage',
    prompt: '¿Cuántas veces a la semana te gustaría correr? (ej. 3, 4, 5)',
    validation: { type: 'number', range: { min: 1, max: 7 }, error: 'Por favor, ingresa un número entre 1 y 7 para tus sesiones semanales.' },
  },
  {
    key: 'injuryHistory',
    prompt: '¿Tienes alguna lesión o molestia actual que deba saber? (Sí/No)',
    validation: {
      type: 'choice',
      options: {
        'yes': ['si', 'sí', 'yes'],
        'no': ['no', 'ninguna'],
      },
      error: 'Por favor, responde Sí o No.',
    },
  },
  {
    key: 'age',
    prompt: 'Para personalizar aún más, ¿cuál es tu edad? (Solo el número)',
    validation: { type: 'number', range: { min: 16, max: 80 }, error: 'Por favor, ingresa una edad válida entre 16 y 80 años.' },
    condition: (userProfile) => !userProfile.age, // Only ask if age is not set
  },
  {
    key: 'gender',
    prompt: 'Y finalmente, ¿cuál es tu género? (Hombre/Mujer/Otro)',
    validation: {
      type: 'choice',
      options: {
        male: ['hombre', 'masculino'],
        female: ['mujer', 'femenino'],
        other: ['otro'],
      },
      error: 'Por favor, elige entre Hombre, Mujer u Otro.',
    },
    condition: (userProfile) => !userProfile.gender, // Only ask if gender is not set
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
          
          Your task is to provide a warm welcome message to the user and then ask the first onboarding question: "${onboardingQuestions[0].prompt}".
          Make sure to greet them by name if available in userProfile.phoneNumber, otherwise use a generic greeting.
          User's message: ${context.userMessage}
        `;
        const welcomeMessage = await this.tools.llmClient.generateResponse(welcomePrompt, undefined, "none") as string;
        return welcomeMessage;
      }

      // --- Process previous answer (if any) ---
      // Only process if there's a question that was implicitly asked
      const lastAssistantMessage = [...context.conversationHistory].reverse().find((msg: { role: string; content: string }) => msg.role === 'assistant');
      const lastQuestionAsked = lastAssistantMessage ? this.findQuestionByPrompt(lastAssistantMessage.content) : undefined;

      if (lastQuestionAsked) {
        const validationResult = this.validateAnswer(context.userMessage, lastQuestionAsked);

        if (validationResult.isValid) {
          await this.tools.database.query.update(users).set({ [lastQuestionAsked.key]: validationResult.parsedValue }).where(eq(users.id, context.userId));
          userProfile = { ...userProfile, [lastQuestionAsked.key]: validationResult.parsedValue }; // Update local profile
          console.log(`[${this.name}] Updated user ${context.userId} with ${String(lastQuestionAsked.key)}: ${validationResult.parsedValue}`);
        } else {
          // Invalid answer, re-ask the question with error
          const prompt = `
            System: You are ${this.name}, a ${this.role}. Your personality is: ${this.personality}.
            ${context.channel ? `You are responding via the ${context.channel} channel.` : ''}
            
            The user's last response was invalid for the question: "${lastQuestionAsked.prompt}".
            The validation error is: "${lastQuestionAsked.validation.error}".
            
            Your task is to politely re-ask the question, explaining the error. Provide options if it's a choice question.
            User's message: ${context.userMessage}
            Conversation History: ${context.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n")}
          `;
          const llmResponse = await this.tools.llmClient.generateResponse(prompt, undefined, "none") as string;
          return llmResponse;
        }
      }

      // --- Find the next question to ask ---
      let nextQuestion: OnboardingQuestion | undefined;
      for (const q of onboardingQuestions) {
        // Check if the question's key is not set in userProfile or if its condition is not met
        if (!userProfile?.[q.key] || (q.condition && !q.condition(userProfile))) {
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
          "${nextQuestion.prompt}"
          
          If it's a choice question, provide the options clearly.
          User's message: ${context.userMessage}
          Conversation History: ${context.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n")}
        `;
        const llmResponse = await this.tools.llmClient.generateResponse(prompt, undefined, "none") as string;
        return llmResponse;
      } else {
        // All questions answered, complete onboarding
        await this.tools.database.query.update(users).set({ onboardingCompleted: true }).where(eq(users.id, context.userId));
        console.log(`[${this.name}] Onboarding completed for user ${context.userId}.`);

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