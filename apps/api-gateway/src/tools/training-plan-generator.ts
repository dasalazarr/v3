import { z } from 'zod';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { container } from 'tsyringe';
import { Database, users, trainingPlans, workouts } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { VDOTCalculator, PlanBuilder } from '@running-coach/plan-generator';

const GenerateTrainingPlanSchema = z.object({
  userId: z.string().uuid(),
  targetRace: z.enum(['5k', '10k', 'half_marathon', 'marathon']),
  targetDate: z.string().optional(), // ISO date string
  currentFitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyFrequency: z.number().min(2).max(7),
  baselineDistance: z.number().optional(), // Recent run distance in km
  baselineTime: z.number().optional(), // Recent run time in seconds
  generateImmediateWeek: z.boolean().default(true)
});

export function createTrainingPlanGeneratorTool(): ToolFunction {
  return {
    name: 'generate_training_plan',
    description: 'Generate a personalized training plan based on user profile and goals. Creates both the overall plan and immediate first week workouts. Call this after completing onboarding to provide immediate value.',
    parameters: GenerateTrainingPlanSchema,
    
    execute: async (params: z.infer<typeof GenerateTrainingPlanSchema>) => {
      const { 
        userId, 
        targetRace, 
        targetDate, 
        currentFitnessLevel, 
        weeklyFrequency, 
        baselineDistance, 
        baselineTime,
        generateImmediateWeek 
      } = params;
      
      console.log(`🏃 [TRAINING_PLAN_GENERATOR] Generating plan for user ${userId}:`, {
        targetRace,
        currentFitnessLevel,
        weeklyFrequency,
        baselineDistance,
        baselineTime
      });

      try {
        const database = container.resolve<Database>('Database');
        
        // Get user details
        const [user] = await database.query
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          throw new Error('User not found');
        }

        // Calculate VDOT from baseline run if provided
        let estimatedVDOT = 35; // Default for beginners
        if (baselineDistance && baselineTime) {
          // Convert km to miles for VDOT calculation
          const distanceMiles = baselineDistance * 0.621371;
          estimatedVDOT = VDOTCalculator.calculateVDOTFromRace(distanceMiles, baselineTime);
        } else {
          // Estimate based on experience level
          const vdotByLevel: Record<string, number> = {
            beginner: 35,
            intermediate: 45,
            advanced: 55
          };
          estimatedVDOT = vdotByLevel[currentFitnessLevel] || 35;
        }

        // Calculate training paces
        const paces = VDOTCalculator.getPaces(estimatedVDOT);

        // Determine plan duration based on target race
        const planDurations: Record<string, number> = {
          '5k': 8,
          '10k': 10,
          'half_marathon': 12,
          'marathon': 16
        };
        const totalWeeks = planDurations[targetRace] || 12;

        // Create training plan
        const [trainingPlan] = await database.query
          .insert(trainingPlans)
          .values({
            userId,
            vdot: estimatedVDOT.toString(),
            weeklyFrequency,
            targetRace,
            targetDate: targetDate ? new Date(targetDate) : null,
            currentWeek: 1,
            totalWeeks,
            paces: {
              easy: Math.round(paces.easy * 60), // Convert to seconds per km
              marathon: Math.round(paces.marathon * 60),
              threshold: Math.round(paces.threshold * 60),
              interval: Math.round(paces.interval * 60),
              repetition: Math.round(paces.repetition * 60)
            },
            isActive: true
          })
          .returning();

        console.log(`✅ [TRAINING_PLAN_GENERATOR] Created training plan ${trainingPlan.id} for user ${userId}`);

        // Generate first week workouts if requested
        let firstWeekWorkouts = [];
        if (generateImmediateWeek) {
          const planRequest = {
            userId,
            currentVDOT: estimatedVDOT,
            targetRace,
            weeklyFrequency,
            experienceLevel: currentFitnessLevel
          };

          const weekWorkouts = PlanBuilder.generateWeekWorkouts(
            {
              id: trainingPlan.id,
              userId,
              vdot: estimatedVDOT,
              weeklyFrequency,
              targetRace,
              targetDate: targetDate ? new Date(targetDate) : undefined,
              currentWeek: 1,
              totalWeeks,
              paces,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            1,
            planRequest
          );

          for (const workout of weekWorkouts) {
            const [createdWorkout] = await database.query
              .insert(workouts)
              .values({
                userId,
                planId: trainingPlan.id,
                week: 1,
                day: workout.day,
                type: workout.type,
                distance: workout.distance?.toString(),
                duration: workout.duration,
                targetPace: workout.targetPace,
                description: workout.description,
                completed: false
              })
              .returning();

            firstWeekWorkouts.push(createdWorkout);
          }

          console.log(`✅ [TRAINING_PLAN_GENERATOR] Generated ${firstWeekWorkouts.length} workouts for week 1`);
        }

        // Generate user-friendly plan summary
        const language = user.preferredLanguage || 'es';
        const planSummary = generatePlanSummary(trainingPlan, firstWeekWorkouts, language);

        return {
          success: true,
          message: planSummary,
          trainingPlan: {
            id: trainingPlan.id,
            vdot: estimatedVDOT,
            targetRace,
            totalWeeks,
            weeklyFrequency,
            paces: trainingPlan.paces
          },
          firstWeekWorkouts: firstWeekWorkouts.map(w => ({
            day: w.day,
            type: w.type,
            distance: w.distance,
            duration: w.duration,
            description: w.description
          }))
        };

      } catch (error) {
        console.error(`❌ [TRAINING_PLAN_GENERATOR] Error generating plan for user ${userId}:`, error);
        
        return {
          success: false,
          message: 'Lo siento, hubo un error generando tu plan de entrenamiento. Por favor intenta de nuevo.',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

function generatePlanSummary(
  plan: any,
  workouts: any[],
  language: 'es' | 'en'
): string {
  const raceNames: Record<string, Record<string, string>> = {
    es: {
      '5k': '5K',
      '10k': '10K',
      'half_marathon': 'Media Maratón',
      'marathon': 'Maratón'
    },
    en: {
      '5k': '5K',
      '10k': '10K',
      'half_marathon': 'Half Marathon',
      'marathon': 'Marathon'
    }
  };

  if (language === 'es') {
    let summary = `🎉 ¡Tu plan de entrenamiento para ${raceNames.es[plan.targetRace] || plan.targetRace} está listo!\n\n`;
    summary += `📊 **Detalles del Plan:**\n`;
    summary += `• Duración: ${plan.totalWeeks} semanas\n`;
    summary += `• Frecuencia: ${plan.weeklyFrequency} días por semana\n`;
    summary += `• VDOT estimado: ${Math.round(parseFloat(plan.vdot))}\n\n`;
    
    if (workouts.length > 0) {
      summary += `🗓️ **Tu primera semana:**\n`;
      workouts.forEach((workout, index) => {
        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        summary += `${dayNames[workout.day - 1]}: ${workout.description}\n`;
      });
      summary += `\n💡 ¡Comienza mañana y vamos por tu meta! 🏃‍♂️`;
    }
    
    return summary;
  } else {
    let summary = `🎉 Your ${raceNames.en[plan.targetRace] || plan.targetRace} training plan is ready!\n\n`;
    summary += `📊 **Plan Details:**\n`;
    summary += `• Duration: ${plan.totalWeeks} weeks\n`;
    summary += `• Frequency: ${plan.weeklyFrequency} days per week\n`;
    summary += `• Estimated VDOT: ${Math.round(parseFloat(plan.vdot))}\n\n`;
    
    if (workouts.length > 0) {
      summary += `🗓️ **Your first week:**\n`;
      workouts.forEach((workout, index) => {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        summary += `${dayNames[workout.day - 1]}: ${workout.description}\n`;
      });
      summary += `\n💡 Start tomorrow and let's reach your goal! 🏃‍♂️`;
    }
    
    return summary;
  }
}
