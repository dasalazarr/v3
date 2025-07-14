
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

  private async handleConversation(ctx: any, flowDynamic: any, state: any) {
    let user: (typeof users.$inferSelect) | undefined;
    try {
      [user] = await this.database.query
        .select()
        .from(users)
        .where(eq(users.phoneNumber, ctx.from))
        .limit(1);
      const message = ctx.body;

      // Ensure user and language are available
      if (!user || !user.preferredLanguage) {
        logger.error({ userId: ctx.from }, '[MAIN_FLOW] User or language not found after onboarding');
        await flowDynamic('I seem to be having trouble retrieving your profile. Please try again.');
        return;
      }

      const shouldUseMultiAgent = this.multiAgentService.shouldUseMultiAgent(message);
      let response: string;

      if (shouldUseMultiAgent) {
        logger.info({ userId: ctx.from }, '[MULTI_AGENT] Using multi-agent system');
        const result = await this.multiAgentService.processMessage(
          user.id,
          message,
          user as UserProfile,
          user.preferredLanguage as 'en' | 'es'
        );
        response = result.content;
        logger.info({ 
          userId: ctx.from, 
          multiAgentUsed: result.multiAgentUsed,
          executionTime: result.executionTime,
          success: result.success 
        }, '[MULTI_AGENT] Workflow completed');
      } else {
        logger.info({ userId: ctx.from }, '[SINGLE_AGENT] Using single agent system');
        const aiResponse = await this.aiAgent.processMessage({
          userId: user.id,
          message,
          userProfile: user as UserProfile
        });
        response = aiResponse.content;
      }

      await flowDynamic(response);

    } catch (error) {
      logger.error({ userId: ctx.from, error }, '[MAIN_FLOW] Error processing message');
      const lang = user?.preferredLanguage || 'en';
      const errorMessage = lang === 'es' 
        ? 'Disculpa, estoy teniendo algunos problemas técnicos. ¿Puedes intentarlo de nuevo?'
        : 'Sorry, I\'m having some technical issues. Can you please try again?';
      await flowDynamic(errorMessage);
    }
  }

  createFlow() {
    return addKeyword(EVENTS.WELCOME)
      .addAction(async (ctx, { state, gotoFlow }) => {
        // Step 1: Get or create user
        const [user] = await this.database.query
          .select()
          .from(users)
          .where(eq(users.phoneNumber, ctx.from))
          .limit(1);

        if (user && user.onboardingCompleted) {
          // User has completed onboarding, proceed to the main conversation handler
          logger.info({ userId: ctx.from }, '[ROUTER] User has completed onboarding, proceeding to main flow');
          return;
        }

        // New user or onboarding not completed, redirect to OnboardingFlow
        logger.info({ userId: ctx.from }, '[ROUTER] Onboarding not completed, redirecting to OnboardingFlow');
        const onboardingFlow = container.resolve(OnboardingFlow);
        return gotoFlow(onboardingFlow.createFlow());
      })
      .addAnswer(
        ' ', // This will capture any message from users who have completed onboarding
        { capture: true },
        async (ctx, { flowDynamic, state }) => {
          await this.handleConversation(ctx, flowDynamic, state);
        }
      );
  }
}
