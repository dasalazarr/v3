import { z } from 'zod';
import { Database, trainingPlans, workouts } from '@running-coach/database';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { VDOTCalculator, PlanBuilder } from '@running-coach/plan-generator';

const GenerateTrainingPlanSchema = z.object({
  userId: z.string().uuid(),
  targetRace: z.enum(['5k', '10k', 'half_marathon', 'marathon']),
  currentFitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyFrequency: z.number().min(3).max(7).default(3),
  targetDate: z.string().optional(), // ISO date string
  baselineDistance: z.number().optional(), // km
  baselineTime: z.number().optional(), // seconds
  generateImmediateWeek: z.boolean().default(true)
});

export function createTrainingPlanGeneratorTool(database: Database): ToolFunction {
  return {
    name: 'generate_training_plan',
    description: 'Generate a personalized training plan based on user goals and fitness level',
    parameters: GenerateTrainingPlanSchema,
    execute: async (params) => {
      try {
        console.log(`🏃 [TRAINING_PLAN_GENERATOR] Generating plan for user ${params.userId}`);
        
        const {
          userId,
          targetRace,
          currentFitnessLevel,
          weeklyFrequency,
          targetDate,
          baselineDistance,
          baselineTime,
          generateImmediateWeek
        } = params;

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

        // Create training plan record
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
            paces: JSON.stringify(paces),
            isActive: true
          })
          .returning();

        console.log(`✅ [TRAINING_PLAN_GENERATOR] Training plan created with ID: ${trainingPlan.id}`);

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

        // Generate summary message
        const summary = generatePlanSummary(trainingPlan, firstWeekWorkouts, 'es');

        return {
          success: true,
          message: summary,
          plan: trainingPlan,
          firstWeekWorkouts,
          stats: {
            estimatedVDOT,
            totalWeeks,
            weeklyFrequency,
            targetRace
          }
        };

      } catch (error) {
        console.error('❌ [TRAINING_PLAN_GENERATOR] Error generating plan:', error);
        return {
          success: false,
          error: 'Failed to generate training plan. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error'
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
      summary += `🏃‍♂️ **Primera Semana (${workouts.length} entrenamientos):**\n`;
      workouts.forEach((workout: any, index: number) => {
        summary += `${index + 1}. ${workout.type.toUpperCase()}: ${workout.description}\n`;
      });
      summary += `\n💡 **Próximos pasos:** Completa estos entrenamientos y te iré ajustando el plan según tu progreso.`;
    }

    return summary;
  } else {
    let summary = `🎉 Your ${raceNames.en[plan.targetRace] || plan.targetRace} training plan is ready!\n\n`;
    summary += `📊 **Plan Details:**\n`;
    summary += `• Duration: ${plan.totalWeeks} weeks\n`;
    summary += `• Frequency: ${plan.weeklyFrequency} days per week\n`;
    summary += `• Estimated VDOT: ${Math.round(parseFloat(plan.vdot))}\n\n`;

    if (workouts.length > 0) {
      summary += `🏃‍♂️ **First Week (${workouts.length} workouts):**\n`;
      workouts.forEach((workout: any, index: number) => {
        summary += `${index + 1}. ${workout.type.toUpperCase()}: ${workout.description}\n`;
      });
      summary += `\n💡 **Next steps:** Complete these workouts and I'll adjust your plan based on your progress.`;
    }

    return summary;
  }
}
