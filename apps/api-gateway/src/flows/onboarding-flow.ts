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
    let user = await this.database.query.query.users.findFirst({
      where: eq(users.phoneNumber, phoneNumber),
    });

    if (!user) {
      [user] = await this.database.query
        .insert(users)
        .values({ phoneNumber, preferredLanguage: lang })
        .returning();
    }
    return user;
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
      );
  }
}
