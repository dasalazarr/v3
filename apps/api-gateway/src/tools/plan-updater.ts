import { z } from 'zod';
import { Database } from '@running-coach/database';
import { trainingPlans, workouts } from '@running-coach/database';
import { VDOTPaces as Paces } from '@running-coach/plan-generator';
import { VectorMemory } from '@running-coach/vector-memory';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { PlanBuilder, VDOTCalculator } from '@running-coach/plan-generator';
import { formatPace } from '@running-coach/shared';
import { eq, and } from 'drizzle-orm';

// Define a type for the plan object returned from the database
type Plan = typeof trainingPlans.$inferSelect;
type Workout = typeof workouts.$inferSelect;

const UpdatePlanSchema = z.object({
  action: z.enum(['create', 'update_vdot', 'adjust_frequency', 'modify_goal']),
  targetRace: z.enum(['5k', '10k', 'half_marathon', 'marathon']).optional(),
  weeklyFrequency: z.number().min(3).max(7).optional(),
  currentVDOT: z.number().min(20).max(85).optional(),
  targetDate: z.string().optional(), // ISO date string
  adjustments: z.object({
    reason: z.string(),
    modifications: z.array(z.string())
  }).optional()
});

export function createPlanUpdaterTool(
  db: Database,
  vectorMemory: VectorMemory
): ToolFunction {
  return {
    name: 'update_training_plan',
    description: 'Create or update a user\'s training plan based on their goals and current fitness',
    parameters: UpdatePlanSchema,
    execute: async (params: z.infer<typeof UpdatePlanSchema> & { userId?: string }) => {
      const { action, targetRace, weeklyFrequency, currentVDOT, targetDate, adjustments } = params;
      
      // Get user ID from context
      const userId = params.userId;
      if (!userId) {
        throw new Error('User ID is required to update a training plan.');
      }
      
      try {
        switch (action) {
          case 'create':
            return await createNewPlan(db, vectorMemory, userId, {
              targetRace: targetRace!,
              weeklyFrequency: weeklyFrequency!,
              currentVDOT: currentVDOT!,
              targetDate: targetDate ? new Date(targetDate) : undefined
            });
            
          case 'update_vdot':
            return await updatePlanVDOT(db, vectorMemory, userId, currentVDOT!);
            
          case 'adjust_frequency':
            return await adjustPlanFrequency(db, vectorMemory, userId, weeklyFrequency!);
            
          case 'modify_goal':
            return await modifyPlanGoal(db, vectorMemory, userId, targetRace!, targetDate);
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        console.error('Error updating training plan:', error);
        return {
          success: false,
          error: 'Failed to update training plan',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

async function createNewPlan(
  db: Database,
  vectorMemory: VectorMemory,
  userId: string,
  params: {
    targetRace: string;
    weeklyFrequency: number;
    currentVDOT: number;
    targetDate?: Date;
  }
): Promise<any> {
  const { targetRace, weeklyFrequency, currentVDOT, targetDate } = params;
  
  // Deactivate existing plans
  await db.query.update(trainingPlans)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)));
  
  // Calculate plan duration and target VDOT
  const planDuration = calculatePlanDuration(targetRace, targetDate);
  const targetVDOT = VDOTCalculator.suggestTargetVDOT(currentVDOT, 'intermediate', planDuration);
  
  // Get training paces
  const paces = VDOTCalculator.getPaces(currentVDOT);
  
  // Create new plan
  const newPlan = await db.query.insert(trainingPlans).values({
    userId,
    vdot: currentVDOT.toString(),
    weeklyFrequency,
    targetRace: targetRace as any,
    targetDate,
    currentWeek: 1,
    totalWeeks: planDuration,
    paces,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();
  
  const plan = newPlan[0];
  
  // Generate initial workouts (next 2 weeks)
  const workoutsToCreate = PlanBuilder.generate14DayBlock({
    userId,
    currentVDOT,
    targetRace: targetRace as any,
    targetDate,
    weeklyFrequency,
    experienceLevel: 'intermediate'
  });
  
  // Insert workouts into database
  if (workoutsToCreate.length > 0) {
    await db.query.insert(workouts).values(
      workoutsToCreate.map(workout => ({
        ...workout,
        planId: plan.id,
        distance: workout.distance?.toString(),
        duration: workout.duration,
        targetPace: workout.targetPace,
        completed: false, // Ensure this is set
        description: workout.description || '' // Ensure description is not null
      }))
    );
  }
  
  // Store plan creation in vector memory
  const planSummary = `Created new ${targetRace} training plan with ${weeklyFrequency} runs per week, current VDOT ${currentVDOT}, targeting ${targetVDOT} VDOT improvement over ${planDuration} weeks`;
  await vectorMemory.storeGoal(userId, planSummary, {
    planId: plan.id,
    targetRace,
    weeklyFrequency,
    currentVDOT,
    targetVDOT,
    planDuration
  });
  
  return {
    success: true,
    planId: plan.id,
    message: `New ${targetRace} training plan created!`,
    details: {
      duration: `${planDuration} weeks`,
      frequency: `${weeklyFrequency} runs per week`,
      currentVDOT,
      targetVDOT,
      paces: {
        easy: formatPace(paces.easy),
        tempo: formatPace(paces.threshold),
        interval: formatPace(paces.interval)
      },
      nextWorkouts: workoutsToCreate.slice(0, 3).map((w: any) => ({
        date: w.scheduledDate?.toDateString(),
        type: w.type,
        description: w.description
      }))
    }
  };
}

async function updatePlanVDOT(
  db: Database,
  vectorMemory: VectorMemory,
  userId: string,
  newVDOT: number
): Promise<any> {
  // Get current active plan
  const currentPlan = await db.query.select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)))
    .limit(1);
  
  if (currentPlan.length === 0) {
    throw new Error('No active training plan found');
  }
  
  const plan = currentPlan[0];
  const oldVDOT = plan.vdot;
  
  // Calculate new paces
  const newPaces = VDOTCalculator.getPaces(newVDOT);
  
  // Update plan
  await db.query.update(trainingPlans)
    .set({
      vdot: newVDOT.toString(),
      paces: newPaces,
      updatedAt: new Date()
    })
    .where(eq(trainingPlans.id, plan.id));
  
  // Update future workouts with new paces
  await updateFutureWorkoutPaces(db, plan.id, newPaces);
  
  // Store VDOT improvement in vector memory
  const vdotChange = newVDOT - parseFloat(oldVDOT.toString());
  const improvement = vdotChange > 0 ? 'improvement' : 'adjustment';
  const changeDesc = vdotChange > 0 ? `improved by ${vdotChange.toFixed(1)}` : `adjusted by ${Math.abs(vdotChange).toFixed(1)}`;
  
  await vectorMemory.storeAchievement(
    userId, 
    `VDOT ${improvement}: ${changeDesc} points (${oldVDOT} → ${newVDOT})`,
    { oldVDOT, newVDOT, change: vdotChange }
  );
  
  return {
    success: true,
    message: `Training plan updated with new VDOT of ${newVDOT}!`,
    details: {
      oldVDOT,
      newVDOT,
      change: vdotChange,
      newPaces: {
        easy: formatPace(newPaces.easy),
        tempo: formatPace(newPaces.threshold),
        interval: formatPace(newPaces.interval)
      }
    }
  };
}

async function adjustPlanFrequency(
  db: Database,
  vectorMemory: VectorMemory,
  userId: string,
  newFrequency: number
): Promise<any> {
  // Get current active plan
  const currentPlan = await db.query.select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)))
    .limit(1);
  
  if (currentPlan.length === 0) {
    throw new Error('No active training plan found');
  }
  
  const plan = currentPlan[0];
  const oldFrequency = plan.weeklyFrequency;
  
  // Update plan frequency
  await db.query.update(trainingPlans)
    .set({
      weeklyFrequency: newFrequency,
      updatedAt: new Date()
    })
    .where(eq(trainingPlans.id, plan.id));
  
  // Regenerate upcoming workouts with new frequency
  await regenerateUpcomingWorkouts(db, plan, newFrequency);
  
  // Store frequency change in vector memory
  await vectorMemory.storeGoal(
    userId,
    `Adjusted training frequency from ${oldFrequency} to ${newFrequency} runs per week`,
    { oldFrequency, newFrequency, planId: plan.id }
  );
  
  return {
    success: true,
    message: `Training frequency updated to ${newFrequency} runs per week!`,
    details: {
      oldFrequency,
      newFrequency,
      note: newFrequency > oldFrequency 
        ? 'Added more runs for increased volume'
        : 'Reduced frequency for better recovery'
    }
  };
}

async function modifyPlanGoal(
  db: Database,
  vectorMemory: VectorMemory,
  userId: string,
  newTargetRace: string,
  newTargetDate?: string
): Promise<any> {
  // Get current active plan
  const currentPlan = await db.query.select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.isActive, true)))
    .limit(1);
  
  if (currentPlan.length === 0) {
    throw new Error('No active training plan found');
  }
  
  const plan = currentPlan[0];
  const oldTargetRace = plan.targetRace;
  const targetDate = newTargetDate ? new Date(newTargetDate) : plan.targetDate;
  
  // Update plan goal
  await db.query.update(trainingPlans)
    .set({
      targetRace: newTargetRace as any,
      targetDate,
      updatedAt: new Date()
    })
    .where(eq(trainingPlans.id, plan.id));
  
  // Store goal change in vector memory
  await vectorMemory.storeGoal(
    userId,
    `Changed race goal from ${oldTargetRace} to ${newTargetRace}${targetDate ? ` targeting ${targetDate.toDateString()}` : ''}`,
    { oldTargetRace, newTargetRace, targetDate: targetDate?.toISOString(), planId: plan.id }
  );
  
  return {
    success: true,
    message: `Training goal updated to ${newTargetRace}!`,
    details: {
      oldGoal: oldTargetRace,
      newGoal: newTargetRace,
      targetDate: targetDate?.toDateString(),
      note: 'Your training plan has been adjusted for the new race distance'
    }
  };
}

function calculatePlanDuration(targetRace: string, targetDate?: Date): number {
  if (targetDate) {
    const weeksUntilRace = Math.ceil(
      (targetDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    return Math.max(8, Math.min(24, weeksUntilRace));
  }
  
  // Default durations by race type
  const defaultDurations: Record<string, number> = {
    '5k': 12,
    '10k': 14,
    'half_marathon': 16,
    'marathon': 20
  };
  
  return defaultDurations[targetRace] || 12;
}

async function updateFutureWorkoutPaces(
  db: Database,
  planId: string,
  newPaces: Paces
): Promise<void> {
  // Get incomplete workouts
  const futureWorkouts = await db.query.select()
    .from(workouts)
    .where(and(eq(workouts.planId, planId), eq(workouts.completed, false)));
  
  // Update pace for each workout based on its type
  for (const workout of futureWorkouts as Workout[]) {
    let newTargetPace: number;
    
    switch (workout.type) {
      case 'easy':
      case 'recovery':
      case 'long':
        newTargetPace = newPaces.easy;
        break;
      case 'tempo':
        newTargetPace = newPaces.threshold;
        break;
      case 'intervals':
        newTargetPace = newPaces.interval;
        break;
      default:
        continue; // Skip unknown workout types
    }
    
    await db.query.update(workouts)
      .set({ targetPace: newTargetPace })
      .where(eq(workouts.id, workout.id));
  }
}

async function regenerateUpcomingWorkouts(
  db: Database,
  plan: Plan,
  newFrequency: number
): Promise<void> {
  // Delete future incomplete workouts
  await db.query.delete(workouts)
    .where(and(
      eq(workouts.planId, plan.id),
      eq(workouts.completed, false)
    ));
  
  // Generate new workouts with updated frequency
  const newWorkouts = PlanBuilder.generate14DayBlock({
    userId: plan.userId,
    currentVDOT: parseFloat(plan.vdot.toString()),
    targetRace: plan.targetRace,
    targetDate: plan.targetDate || undefined,
    weeklyFrequency: newFrequency,
    experienceLevel: 'intermediate'
  });
  
  // Insert new workouts
  if (newWorkouts.length > 0) {
    await db.query.insert(workouts).values(
      newWorkouts.map((workout: any) => ({
        ...workout,
        planId: plan.id,
        userId: plan.userId,
        distance: workout.distance?.toString(),
        completed: false,
        description: workout.description || ''
      }))
    );
  }
}

