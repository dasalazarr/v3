
import { injectable, inject, container } from 'tsyringe';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { LanguageDetector } from '@running-coach/shared';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { VectorMemory } from '@running-coach/vector-memory';
import logger from '../services/logger-service.js';
import { OnboardingFlow } from './onboarding-flow.js';

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

    const lang = (await this.languageDetector.detect(message)) as 'es' | 'en';
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

        // Use AI Agent for all interactions (onboarding and main flow)
        try {
          console.log(`🤖 [ENHANCED_MAIN_FLOW] Processing message for user ${user.id}: "${ctx.body}"`);

          const response = await this.aiAgent.processMessage({
            userId: user.id,
            message: ctx.body,
            userProfile: user as any // Temporary type assertion to avoid build issues
          });

          console.log(`✅ [ENHANCED_MAIN_FLOW] AI response generated: ${response.content.substring(0, 100)}...`);

          if (response.toolCalls && response.toolCalls.length > 0) {
            console.log(`🔧 [ENHANCED_MAIN_FLOW] Tools executed: ${response.toolCalls.map(t => t.name).join(', ')}`);
          }

          return ctx.flowDynamic(response.content);

        } catch (error) {
          console.error(`❌ [ENHANCED_MAIN_FLOW] Error processing message:`, error);
          const errorMessage = 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.';
          return ctx.flowDynamic(errorMessage);
        }
      });
  }
}
