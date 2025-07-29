import { z } from 'zod';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { container } from 'tsyringe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

const CompleteOnboardingSchema = z.object({
  userId: z.string().uuid().optional(), // Will be injected by AI Agent
  name: z.string().min(1, "Name is required"),
  age: z.number().min(13).max(100, "Age must be between 13 and 100"),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyFrequency: z.number().min(0).max(7, "Weekly frequency must be between 0 and 7 days"),
  mainGoal: z.string().min(1, "Main goal is required"),
  injuries: z.string().optional(),
  // Baseline run data for VDOT calculation
  lastRunDistance: z.number().optional(), // in km
  lastRunTime: z.number().optional(), // in seconds
  lastRunPace: z.string().optional(), // e.g., "5:20" min/km
  confirmationMessage: z.string().optional()
});

export function createOnboardingCompleterTool(): ToolFunction {
  return {
    name: 'complete_onboarding',
    description: 'Complete user onboarding by saving all collected profile information. ONLY call this when you have ALL required fields: name, age, experienceLevel, weeklyFrequency, and mainGoal. This marks the onboarding as complete.',
    parameters: CompleteOnboardingSchema,
    
    execute: async (params: z.infer<typeof CompleteOnboardingSchema>) => {
      const {
        name, age, experienceLevel, weeklyFrequency, mainGoal, injuries,
        lastRunDistance, lastRunTime, lastRunPace, confirmationMessage, userId
      } = params;

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

        // Generate completion message with immediate value
        const completionMessage = updatedUser.preferredLanguage === 'es'
          ? `¡Perfecto, ${name}! 🎉 Tu perfil está completo:

📋 **Tu Información:**
• Edad: ${age} años
• Nivel: ${experienceLevel === 'beginner' ? 'Principiante' : experienceLevel === 'intermediate' ? 'Intermedio' : 'Avanzado'}
• Frecuencia: ${weeklyFrequency} días por semana
• Objetivo: ${mainGoal}
${injuries ? `• Consideraciones: ${injuries}` : ''}

🚀 **¡Ahora voy a crear tu plan de entrenamiento personalizado!**
Dame un momento mientras genero tu programa específico para alcanzar tu meta...`
          : `Perfect, ${name}! 🎉 Your profile is complete:

📋 **Your Information:**
• Age: ${age} years
• Level: ${experienceLevel}
• Frequency: ${weeklyFrequency} days per week
• Goal: ${mainGoal}
${injuries ? `• Considerations: ${injuries}` : ''}

🚀 **Now I'm going to create your personalized training plan!**
Give me a moment while I generate your specific program to reach your goal...`;

        // Trigger training plan generation
        console.log(`🎯 [ONBOARDING_COMPLETER] Triggering training plan generation for user ${userId}`);

        // Extract target race from mainGoal
        const targetRace = extractTargetRace(mainGoal);

        // This will be handled by the AI agent calling generate_training_plan tool
        const planGenerationHint = updatedUser.preferredLanguage === 'es'
          ? `\n\n🤖 **Instrucción para el sistema:** Ahora llama a la función generate_training_plan con los siguientes parámetros:
- userId: ${userId}
- targetRace: ${targetRace}
- currentFitnessLevel: ${experienceLevel}
- weeklyFrequency: ${weeklyFrequency}
- generateImmediateWeek: true`
          : `\n\n🤖 **System instruction:** Now call the generate_training_plan function with these parameters:
- userId: ${userId}
- targetRace: ${targetRace}
- currentFitnessLevel: ${experienceLevel}
- weeklyFrequency: ${weeklyFrequency}
- generateImmediateWeek: true`;

        return {
          success: true,
          message: completionMessage + planGenerationHint,
          userProfile: {
            name,
            age: updatedUser.age,
            experienceLevel: updatedUser.experienceLevel,
            weeklyFrequency: updatedUser.weeklyMileage,
            mainGoal: updatedUser.onboardingGoal,
            injuries: updatedUser.injuryHistory,
            onboardingCompleted: true
          },
          shouldGeneratePlan: true,
          planParams: {
            userId,
            targetRace,
            currentFitnessLevel: experienceLevel,
            weeklyFrequency,
            generateImmediateWeek: true
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

/**
 * Extract target race from user's main goal text
 */
function extractTargetRace(mainGoal: string): '5k' | '10k' | 'half_marathon' | 'marathon' {
  const goal = mainGoal.toLowerCase();

  if (goal.includes('maratón') || goal.includes('marathon')) {
    if (goal.includes('medio') || goal.includes('half') || goal.includes('21k')) {
      return 'half_marathon';
    }
    return 'marathon';
  }

  if (goal.includes('10k') || goal.includes('10 k')) {
    return '10k';
  }

  if (goal.includes('5k') || goal.includes('5 k')) {
    return '5k';
  }

  // Default to 10k for general goals
  return '10k';
}
