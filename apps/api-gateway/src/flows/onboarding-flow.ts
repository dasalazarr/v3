/**
 * Flujo de onboarding bilingüe (ES/EN) para nuevos usuarios
 * Permite capturar información básica del usuario como edad, género y objetivos
 * Implementa validación de inputs y persistencia en base de datos
 */
import { injectable, inject } from 'tsyringe';
import { addKeyword } from '@builderbot/bot';

import { Database, users } from '@running-coach/database';
import { TemplateEngine } from '@running-coach/shared';
import { eq } from 'drizzle-orm';
import logger from '../services/logger-service.js';

@injectable()
export class OnboardingFlow {
  constructor(
    @inject('Database') private database: Database,
    @inject('TemplateEngine') private templateEngine: TemplateEngine
  ) {}

  private async getOrCreateUser(phoneNumber: string, lang: 'es' | 'en') {
    const [user] = await this.database.query
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    let existingUser = user;

    if (!existingUser) {
      logger.info({ userId: phoneNumber, lang }, '[DB_CREATE] New user, creating record');
      [existingUser] = await this.database.query
        .insert(users)
        .values({ phoneNumber, preferredLanguage: lang })
        .returning();
    }
    return existingUser;
  }

  private async updateUser(phone: string, data: Partial<typeof users.$inferInsert>) {
    logger.debug({ userId: phone, data }, '[DB_UPDATE] Updating user record');
    try {
      await this.database.query
        .update(users)
        .set({ ...data, updatedAt: new Date() }) // Siempre actualiza updatedAt
        .where(eq(users.phoneNumber, phone));
      logger.info({ userId: phone, data }, '[DB_SUCCESS] User record updated');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error({ userId: phone, error: errorMessage }, '[DB_ERROR] Failed to update user record');
    }
  }

  createFlow() {
    return addKeyword(['empezar', 'start'], { sensitive: false })
      .addAction(async (ctx, { flowDynamic, state }) => {
        const lang = ctx.body.toLowerCase() === 'start' ? 'en' : 'es';
        const user = await this.getOrCreateUser(ctx.from, lang);
        
        await state.update({ 
          lang: user.preferredLanguage,
          onboardingStep: 'welcome',
          userId: user.id 
        });

        logger.info({ userId: ctx.from, lang }, '[ONBOARDING_START] Onboarding started');
        const welcomeMessage = this.templateEngine.process('t(onboarding:start.welcome)', {}, lang);
        await flowDynamic(welcomeMessage);
      })
      .addAnswer(
        't(onboarding:age.question)',
        { capture: true },
        async (ctx, { state, fallBack }) => {
          const lang = state.get('lang');
          const age = parseInt(ctx.body, 10);

          if (isNaN(age) || age < 15 || age > 99) {
            logger.warn({ userId: ctx.from, step: 'age', input: ctx.body }, '[VALIDATION_ERROR] Invalid user input');
            const errorMessage = this.templateEngine.process('t(onboarding:age.error)', {}, lang);
            return fallBack(errorMessage);
          }
          
          await this.updateUser(ctx.from, { age });
          await state.update({ onboardingStep: 'age_completed' });
          logger.info({ userId: ctx.from, step: 'age', value: age }, '[ONBOARDING_STEP] Step completed');
        }
      )
      .addAnswer(
        't(onboarding:gender.question)',
        { capture: true },
        async (ctx, { state }) => {
          const text = ctx.body.toLowerCase();
          let gender: 'male' | 'female' | 'other' = 'other';
          if (text.startsWith('m') || text.includes('masc') || text.includes('male')) {
            gender = 'male';
          } else if (text.startsWith('f') || text.includes('fem') || text.includes('female')) {
            gender = 'female';
          }
          
          await this.updateUser(ctx.from, { gender });
          await state.update({ onboardingStep: 'gender_completed' });
          logger.info({ userId: ctx.from, step: 'gender', value: gender }, '[ONBOARDING_STEP] Step completed');
        }
      )
      .addAnswer(
        't(onboarding:level.question)',
        { capture: true },
        async (ctx, { state }) => {
          const text = ctx.body.toLowerCase();
          let level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
          if (text.includes('inter') || text.includes('medi')) {
            level = 'intermediate';
          } else if (text.includes('avan') || text.includes('advanced')) {
            level = 'advanced';
          }

          await this.updateUser(ctx.from, { experienceLevel: level });
          await state.update({ onboardingStep: 'level_completed' });
          logger.info({ userId: ctx.from, step: 'level', value: level }, '[ONBOARDING_STEP] Step completed');
        }
      )
      .addAnswer(
        't(onboarding:goal.question)',
        { capture: true },
        async (ctx, { state }) => {
          const text = ctx.body.toLowerCase();
          let goal: 'first_race' | 'improve_time' | 'stay_fit' = 'stay_fit';
          if (text.includes('primera') || text.includes('first')) {
            goal = 'first_race';
          } else if (text.includes('mejorar') || text.includes('improve')) {
            goal = 'improve_time';
          }

          await this.updateUser(ctx.from, { onboardingGoal: goal });
          await state.update({ onboardingStep: 'goal_completed' });
          logger.info({ userId: ctx.from, step: 'goal', value: goal }, '[ONBOARDING_STEP] Step completed');
        }
      )
      .addAnswer(
        't(onboarding:frequency.question)',
        { capture: true },
        async (ctx, { state, fallBack }) => {
          const lang = state.get('lang');
          const freq = parseInt(ctx.body, 10);

          if (isNaN(freq) || freq < 1 || freq > 7) {
            logger.warn({ userId: ctx.from, step: 'frequency', input: ctx.body }, '[VALIDATION_ERROR] Invalid user input');
            const errorMessage = this.templateEngine.process('t(onboarding:frequency.error)', {}, lang);
            return fallBack(errorMessage);
          }

          await this.updateUser(ctx.from, { weeklyMileage: String(freq) });
          await state.update({ onboardingStep: 'frequency_completed' });
          logger.info({ userId: ctx.from, step: 'frequency', value: freq }, '[ONBOARDING_STEP] Step completed');
        }
      )
      .addAnswer(
        't(onboarding:injury.question)',
        { capture: true },
        async (ctx, { state, flowDynamic }) => {
          const text = ctx.body.toLowerCase();
          let status = 'none';
          if (text.includes('leves') || text.includes('minor')) {
            status = 'minor';
          } else if (text.includes('recuper') || text.includes('recover')) {
            status = 'recovery';
          }

          await this.updateUser(ctx.from, { 
            injuryHistory: { status },
            onboardingCompleted: true
          });

          const lang = state.get('lang');
          const doneMsg = this.templateEngine.process('t(onboarding:completed.message)', {}, lang);
          
          logger.info({ userId: ctx.from }, '[ONBOARDING_COMPLETE] Onboarding finished');
          await state.update({ onboardingStep: 'finished' });
          await flowDynamic(doneMsg);
        }
      );
  }
}
