
import { injectable, inject } from 'tsyringe';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { LanguageDetector } from '@running-coach/shared';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { VectorMemory } from '@running-coach/vector-memory';
import logger from '../services/logger-service.js';

@injectable()
export class EnhancedMainFlow {
  constructor(
    @inject('AIAgent') private aiAgent: AIAgent,
    @inject('Database') private database: Database,
    @inject('VectorMemory') private vectorMemory: VectorMemory,
    @inject('LanguageDetector') private languageDetector: LanguageDetector
  ) {}

  private async getOrCreateUser(phoneNumber: string, message: string) {
    const [user] = await this.database.query
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (user) {
      logger.info({ userId: phoneNumber }, '[DB_FETCH] User found');
      return user;
    }

    const lang = await this.languageDetector.detect(message);
    logger.info({ userId: phoneNumber, lang }, '[DB_CREATE] New user, creating record');
    const [newUser] = await this.database.query
      .insert(users)
      .values({ phoneNumber, preferredLanguage: lang })
      .returning();
    return newUser;
  }

  createFlow() {
    return addKeyword(EVENTS.WELCOME)
      .addAction(async (ctx, { gotoFlow, state }) => {
        const user = await this.getOrCreateUser(ctx.from, ctx.body);
        
        await state.update({ 
          lang: user.preferredLanguage,
          userId: user.id 
        });

        if (!user.onboardingCompleted) {
          logger.info({ userId: ctx.from }, '[ROUTER] Onboarding not completed, redirecting to OnboardingFlow');
          return gotoFlow(container.resolve('OnboardingFlow').createFlow());
        }
        
        logger.info({ userId: ctx.from }, '[ROUTER] User has completed onboarding, proceeding to main flow');
        // This is where the main conversation logic will go
      })
      .addAnswer('This is the main flow. What can I help you with today?', { capture: true }, async (ctx, { flowDynamic }) => {
        // Placeholder for intent detection and routing to sub-flows
        await flowDynamic('I am ready to process your request.');
      });
  }
}
