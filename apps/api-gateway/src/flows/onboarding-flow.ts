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

@injectable()
export class OnboardingFlow {
  constructor(
    @inject('Database') private database: Database,
    @inject('TemplateEngine') private templateEngine: TemplateEngine
  ) {}

  private async getOrCreateUser(phoneNumber: string, lang: 'es' | 'en') {
        // Accedemos a la instancia 'db' de la clase Database para realizar consultas
    const [user] = await this.database.query
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    let existingUser = user;

    if (!existingUser) {
      [existingUser] = await this.database.query
        .insert(users)
        .values({ phoneNumber, preferredLanguage: lang })
        .returning();
    }
    return existingUser;
  }

  createFlow() {
    return addKeyword(['empezar', 'start'], { sensitive: false })
      .addAction(async (ctx, { flowDynamic, state }) => {
        // Simple lang detection for now
        const lang = ctx.body.toLowerCase() === 'start' ? 'en' : 'es';
        const user = await this.getOrCreateUser(ctx.from, lang);
        await state.update({ lang: user.preferredLanguage });

        const welcomeMessage = this.templateEngine.process(
          't(onboarding:start.welcome)',
          {},
          lang
        );

        await flowDynamic(welcomeMessage);
      })
      .addAnswer(
        't(onboarding:age.question)',
        { capture: true },
        async (ctx, { state, fallBack }) => {
          const lang = state.get('lang');
          const age = parseInt(ctx.body, 10);

          if (isNaN(age) || age < 15 || age > 99) {
            const errorMessage = this.templateEngine.process(
              't(onboarding:age.error)',
              {},
              lang
            );
            return fallBack(errorMessage);
          }

          await this.database.query
            .update(users)
            .set({ age })
            .where(eq(users.phoneNumber, ctx.from));
        }
      )
      .addAnswer(
        't(onboarding:goal.question)',
        { capture: true },
        async (ctx, { state, flowDynamic }) => {
          const lang = state.get('lang');
          const text = ctx.body.toLowerCase();
          let goal: 'first_race' | 'improve_time' | 'stay_fit' = 'stay_fit';
          if (text.includes('primera') || text.includes('first')) {
            goal = 'first_race';
          } else if (text.includes('mejorar') || text.includes('improve')) {
            goal = 'improve_time';
          }

          await this.database.query
            .update(users)
            .set({ onboardingGoal: goal })
            .where(eq(users.phoneNumber, ctx.from));
        }
      )
      .addAnswer(
        't(onboarding:frequency.question)',
        { capture: true },
        async (ctx, { state, fallBack }) => {
          const lang = state.get('lang');
          const freq = parseInt(ctx.body, 10);

          if (isNaN(freq) || freq < 1 || freq > 7) {
            const errorMessage = this.templateEngine.process(
              't(onboarding:frequency.error)',
              {},
              lang
            );
            return fallBack(errorMessage);
          }

          await this.database
            .query
            .update(users)
            .set({ weeklyMileage: freq })         // <-- usa valor numérico
            .where(eq(users.phoneNumber, ctx.from));
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

          await this.database.query
            .update(users)
            .set({ injuryHistory: { status } })
            .where(eq(users.phoneNumber, ctx.from));

          const lang = state.get('lang');
          const doneMsg = this.templateEngine.process(
            't(onboarding:completed.message)',
            {},
            lang
          );
          await state.update({});
          await flowDynamic(doneMsg);
        }
      );
  }
}
