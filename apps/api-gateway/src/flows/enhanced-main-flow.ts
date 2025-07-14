
import { injectable, inject, container } from 'tsyringe';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { LanguageDetector, UserProfile } from '@running-coach/shared';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { VectorMemory } from '@running-coach/vector-memory';
import logger from '../services/logger-service.js';
import { OnboardingFlow } from './onboarding-flow.js';
import { MultiAgentServiceWrapper } from '../services/multi-agent-service.js';

@injectable()
export class EnhancedMainFlow {
  constructor(
    @inject('AIAgent') private aiAgent: AIAgent,
    @inject('Database') private database: Database,
    @inject('VectorMemory') private vectorMemory: VectorMemory,
    @inject('LanguageDetector') private languageDetector: LanguageDetector,
    @inject('MultiAgentServiceWrapper') private multiAgentService: MultiAgentServiceWrapper
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

        if (!user.onboardingCompleted) {
          logger.info({ userId: ctx.from }, '[ROUTER] Onboarding not completed, redirecting to OnboardingFlow');
          const onboardingFlow = container.resolve(OnboardingFlow);
          return gotoFlow(onboardingFlow.createFlow());
        }
        
        logger.info({ userId: ctx.from }, '[ROUTER] User has completed onboarding, proceeding to main flow');
        // This is where the main conversation logic will go
      })
      .addAnswer('', { capture: true }, async (ctx, { flowDynamic, state }) => {
        try {
          const user = await this.getOrCreateUser(ctx.from, ctx.body);
          const message = ctx.body;
          
          // Check if we should use multi-agent system
          const shouldUseMultiAgent = this.multiAgentService.shouldUseMultiAgent(message);
          
          let response: string;
          
          if (shouldUseMultiAgent) {
            logger.info({ userId: ctx.from }, '[MULTI_AGENT] Using multi-agent system');
            
            // Get conversation history from chat buffer
            const conversationHistory: any[] = [];
            
            // Process with multi-agent system
            const result = await this.multiAgentService.processMessage(
              ctx.from,
              message,
              user,
              user.preferredLanguage as 'en' | 'es'
            );
            
            response = result.content;
            
            // Log multi-agent metrics
            logger.info({ 
              userId: ctx.from, 
              multiAgentUsed: result.multiAgentUsed,
              executionTime: result.executionTime,
              success: result.success 
            }, '[MULTI_AGENT] Workflow completed');
            
          } else {
            logger.info({ userId: ctx.from }, '[SINGLE_AGENT] Using single agent system');
            
            // Fallback to single agent
            const aiResponse = await this.aiAgent.processMessage({
              userId: ctx.from,
              message,
              userProfile: {
                ...user,
                age: user.age ?? undefined,
                goalRace: user.goalRace ?? undefined,
                experienceLevel: user.experienceLevel ?? undefined,
                injuryHistory: user.injuryHistory ?? undefined,
                weeklyMileage: user.weeklyMileage ?? undefined,
                timezone: user.timezone ?? undefined
              } as UserProfile
            });
            
            response = aiResponse.content;
          }
          
          await flowDynamic(response);
          
        } catch (error) {
          logger.error({ userId: ctx.from, error }, '[MAIN_FLOW] Error processing message');
          
          // Fallback error response
          const lang = (await state.get('lang')) as 'es' | 'en';
          const errorMessage = lang === 'es' 
            ? 'Disculpa, estoy teniendo algunos problemas técnicos. ¿Puedes intentarlo de nuevo?'
            : 'Sorry, I\'m having some technical issues. Can you please try again?';
          
          await flowDynamic(errorMessage);
        }
      });
  }
}
