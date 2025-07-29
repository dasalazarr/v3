import { z } from 'zod';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { container } from 'tsyringe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

const CompleteOnboardingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(13).max(100, "Age must be between 13 and 100"),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyFrequency: z.number().min(0).max(7, "Weekly frequency must be between 0 and 7 days"),
  mainGoal: z.string().min(1, "Main goal is required"),
  injuries: z.string().optional(),
  confirmationMessage: z.string().optional()
});

export function createOnboardingCompleterTool(): ToolFunction {
  return {
    name: 'complete_onboarding',
    description: 'Complete user onboarding by saving all collected profile information. ONLY call this when you have ALL required fields: name, age, experienceLevel, weeklyFrequency, and mainGoal. This marks the onboarding as complete.',
    parameters: CompleteOnboardingSchema,
    
    execute: async (params: z.infer<typeof CompleteOnboardingSchema> & { userId?: string }) => {
      const { name, age, experienceLevel, weeklyFrequency, mainGoal, injuries, confirmationMessage, userId } = params;
      
      if (!userId) {
        throw new Error('User ID is required to complete onboarding');
      }

      console.log(`🎯 [ONBOARDING_COMPLETER] Completing onboarding for user ${userId}:`, {
        name,
        age,
        experienceLevel,
        weeklyFrequency,
        mainGoal,
        injuries: injuries ? 'provided' : 'none'
      });

      const database = container.resolve<Database>('Database');

      // Get current user for language preference
      const [currentUser] = await database.query
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      try {

        // Update user with onboarding data
        const [updatedUser] = await database.query
          .update(users)
          .set({
            // Basic info
            age: age,
            experienceLevel: experienceLevel as any,
            weeklyMileage: weeklyFrequency.toString(),
            onboardingGoal: mainGoal as any,
            injuryHistory: injuries || null,

            // Mark onboarding as complete
            onboardingCompleted: true,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning();

        if (!updatedUser) {
          throw new Error('Failed to update user onboarding data');
        }

        console.log(`✅ [ONBOARDING_COMPLETER] Successfully completed onboarding for user ${userId}`);
        console.log(`✅ [ONBOARDING_COMPLETER] User profile:`, {
          name,
          age: updatedUser.age,
          experienceLevel: updatedUser.experienceLevel,
          weeklyFrequency: updatedUser.weeklyMileage,
          mainGoal: updatedUser.onboardingGoal,
          injuries: updatedUser.injuryHistory
        });

        // Generate completion message
        const completionMessage = updatedUser.preferredLanguage === 'es'
          ? `¡Perfecto, ${name}! 🎉 Tu perfil está completo:

📋 **Tu Información:**
• Edad: ${age} años
• Nivel: ${experienceLevel === 'beginner' ? 'Principiante' : experienceLevel === 'intermediate' ? 'Intermedio' : 'Avanzado'}
• Frecuencia: ${weeklyFrequency} días por semana
• Objetivo: ${mainGoal}
${injuries ? `• Consideraciones: ${injuries}` : ''}

¡Ahora estoy listo para ser tu coach personalizado! 🏃‍♂️ ¿En qué puedo ayudarte hoy?`
          : `Perfect, ${name}! 🎉 Your profile is complete:

📋 **Your Information:**
• Age: ${age} years
• Level: ${experienceLevel}
• Frequency: ${weeklyFrequency} days per week
• Goal: ${mainGoal}
${injuries ? `• Considerations: ${injuries}` : ''}

Now I'm ready to be your personalized coach! 🏃‍♂️ How can I help you today?`;

        return {
          success: true,
          message: completionMessage,
          userProfile: {
            name,
            age: updatedUser.age,
            experienceLevel: updatedUser.experienceLevel,
            weeklyFrequency: updatedUser.weeklyMileage,
            mainGoal: updatedUser.onboardingGoal,
            injuries: updatedUser.injuryHistory,
            onboardingCompleted: true
          }
        };

      } catch (error) {
        console.error(`❌ [ONBOARDING_COMPLETER] Error completing onboarding for user ${userId}:`, error);
        
        const errorMessage = currentUser?.preferredLanguage === 'es'
          ? 'Lo siento, hubo un error guardando tu información. Por favor intenta de nuevo.'
          : 'Sorry, there was an error saving your information. Please try again.';
        
        return {
          success: false,
          message: errorMessage,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

/**
 * Tool to check which onboarding fields are missing for a user
 */
const CheckOnboardingStatusSchema = z.object({
  userId: z.string()
});

export function createOnboardingStatusChecker(): ToolFunction {
  return {
    name: 'check_onboarding_status',
    description: 'Check which onboarding fields are missing for the current user. Use this to determine what information you still need to collect.',
    parameters: CheckOnboardingStatusSchema,
    
    execute: async (params: z.infer<typeof CheckOnboardingStatusSchema>) => {
      const { userId } = params;
      
      console.log(`🔍 [ONBOARDING_STATUS] Checking onboarding status for user ${userId}`);

      try {
        const database = container.resolve<Database>('Database');
        
        const [user] = await database.query
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          throw new Error('User not found');
        }

        const missingFields = [];
        const collectedFields = [];

        // Check required fields
        if (!user.age) missingFields.push('age');
        else collectedFields.push('age');

        if (!user.experienceLevel) missingFields.push('experienceLevel');
        else collectedFields.push('experienceLevel');

        if (user.weeklyMileage === null || user.weeklyMileage === undefined) missingFields.push('weeklyFrequency');
        else collectedFields.push('weeklyFrequency');

        if (!user.onboardingGoal) missingFields.push('mainGoal');
        else collectedFields.push('mainGoal');

        // Injuries is optional, but track if provided
        if (user.injuryHistory) collectedFields.push('injuries');

        const isComplete = missingFields.length === 0;

        console.log(`🔍 [ONBOARDING_STATUS] User ${userId} status:`, {
          isComplete,
          missingFields,
          collectedFields
        });

        return {
          isComplete,
          missingFields,
          collectedFields,
          onboardingCompleted: user.onboardingCompleted
        };

      } catch (error) {
        console.error(`❌ [ONBOARDING_STATUS] Error checking status for user ${userId}:`, error);
        throw error;
      }
    }
  };
}
