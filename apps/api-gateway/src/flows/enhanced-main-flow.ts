import { addKeyword, EVENTS } from '@builderbot/bot';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { Database } from '@running-coach/database';
import { VectorMemory } from '@running-coach/vector-memory';
import { users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

export class EnhancedMainFlow {
  constructor(
    private aiAgent: AIAgent,
    private database: Database,
    private vectorMemory: VectorMemory
  ) {}

  public createFlow() {
    return addKeyword(EVENTS.WELCOME)
      .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
        try {
          const phoneNumber = ctx.from;
          console.log(`📱 New message from ${phoneNumber}: ${ctx.body}`);

          // Get or create user
          const user = await this.getOrCreateUser(phoneNumber);
          
          // Process message with AI agent
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

  private async getOrCreateUser(phoneNumber: string): Promise<any> {
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
          .where(eq(users.id, existingUser[0].id));
        
        return existingUser[0];
      }

      // Create new user
      const newUser = await this.database.query.insert(users).values({
        phoneNumber,
        preferredLanguage: 'es', // Default to Spanish
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log(`👤 New user created: ${phoneNumber}`);
      
      // Store welcome event in vector memory
      await this.vectorMemory.storeConversation(
        newUser[0].id,
        'system',
        `New user joined the running coach assistant`
      );

      return newUser[0];
    } catch (error) {
      console.error('Error managing user:', error);
      throw error;
    }
  }

  private formatToolResponse(toolCall: any): string | null {
    const { name, result } = toolCall;

    switch (name) {
      case 'log_run':
        if (result.success) {
          let message = `✅ ${result.message}`;
          
          if (result.stats) {
            message += `\n\n📊 **Run Stats:**`;
            if (result.stats.pace) {
              message += `\n🏃‍♂️ Pace: ${result.stats.pace}/mile`;
            }
            if (result.stats.effort) {
              message += `\n💪 Effort: ${result.stats.effort}/10`;
            }
            if (result.stats.estimatedVDOT) {
              message += `\n🎯 Current VDOT: ${result.stats.estimatedVDOT}`;
            }
          }
          
          return message;
        }
        break;

      case 'update_training_plan':
        if (result.success) {
          let message = `🏃‍♂️ ${result.message}`;
          
          if (result.details) {
            const details = result.details;
            message += `\n\n📋 **Plan Details:**`;
            
            if (details.duration) {
              message += `\n⏱️ Duration: ${details.duration}`;
            }
            if (details.frequency) {
              message += `\n📅 Frequency: ${details.frequency}`;
            }
            if (details.newPaces) {
              message += `\n\n🎯 **Training Paces:**`;
              message += `\n🚶‍♂️ Easy: ${details.newPaces.easy}/mile`;
              message += `\n🏃‍♂️ Tempo: ${details.newPaces.tempo}/mile`;
              message += `\n💨 Interval: ${details.newPaces.interval}/mile`;
            }
            if (details.nextWorkouts) {
              message += `\n\n📅 **Next Workouts:**`;
              details.nextWorkouts.forEach((workout: any, index: number) => {
                message += `\n${index + 1}. ${workout.date}: ${workout.type} - ${workout.description}`;
              });
            }
          }
          
          return message;
        }
        break;
    }

    return null;
  }

  private getFallbackMessage(userMessage: string): string {
    // Detect language for fallback
    const isSpanish = /[ñáéíóúü]|hola|corr|entrenam|kilómet/i.test(userMessage);
    
    if (isSpanish) {
      return `Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo? 

Puedes contarme sobre:
🏃‍♂️ Tus carreras (ej: "Corrí 5km en 25 minutos")
📋 Planes de entrenamiento
🎯 Objetivos de carrera
💪 Cómo te sientes después de correr

¡Estoy aquí para ayudarte a mejorar tu running!`;
    } else {
      return `Sorry, I had trouble processing your message. Could you try again?

You can tell me about:
🏃‍♂️ Your runs (e.g., "I ran 5K in 25 minutes")
📋 Training plans
🎯 Race goals
💪 How you feel after running

I'm here to help you improve your running!`;
    }
  }
}