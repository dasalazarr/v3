import { injectable, inject, container } from 'tsyringe';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { Database, users } from '@running-coach/database';
import { TemplateEngine } from '@running-coach/shared';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { eq } from 'drizzle-orm';
import logger from '../services/logger-service.js';
import { EnhancedMainFlow } from './enhanced-main-flow.js';
import z from 'zod';

// Zod schema for validating extracted data
const OnboardingDataSchema = z.object({
  age: z.number().min(15).max(99).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  onboardingGoal: z.enum(['first_race', 'improve_time', 'stay_fit']).optional(),
  goalRace: z.enum(['5k', '10k', 'half_marathon', 'marathon', 'ultra']).optional(),
  weeklyMileage: z.number().min(1).max(200).optional(),
  injuryHistory: z.enum(['none', 'minor', 'recovery']).optional(),
});

type OnboardingData = z.infer<typeof OnboardingDataSchema>;

// The questions are now simpler, just defining what we need.
const onboardingFields: { key: keyof OnboardingData; prompt: string }[] = [
  { key: 'age', prompt: 't(onboarding:age.question)' },
  { key: 'gender', prompt: 't(onboarding:gender.question)' },
  { key: 'experienceLevel', prompt: 't(onboarding:level.question)' },
  { key: 'onboardingGoal', prompt: 't(onboarding:goal.question)' },
  { key: 'goalRace', prompt: 't(onboarding:goal_race.question)' },
  { key: 'weeklyMileage', prompt: 't(onboarding:frequency.question)' },
  { key: 'injuryHistory', prompt: 't(onboarding:injury.question)' },
];

@injectable()
export class OnboardingFlow {
  constructor(
    @inject('Database') private database: Database,
    @inject('TemplateEngine') private templateEngine: TemplateEngine,
    @inject('AIAgent') private aiAgent: AIAgent
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

  private createExtractionPrompt(userInput: string, missingFields: (keyof OnboardingData)[]): string {
    return `
      You are a data extraction assistant. Your task is to extract the following fields from the user's message: ${missingFields.join(', ')}.
      The user said: "${userInput}"
      
      Return the extracted data as a valid JSON object. If a value is not found, omit the key.
      Example: { "age": 30, "experienceLevel": "beginner" }
      
      JSON response:
    `;
  }

  createFlow() {
    return addKeyword(EVENTS.ACTION)
      .addAction(async (ctx, { state, flowDynamic }) => {
        const lang = state.get('lang') || 'es';
        logger.info({ userId: ctx.from, lang }, '[ONBOARDING_START] Onboarding started');
        const welcomeMessage = this.templateEngine.process('t(onboarding:start.welcome)', {}, lang);
        await flowDynamic(welcomeMessage);
        
        // Ask the first question right away
        const firstQuestion = this.templateEngine.process(onboardingFields[0].prompt, {}, lang);
        await flowDynamic(firstQuestion);
      })
      .addAnswer(
        ' ', // Capture all subsequent messages
        { capture: true },
        async (ctx, { state, flowDynamic, gotoFlow }) => {
          const lang = state.get('lang') || 'es';
          const userInput = ctx.body;
          const currentState = (state.get('onboardingData') || {}) as OnboardingData;

          // 1. Determine which fields are still missing
          const missingFields = onboardingFields.filter(f => !currentState[f.key]);
          if (missingFields.length === 0) {
            // Should not happen if logic is correct, but as a safeguard
            return;
          }

          // 2. Use AI to extract information from the user's message
          const extractionPrompt = this.createExtractionPrompt(userInput, missingFields.map(f => f.key));
          let extractedData: OnboardingData = {};
          try {
            const rawResponse = await this.aiAgent.generateResponse(extractionPrompt);
            // Clean the response to ensure it's valid JSON
            const jsonResponse = rawResponse.replace(/```json|```/g, '').trim();
            extractedData = OnboardingDataSchema.parse(JSON.parse(jsonResponse));
            logger.info({ userId: ctx.from, extracted: extractedData }, '[AI_EXTRACTION] Extracted data from user input');
          } catch (error) {
            logger.error({ userId: ctx.from, error }, '[AI_EXTRACTION_ERROR] Failed to extract or validate data');
            // If extraction fails, we'll just ask the next question without updating the state
          }

          // 3. Merge extracted data with current state
          const updatedState = { ...currentState, ...extractedData };
          await state.update({ onboardingData: updatedState });

          // 4. Find the next missing field to ask about
          const nextMissingField = onboardingFields.find(f => !updatedState[f.key]);

          if (nextMissingField) {
            // Ask the next question
            const nextQuestionPrompt = this.templateEngine.process(nextMissingField.prompt, {}, lang);
            await flowDynamic(nextQuestionPrompt);
          } else {
            // All fields are filled, complete the onboarding
            const dataForDb: Partial<typeof users.$inferInsert> = {
              onboardingCompleted: true,
              age: updatedState.age,
              gender: updatedState.gender,
              experienceLevel: updatedState.experienceLevel,
              onboardingGoal: updatedState.onboardingGoal,
              goalRace: updatedState.goalRace,
            };

            if (updatedState.weeklyMileage) {
              dataForDb.weeklyMileage = String(updatedState.weeklyMileage);
            }

            if (updatedState.injuryHistory) {
              dataForDb.injuryHistory = [{
                type: updatedState.injuryHistory,
                date: new Date().toISOString(),
                severity: 'minor',
                recovered: false
              }];
            }

            logger.info({ userId: ctx.from, data: dataForDb }, '[ONBOARDING_COMPLETE] Preparing to update user with final data.');
            await this.updateUser(ctx.from, dataForDb);

            const doneMsg = this.templateEngine.process('t(onboarding:completed.message)', {}, lang);
            await flowDynamic(doneMsg);

            // Redirect to the main flow
            const mainFlow = container.resolve(EnhancedMainFlow);
            return gotoFlow(mainFlow.createFlow());
          }
        }
      );
  }
}
