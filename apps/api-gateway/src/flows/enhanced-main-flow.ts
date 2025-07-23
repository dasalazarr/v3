
import { injectable, inject, container } from 'tsyringe';
import { addKeyword, EVENTS } from '@builderbot/bot';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { LanguageDetector } from '@running-coach/shared';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { VectorMemory } from '@running-coach/vector-memory';
import logger from '../services/logger-service.js';
import { OnboardingFlow } from './onboarding-flow.js';
import { FreemiumService } from '../services/freemium-service.js';

@injectable()
export class EnhancedMainFlow {
  constructor(
    @inject('AIAgent') private aiAgent: AIAgent,
    @inject('Database') private database: Database,
    @inject('VectorMemory') private vectorMemory: VectorMemory,
    @inject('LanguageDetector') private languageDetector: LanguageDetector
  ) {}

  private async getOrCreateUser(phoneNumber: string, message: string) {
    try {
      const [user] = await this.database.query
        .select()
        .from(users)
        .where(eq(users.phoneNumber, phoneNumber))
        .limit(1);

      if (user) {
        logger.info({
          userId: phoneNumber,
          subscriptionStatus: user.subscriptionStatus,
          onboardingCompleted: user.onboardingCompleted
        }, '[DB_FETCH] Existing user found');
        return user;
      }

      // Detect language for new users
      const lang = (await this.languageDetector.detect(message)) as 'es' | 'en';
      logger.info({ userId: phoneNumber, lang }, '[DB_CREATE] Creating new user record');

      // Create new user with proper defaults and validation
      const [newUser] = await this.database.query
        .insert(users)
        .values({
          phoneNumber,
          preferredLanguage: lang,
          subscriptionStatus: 'free', // Explicit default
          onboardingCompleted: false,
          weeklyMessageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      logger.info({ userId: phoneNumber, newUserId: newUser.id }, '[DB_CREATE] New user created successfully');
      return newUser;
    } catch (error) {
      logger.error({ userId: phoneNumber, error }, '[DB_ERROR] Failed to get or create user');
      throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  createFlow() {
    return addKeyword(EVENTS.WELCOME)
      .addAction(async (ctx, { gotoFlow, state, flowDynamic }) => {
        const user = await this.getOrCreateUser(ctx.from, ctx.body);

        await state.update({
          lang: user.preferredLanguage,
          userId: user.id
        });

        // Check for premium/free intent from landing page
        const message = ctx.body.toLowerCase();
        const isPremiumIntent = message.includes('premium') || message.includes('upgrade') || message.includes('paid');
        const isFreeIntent = message.includes('free') || message.includes('trial') || message.includes('start');

        // Handle premium intent with data safety
        if (isPremiumIntent && (user.subscriptionStatus === 'free' || user.subscriptionStatus === 'canceled')) {
          logger.info({
            userId: ctx.from,
            currentStatus: user.subscriptionStatus
          }, '[PREMIUM_INTENT] User wants premium, processing upgrade');

          try {
            // Update user to pending_payment with transaction safety
            const [updatedUser] = await this.database.query
              .update(users)
              .set({
                subscriptionStatus: 'pending_payment',
                updatedAt: new Date()
              })
              .where(eq(users.id, user.id))
              .returning();

            if (!updatedUser) {
              throw new Error('Failed to update user subscription status');
            }

            // Generate and send Gumroad link
            const freemiumService = container.resolve<FreemiumService>('FreemiumService');
            const gumroadUrl = freemiumService.generatePaymentLink(updatedUser);

            const premiumMessage = user.preferredLanguage === 'es'
              ? `¡Perfecto! 🏃‍♂️ Para acceder a Andes Premium, completa tu pago aquí: ${gumroadUrl}\n\nUna vez completado el pago, regresa aquí para comenzar tu entrenamiento personalizado.`
              : `Perfect! 🏃‍♂️ To access Andes Premium, complete your payment here: ${gumroadUrl}\n\nOnce payment is complete, return here to start your personalized training.`;

            await flowDynamic(premiumMessage);
            logger.info({ userId: ctx.from }, '[PREMIUM_INTENT] Payment link sent successfully');
            return;
          } catch (error) {
            logger.error({ userId: ctx.from, error }, '[PREMIUM_INTENT] Failed to process premium upgrade');
            const errorMessage = user.preferredLanguage === 'es'
              ? 'Lo siento, hubo un error procesando tu solicitud. Por favor intenta de nuevo.'
              : 'Sorry, there was an error processing your request. Please try again.';
            await flowDynamic(errorMessage);
            return;
          }
        }

        // Handle users who already have premium or pending payment
        if (user.subscriptionStatus === 'premium') {
          const alreadyPremiumMessage = user.preferredLanguage === 'es'
            ? '¡Ya tienes Andes Premium! 🎉 Puedes comenzar a entrenar enviando cualquier mensaje.'
            : 'You already have Andes Premium! 🎉 You can start training by sending any message.';
          await flowDynamic(alreadyPremiumMessage);
          return;
        }

        if (user.subscriptionStatus === 'pending_payment') {
          const pendingMessage = user.preferredLanguage === 'es'
            ? 'Tu pago está pendiente. Una vez completado, recibirás una confirmación y podrás comenzar con Andes Premium.'
            : 'Your payment is pending. Once completed, you\'ll receive confirmation and can start with Andes Premium.';
          await flowDynamic(pendingMessage);
          return;
        }

        if (!user.onboardingCompleted) {
          logger.info({ userId: ctx.from }, '[ROUTER] Onboarding not completed, redirecting to OnboardingFlow');
          const onboardingFlow = container.resolve(OnboardingFlow);
          return gotoFlow(onboardingFlow.createFlow());
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
