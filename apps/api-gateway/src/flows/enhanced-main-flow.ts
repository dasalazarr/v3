
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

        // 🚨 MANDATORY ONBOARDING ENFORCEMENT - ALL USERS MUST COMPLETE ONBOARDING
        if (!user.onboardingCompleted) {
          logger.info({
            userId: ctx.from,
            subscriptionStatus: user.subscriptionStatus,
            reason: 'MANDATORY_ONBOARDING_REQUIRED'
          }, '[ROUTER] Onboarding not completed - MANDATORY for all users, redirecting to OnboardingFlow');

          // Send appropriate message based on subscription status
          let onboardingMessage;
          if (user.subscriptionStatus === 'premium') {
            onboardingMessage = user.preferredLanguage === 'es'
              ? '¡Bienvenido a Andes Premium! 🎉 Primero necesitamos conocerte mejor para personalizar tu entrenamiento. Comencemos con tu perfil:'
              : 'Welcome to Andes Premium! 🎉 First we need to get to know you better to personalize your training. Let\'s start with your profile:';
          } else if (user.subscriptionStatus === 'pending_payment') {
            onboardingMessage = user.preferredLanguage === 'es'
              ? 'Tu pago está procesándose. Mientras tanto, configuremos tu perfil para tener todo listo cuando se active tu premium:'
              : 'Your payment is being processed. Meanwhile, let\'s set up your profile so everything is ready when your premium activates:';
          } else {
            onboardingMessage = user.preferredLanguage === 'es'
              ? '¡Bienvenido a Andes! 🏃‍♂️ Para brindarte la mejor experiencia, necesitamos conocerte mejor. Comencemos:'
              : 'Welcome to Andes! 🏃‍♂️ To give you the best experience, we need to get to know you better. Let\'s start:';
          }

          await flowDynamic(onboardingMessage);
          const onboardingFlow = container.resolve(OnboardingFlow);
          return gotoFlow(onboardingFlow.createFlow());
        }

        // Handle users who have completed onboarding
        if (user.subscriptionStatus === 'premium') {
          const premiumReadyMessage = user.preferredLanguage === 'es'
            ? '¡Perfecto! Ya tienes tu perfil completo y Andes Premium activo. 🎉 ¿En qué puedo ayudarte hoy?'
            : 'Perfect! You have your complete profile and Andes Premium active. 🎉 How can I help you today?';
          await flowDynamic(premiumReadyMessage);
          // Continue to main flow processing
        } else if (user.subscriptionStatus === 'pending_payment') {
          const pendingMessage = user.preferredLanguage === 'es'
            ? 'Tu perfil está completo. Tu pago está pendiente - una vez confirmado tendrás acceso completo a Andes Premium.'
            : 'Your profile is complete. Your payment is pending - once confirmed you\'ll have full access to Andes Premium.';
          await flowDynamic(pendingMessage);
          return;
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
