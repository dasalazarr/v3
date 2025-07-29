import { z } from 'zod';
import { Database, users } from '@running-coach/database';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { eq } from 'drizzle-orm';

const CompleteOnboardingSchema = z.object({
  userId: z.string().uuid(),
  age: z.number().min(13).max(100),
  gender: z.enum(['male', 'female', 'other']),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  goalRace: z.enum(['5k', '10k', 'half_marathon', 'marathon', 'ultra']),
  weeklyMileage: z.number().min(0).max(200).optional(),
  injuryHistory: z.array(z.object({
    type: z.string(),
    severity: z.enum(['minor', 'moderate', 'severe']),
    recovered: z.boolean()
  })).optional()
});

const CheckOnboardingStatusSchema = z.object({
  userId: z.string().uuid()
});

export function createOnboardingCompleterTool(database: Database): ToolFunction {
  return {
    name: 'complete_onboarding',
    description: 'Complete user onboarding by saving their profile information to the database',
    parameters: CompleteOnboardingSchema,
    execute: async (params) => {
      try {
        console.log(`🎯 [ONBOARDING_COMPLETER] Completing onboarding for user ${params.userId}`);
        
        const updateData = {
          age: params.age,
          gender: params.gender,
          experienceLevel: params.experienceLevel,
          goalRace: params.goalRace,
          weeklyMileage: params.weeklyMileage?.toString(),
          injuryHistory: params.injuryHistory ? JSON.stringify(params.injuryHistory) : null,
          onboardingCompleted: true,
          updatedAt: new Date()
        };

        const [updatedUser] = await database.query
          .update(users)
          .set(updateData)
          .where(eq(users.id, params.userId))
          .returning();

        if (!updatedUser) {
          throw new Error('User not found');
        }

        console.log(`✅ [ONBOARDING_COMPLETER] Onboarding completed for user ${params.userId}`);

        return {
          success: true,
          message: '¡Perfecto! Tu perfil ha sido guardado exitosamente. Ahora voy a generar tu plan de entrenamiento personalizado.',
          user: updatedUser,
          shouldGenerateTrainingPlan: true
        };

      } catch (error) {
        console.error('❌ [ONBOARDING_COMPLETER] Error completing onboarding:', error);
        return {
          success: false,
          error: 'Failed to complete onboarding. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

export function createOnboardingStatusChecker(database: Database): ToolFunction {
  return {
    name: 'check_onboarding_status',
    description: 'Check if user has completed onboarding and what information is missing',
    parameters: CheckOnboardingStatusSchema,
    execute: async (params) => {
      try {
        console.log(`🔍 [ONBOARDING_STATUS] Checking onboarding status for user ${params.userId}`);
        
        const [user] = await database.query
          .select()
          .from(users)
          .where(eq(users.id, params.userId))
          .limit(1);

        if (!user) {
          return {
            completed: false,
            missing: ['user_not_found'],
            message: 'Usuario no encontrado'
          };
        }

        const missing = [];
        if (!user.age) missing.push('age');
        if (!user.gender) missing.push('gender');
        if (!user.experienceLevel) missing.push('experienceLevel');
        if (!user.goalRace) missing.push('goalRace');

        const completed = user.onboardingCompleted && missing.length === 0;

        console.log(`📊 [ONBOARDING_STATUS] User ${params.userId} - Completed: ${completed}, Missing: ${missing.join(', ')}`);

        return {
          completed,
          missing,
          user: {
            age: user.age,
            gender: user.gender,
            experienceLevel: user.experienceLevel,
            goalRace: user.goalRace,
            weeklyMileage: user.weeklyMileage,
            onboardingCompleted: user.onboardingCompleted
          },
          message: completed 
            ? 'Onboarding completado' 
            : `Faltan los siguientes datos: ${missing.join(', ')}`
        };

      } catch (error) {
        console.error('❌ [ONBOARDING_STATUS] Error checking status:', error);
        return {
          completed: false,
          error: 'Failed to check onboarding status',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}
