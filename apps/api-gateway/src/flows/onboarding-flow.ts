import { injectable, inject } from 'tsyringe';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { Database, users } from '@running-coach/database';
import { TemplateEngine } from '@running-coach/shared';
import { eq } from 'drizzle-orm';
import logger from '../services/logger-service.js';
import { container } from 'tsyringe';
import { EnhancedMainFlow } from './enhanced-main-flow.js';

// Define the structure for a single question in the onboarding flow
interface OnboardingQuestion {
  key: keyof typeof users.$inferInsert;
  prompt: string; // i18n key
  validation: {
    type: 'number' | 'text' | 'choice';
    options?: { [key: string]: string[] }; // For 'choice' type
    range?: { min: number; max: number }; // For 'number' type
    error: string; // i18n key
  };
  // Optional condition to check before asking the question
  condition?: (state: any) => boolean;
}

// Centralized configuration for the onboarding questions
const onboardingQuestions: OnboardingQuestion[] = [
  {
    key: 'age',
    prompt: 't(onboarding:age.question)',
    validation: { type: 'number', range: { min: 15, max: 99 }, error: 't(onboarding:age.error)' },
  },
  {
    key: 'gender',
    prompt: 't(onboarding:gender.question)',
    validation: {
      type: 'choice',
      options: {
        male: ['m', 'masc', 'male', 'hombre'],
        female: ['f', 'fem', 'female', 'mujer'],
        other: ['o', 'otro', 'other'],
      },
      error: 't(onboarding:gender.error)',
    },
  },
  {
    key: 'experienceLevel',
    prompt: 't(onboarding:level.question)',
    validation: {
      type: 'choice',
      options: {
        beginner: ['principiante', 'beginner'],
        intermediate: ['intermedio', 'intermediate'],
        advanced: ['avanzado', 'advanced'],
      },
      error: 't(onboarding:level.error)',
    },
  },
  {
    key: 'onboardingGoal',
    prompt: 't(onboarding:goal.question)',
    validation: {
      type: 'choice',
      options: {
        first_race: ['primera', 'first'],
        improve_time: ['mejorar', 'improve'],
        stay_fit: ['forma', 'fit'],
      },
      error: 't(onboarding:goal.error)',
    },
  },
  {
    key: 'goalRace',
    prompt: 't(onboarding:goal_race.question)',
    validation: {
        type: 'choice',
        options: {
            '5k': ['5k'],
            '10k': ['10k'],
            'half_marathon': ['21k', 'media', 'half'],
            'marathon': ['42k', 'maraton', 'marathon'],
            'ultra': ['ultra'],
        },
        error: 't(onboarding:goal_race.error)',
    },
    condition: (state) => state.onboardingGoal === 'first_race' || state.onboardingGoal === 'improve_time',
  },
  {
    key: 'weeklyMileage',
    prompt: 't(onboarding:frequency.question)',
    validation: { type: 'number', range: { min: 1, max: 200 }, error: 't(onboarding:frequency.error)' },
  },
  {
    key: 'injuryHistory',
    prompt: 't(onboarding:injury.question)',
    validation: {
        type: 'choice',
        options: {
            'none': ['no', 'ninguna', 'none'],
            'minor': ['leves', 'minor'],
            'recovery': ['recuperandome', 'recovering'],
        },
        error: 't(onboarding:injury.error)',
    },
  },
];

@injectable()
export class OnboardingFlow {
  constructor(
    @inject('Database') private database: Database,
    @inject('TemplateEngine') private templateEngine: TemplateEngine
  ) {}

  private async updateUser(phone: string, data: Partial<typeof users.$inferInsert>) {
    logger.debug({ userId: phone, data }, '[DB_UPDATE] Updating user record');
    try {
      await this.database.query
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.phoneNumber, phone));
      logger.info({ userId: phone, data }, '[DB_SUCCESS] User record updated');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error({ userId: phone, error: errorMessage }, '[DB_ERROR] Failed to update user record');
    }
  }

  createFlow() {
    return addKeyword(EVENTS.ACTION)
      .addAction(async (ctx, { state, flowDynamic }) => {
        const lang = state.get('lang');
        logger.info({ userId: ctx.from, lang }, '[ONBOARDING_START] Onboarding started');
        const welcomeMessage = this.templateEngine.process('t(onboarding:start.welcome)', {}, lang);
        await flowDynamic(welcomeMessage);
        await state.update({ questionIndex: 0 });
      })
      .addAnswer(
        ' ', // Placeholder, the real question is asked in the action
        { capture: true },
        async (ctx, { state, flowDynamic, fallBack, gotoFlow }) => {
          const lang = state.get('lang');
          let questionIndex = state.get('questionIndex') || 0;

          // Process the answer to the *previous* question
          if (questionIndex > 0) {
            const previousQuestion = onboardingQuestions[questionIndex - 1];
            const answer = ctx.body.toLowerCase();
            let isValid = false;
            let parsedValue: any = answer;

            switch (previousQuestion.validation.type) {
              case 'number':
                const num = parseInt(answer, 10);
                if (!isNaN(num) && num >= previousQuestion.validation.range!.min && num <= previousQuestion.validation.range!.max) {
                  isValid = true;
                  parsedValue = num;
                }
                break;
              case 'choice':
                for (const [value, keywords] of Object.entries(previousQuestion.validation.options!)) {
                  if (keywords.some(kw => answer.includes(kw))) {
                    isValid = true;
                    parsedValue = value;
                    break;
                  }
                }
                break;
              case 'text':
              default:
                isValid = true;
                break;
            }

            if (!isValid) {
              const errorMessage = this.templateEngine.process(previousQuestion.validation.error, {}, lang);
              return fallBack(errorMessage);
            }

            await state.update({ [previousQuestion.key]: parsedValue });
            logger.info({ userId: ctx.from, step: previousQuestion.key, value: parsedValue }, '[ONBOARDING_STEP] Step completed');
          }

          // Find the next question to ask
          let nextQuestion = onboardingQuestions[questionIndex];
          while (nextQuestion && nextQuestion.condition && !nextQuestion.condition(state.get())) {
            questionIndex++;
            nextQuestion = onboardingQuestions[questionIndex];
          }

          // If there are more questions, ask the next one
          if (nextQuestion) {
            await state.update({ questionIndex: questionIndex + 1 });
            const questionPrompt = this.templateEngine.process(nextQuestion.prompt, {}, lang);
            await flowDynamic(questionPrompt);
            return;
          }

          // If no more questions, complete the onboarding
          const finalData = { ...state.get() };
          delete finalData.questionIndex;
          finalData.onboardingCompleted = true;

          await this.updateUser(ctx.from, finalData);
          logger.info({ userId: ctx.from, data: finalData }, '[ONBOARDING_COMPLETE] Onboarding finished');

          const doneMsg = this.templateEngine.process('t(onboarding:completed.message)', {}, lang);
          await flowDynamic(doneMsg);

          // Redirect to the main flow
          return gotoFlow(container.resolve(EnhancedMainFlow).createFlow());
        }
      );
  }
}
