import { addKeyword, EVENTS } from '@builderbot/bot';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { Database } from '@running-coach/database';
import { VectorMemory } from '@running-coach/vector-memory';
import { users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { LanguageDetector, i18nService, templateEngine } from '@running-coach/shared';
import { LanguageCommandMiddleware } from '../middleware/language-commands.js';

export class EnhancedMainFlow {
  private languageCommandMiddleware: LanguageCommandMiddleware;

  constructor(
    private aiAgent: AIAgent,
    private database: Database,
    private vectorMemory: VectorMemory,
    private languageDetector: LanguageDetector
  ) {
    this.languageCommandMiddleware = new LanguageCommandMiddleware(database);
  }

  public createFlow() {
    return addKeyword(EVENTS.WELCOME)
      .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
        try {
          const phoneNumber = ctx.from;
          const message = ctx.body;
          console.log(`📱 New message from ${phoneNumber}: ${message}`);

          // Get or create user
          const user = await this.getOrCreateUser(phoneNumber, message);
          
          // Verificar si es un comando de idioma
          if (process.env.LANG_DETECTION === 'true') {
            const commandResult = await this.languageCommandMiddleware.process(message, user.id);
            if (commandResult.isCommand && commandResult.processedMessage) {
              // Es un comando de idioma, responder directamente
              await flowDynamic(commandResult.processedMessage);
              return;
            }
          }
          
          // Process message with AI agent
          console.log(`🌐 Processing message with user language: ${user.preferredLanguage}`);
          const response = await this.aiAgent.processMessage({
            userId: user.id,
            message: ctx.body,
            userProfile: user
          });

          // Send AI response
          await flowDynamic(response.content);

          // Handle tool calls if any
          if (response.toolCalls && response.toolCalls.length > 0) {
            for (const toolCall of response.toolCalls) {
              if (toolCall.result.success) {
                const toolMessage = this.formatToolResponse(toolCall);
                if (toolMessage) {
                  await flowDynamic(toolMessage);
                }
              }
            }
          }

        } catch (error) {
          console.error(`❌ Error processing message from ${ctx.from}:`, error);
          
          // Fallback response
          const fallbackMessage = this.getFallbackMessage(ctx.body);
          await flowDynamic(fallbackMessage);
        }
      });
  }

  private async getOrCreateUser(phoneNumber: string, message?: string): Promise<any> {
    try {
      // Try to find existing user
      const existingUser = await this.database.query.select()
        .from(users)
        .where(eq(users.phoneNumber, phoneNumber))
        .limit(1);

      if (existingUser.length > 0) {
        // Update last active date
        await this.database.query.update(users)
          .set({ updatedAt: new Date() })
          .where(eq(users.id, existingUser[0].id))
          .execute();
        
        return existingUser[0];
      }

      // Detect language if message is provided
      let detectedLanguage: 'en' | 'es' = 'es'; // Default to Spanish
      if (message && process.env.LANG_DETECTION === 'true') {
        const detected = this.languageDetector.detect(message);
        // Solo aceptamos 'en' o 'es' como valores válidos
        detectedLanguage = detected === 'en' ? 'en' : 'es';
        console.log(`🌐 Detected language for new user: ${detectedLanguage}`);
      }

      // Create new user
      const newUser = await this.database.query.insert(users).values({
        phoneNumber,
        preferredLanguage: detectedLanguage,
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning()
        .execute();

      console.log(`👤 New user created: ${phoneNumber} with language: ${detectedLanguage}`);
      
      // Store welcome event in vector memory
      await this.vectorMemory.storeConversation(
        newUser[0].id,
        'assistant',
        `New user joined the running coach assistant. Language: ${detectedLanguage}`
      );

      return newUser[0];
    } catch (error) {
      console.error('Error managing user:', error);
      throw error;
    }
  }

  private formatToolResponse(toolCall: any): string | null {
    const { name, result } = toolCall;

    // Obtener el idioma del usuario desde la base de datos
    // Por ahora, usaremos el idioma detectado en el mensaje
    const userLang = result.userLanguage || 'es'; // Fallback a español si no hay idioma

    switch (name) {
      case 'log_run':
        if (result.success) {
          // Usar el motor de plantillas para la respuesta
          return templateEngine.process(
            't("run_logged") \n\n📊 t("run_stats") \n' +
            '🏃‍♂️ t("pace"): {{pace}}/mile \n' +
            '💪 t("effort"): {{effort}}/10 \n' +
            '🎯 t("vdot"): {{vdot}}',
            {
              pace: result.stats?.pace || '-',
              effort: result.stats?.effort || '-',
              vdot: result.stats?.estimatedVDOT || '-'
            },
            userLang
          );
        }
        break;

      case 'update_training_plan':
        if (result.success) {
          const details = result.details || {};
          const paces = details.newPaces || {};
          
          // Crear un array de workouts formateados para la plantilla
          const formattedWorkouts = details.nextWorkouts ? 
            details.nextWorkouts.map((w: any, i: number) => 
              `${i + 1}. ${w.date}: ${w.type} - ${w.description}`
            ).join('\n') : '';
          
          // Usar el motor de plantillas para la respuesta
          return templateEngine.process(
            '🏃‍♂️ t("plan_updated") \n\n' +
            '📋 t("plan_details") \n' +
            '⏱️ t("duration"): {{duration}} \n' +
            '📅 t("frequency"): {{frequency}} \n\n' +
            '🎯 t("training_paces") \n' +
            '🚶‍♂️ t("easy"): {{easyPace}}/mile \n' +
            '🏃‍♂️ t("tempo"): {{tempoPace}}/mile \n' +
            '💨 t("interval"): {{intervalPace}}/mile \n\n' +
            '📅 t("next_workouts") \n{{workouts}}',
            {
              duration: details.duration || '-',
              frequency: details.frequency || '-',
              easyPace: paces.easy || '-',
              tempoPace: paces.tempo || '-',
              intervalPace: paces.interval || '-',
              workouts: formattedWorkouts
            },
            userLang
          );
        }
        break;
    }

    return null;
  }

  private getFallbackMessage(userMessage: string): string {
    // Detect language for fallback
    const detectedLang = this.languageDetector.detect(userMessage);
    
    // Usar el motor de plantillas con el idioma detectado
    return templateEngine.process(
      't("fallback.message")',
      {}, // No variables needed for this template
      detectedLang
    );
  }
}