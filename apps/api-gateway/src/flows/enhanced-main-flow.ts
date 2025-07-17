
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

  private mapUserToUserProfile(user: typeof users.$inferSelect): UserProfile {
    return {
      ...user,
      age: user.age ?? undefined,
      goalRace: user.goalRace ?? undefined,
      experienceLevel: user.experienceLevel ?? undefined,
      injuryHistory: user.injuryHistory ?? undefined,
      weeklyMileage: user.weeklyMileage ? parseFloat(user.weeklyMileage) : undefined,
      timezone: user.timezone ?? undefined,
      // Ensure all properties of UserProfile are covered, even if optional
      // and handle potential nulls from DB by converting to undefined
    } as UserProfile;
  }

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

      const userProfile = this.mapUserToUserProfile(user);

      const shouldUseMultiAgent = this.multiAgentService.shouldUseMultiAgent(message);
      let response: string;

      if (shouldUseMultiAgent) {
        logger.info({ userId: ctx.from }, '[MULTI_AGENT] Using multi-agent system');
        const result = await this.multiAgentService.processMessage(
          user.id,
          message,
          userProfile,
          user.preferredLanguage as 'en' | 'es'
        );
        response = result.response;
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
          userProfile: userProfile
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
        logger.info({ userId: ctx.from }, '[ROUTER_START] Evaluating user for onboarding');
        
        const [user] = await this.database.query
          .select()
          .from(users)
          .where(eq(users.phoneNumber, ctx.from))
          .limit(1);

        if (!user) {
          logger.info({ userId: ctx.from }, '[ROUTER] User not found. Redirecting to OnboardingFlow.');
          const onboardingFlow = container.resolve(OnboardingFlow);
          return gotoFlow(onboardingFlow.createFlow());
        }

        logger.info({ 
          userId: ctx.from, 
          onboardingCompleted: user.onboardingCompleted 
        }, '[ROUTER] User found. Checking onboarding status.');

        if (user.onboardingCompleted) {
          logger.info({ userId: ctx.from }, '[ROUTER] Onboarding COMPLETED. Proceeding to main conversation.');
          return; // Continue to the main conversation handler in this flow
        }

        logger.info({ userId: ctx.from }, '[ROUTER] Onboarding NOT COMPLETED. Redirecting to OnboardingFlow.');
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
