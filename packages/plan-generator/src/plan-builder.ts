import { addDays, startOfWeek } from 'date-fns';
import { TrainingPlan, Workout, UserProfile, formatPace } from '@running-coach/shared';
import { VDOTCalculator, VDOTPaces } from './vdot-calculator.js';

export interface PlanGenerationRequest {
  userId: string;
  currentVDOT: number;
  targetRace: '5k' | '10k' | 'half_marathon' | 'marathon';
  targetDate?: Date;
  weeklyFrequency: number; // 3-7 runs per week
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  weeklyMileage?: number;
  injuryHistory?: Array<{
    type: string;
    severity: 'minor' | 'moderate' | 'severe';
    recovered: boolean;
  }>;
  preferences?: {
    avoidBackToBack?: boolean;
    preferredRestDays?: number[]; // 0-6, Sunday = 0
    maxWorkoutDuration?: number; // minutes
  };
}

export interface WorkoutTemplate {
  type: 'easy' | 'long' | 'tempo' | 'intervals' | 'recovery' | 'race';
  name: string;
  description: string;
  distanceRatio: number; // Percentage of weekly mileage
  paceType: keyof VDOTPaces;
  effortLevel: number; // 1-10
  recoveryDays: number; // Days to recovery after this workout
}

export class PlanBuilder {
  private static readonly WORKOUT_TEMPLATES: Record<string, WorkoutTemplate[]> = {
    '5k': [
      {
        type: 'easy',
        name: 'Easy Run',
        description: 'Conversational pace for aerobic base building',
        distanceRatio: 0.25,
        paceType: 'easy',
        effortLevel: 4,
        recoveryDays: 0
      },
      {
        type: 'tempo',
        name: 'Tempo Run',
        description: 'Comfortably hard effort to improve lactate threshold',
        distanceRatio: 0.2,
        paceType: 'threshold',
        effortLevel: 7,
        recoveryDays: 1
      },
      {
        type: 'intervals',
        name: '5K Intervals',
        description: 'Short intervals at 5K pace with equal rest',
        distanceRatio: 0.15,
        paceType: 'interval',
        effortLevel: 8,
        recoveryDays: 2
      },
      {
        type: 'long',
        name: 'Long Run',
        description: 'Steady aerobic run for endurance',
        distanceRatio: 0.3,
        paceType: 'easy',
        effortLevel: 5,
        recoveryDays: 1
      },
      {
        type: 'recovery',
        name: 'Recovery Run',
        description: 'Very easy pace for active recovery',
        distanceRatio: 0.15,
        paceType: 'easy',
        effortLevel: 3,
        recoveryDays: 0
      }
    ],
    '10k': [
      {
        type: 'easy',
        name: 'Easy Run',
        description: 'Conversational pace for aerobic base building',
        distanceRatio: 0.25,
        paceType: 'easy',
        effortLevel: 4,
        recoveryDays: 0
      },
      {
        type: 'tempo',
        name: 'Threshold Run',
        description: '10K pace tempo efforts',
        distanceRatio: 0.25,
        paceType: 'threshold',
        effortLevel: 7,
        recoveryDays: 1
      },
      {
        type: 'intervals',
        name: '10K Intervals',
        description: 'Medium intervals at 10K pace',
        distanceRatio: 0.2,
        paceType: 'interval',
        effortLevel: 8,
        recoveryDays: 2
      },
      {
        type: 'long',
        name: 'Long Run',
        description: 'Extended aerobic run for endurance',
        distanceRatio: 0.35,
        paceType: 'easy',
        effortLevel: 5,
        recoveryDays: 1
      }
    ],
    'half_marathon': [
      {
        type: 'easy',
        name: 'Easy Run',
        description: 'Conversational pace for aerobic development',
        distanceRatio: 0.3,
        paceType: 'easy',
        effortLevel: 4,
        recoveryDays: 0
      },
      {
        type: 'tempo',
        name: 'Half Marathon Pace',
        description: 'Race pace segments with recovery',
        distanceRatio: 0.25,
        paceType: 'threshold',
        effortLevel: 7,
        recoveryDays: 1
      },
      {
        type: 'long',
        name: 'Long Run',
        description: 'Progressive long run building endurance',
        distanceRatio: 0.4,
        paceType: 'easy',
        effortLevel: 6,
        recoveryDays: 2
      },
      {
        type: 'intervals',
        name: 'Lactate Intervals',
        description: 'Longer intervals to improve lactate clearance',
        distanceRatio: 0.2,
        paceType: 'threshold',
        effortLevel: 8,
        recoveryDays: 1
      }
    ],
    'marathon': [
      {
        type: 'easy',
        name: 'Easy Run',
        description: 'Aerobic base building at conversational pace',
        distanceRatio: 0.35,
        paceType: 'easy',
        effortLevel: 4,
        recoveryDays: 0
      },
      {
        type: 'tempo',
        name: 'Marathon Pace',
        description: 'Race pace practice with progression',
        distanceRatio: 0.25,
        paceType: 'marathon',
        effortLevel: 6,
        recoveryDays: 1
      },
      {
        type: 'long',
        name: 'Long Run',
        description: 'Extended run for marathon endurance',
        distanceRatio: 0.45,
        paceType: 'easy',
        effortLevel: 6,
        recoveryDays: 2
      },
      {
        type: 'intervals',
        name: 'Threshold Work',
        description: 'Lactate threshold development',
        distanceRatio: 0.2,
        paceType: 'threshold',
        effortLevel: 7,
        recoveryDays: 1
      }
    ]
  };

  /**
   * Generate a complete training plan
   */
  public static generatePlan(request: PlanGenerationRequest): TrainingPlan {
    const {
      userId,
      currentVDOT,
      targetRace,
      targetDate,
      weeklyFrequency,
      experienceLevel
    } = request;

    // Calculate plan duration (12-20 weeks depending on race distance)
    const baseDuration = this.getBasePlanDuration(targetRace, experienceLevel);
    const totalWeeks = targetDate 
      ? Math.max(8, Math.min(24, this.calculateWeeksToTarget(targetDate)))
      : baseDuration;

    // Calculate weekly mileage progression
    const baseWeeklyMileage = request.weeklyMileage || this.estimateWeeklyMileage(
      targetRace, 
      experienceLevel, 
      currentVDOT
    );

    // Get training paces
    const paces = VDOTCalculator.getPaces(currentVDOT);

    const plan: TrainingPlan = {
      id: `plan_${userId}_${Date.now()}`,
      userId,
      vdot: currentVDOT,
      weeklyFrequency,
      targetRace,
      targetDate,
      currentWeek: 1,
      totalWeeks,
      paces,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return plan;
  }

  /**
   * Generate workouts for a specific week
   */
  public static generateWeekWorkouts(
    plan: TrainingPlan,
    weekNumber: number,
    request: PlanGenerationRequest
  ): Workout[] {
    const workouts: Workout[] = [];
    const weeklyMileage = this.calculateWeeklyMileage(plan, weekNumber, request);
    const templates = this.WORKOUT_TEMPLATES[plan.targetRace];
    
    // Determine which workouts to include based on frequency and week
    const selectedTemplates = this.selectWorkoutsForWeek(
      templates,
      plan.weeklyFrequency,
      weekNumber,
      plan.totalWeeks,
      request
    );

    // Generate individual workouts
    for (let day = 0; day < selectedTemplates.length; day++) {
      const template = selectedTemplates[day];
      const workout = this.createWorkoutFromTemplate(
        template,
        plan,
        weekNumber,
        day + 1,
        weeklyMileage
      );
      workouts.push(workout);
    }

    return workouts;
  }

  /**
   * Generate next 14 days of workouts
   */
  public static generate14DayBlock(request: PlanGenerationRequest): Workout[] {
    const plan = this.generatePlan(request);
    const workouts: Workout[] = [];
    
    // Generate 2 weeks of workouts
    const week1Workouts = this.generateWeekWorkouts(plan, 1, request);
    const week2Workouts = this.generateWeekWorkouts(plan, 2, request);
    
    // Schedule workouts with dates
    const startDate = startOfWeek(new Date());
    
    week1Workouts.forEach((workout, index) => {
      workout.scheduledDate = addDays(startDate, this.getWorkoutDayOfWeek(index, request));
      workouts.push(workout);
    });
    
    week2Workouts.forEach((workout, index) => {
      workout.scheduledDate = addDays(startDate, 7 + this.getWorkoutDayOfWeek(index, request));
      workouts.push(workout);
    });

    return workouts;
  }

  private static getBasePlanDuration(
    targetRace: string,
    experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  ): number {
    const baseDurations: Record<string, Record<string, number>> = {
      '5k': { beginner: 8, intermediate: 10, advanced: 12 },
      '10k': { beginner: 10, intermediate: 12, advanced: 14 },
      'half_marathon': { beginner: 12, intermediate: 16, advanced: 18 },
      'marathon': { beginner: 16, intermediate: 20, advanced: 24 }
    };

    return baseDurations[targetRace][experienceLevel];
  }

  private static calculateWeeksToTarget(targetDate: Date): number {
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.ceil((targetDate.getTime() - now.getTime()) / msPerWeek);
  }

  private static estimateWeeklyMileage(
    targetRace: string,
    experienceLevel: string,
    vdot: number
  ): number {
    const baseMileage: Record<string, Record<string, number>> = {
      '5k': { beginner: 15, intermediate: 25, advanced: 35 },
      '10k': { beginner: 20, intermediate: 30, advanced: 40 },
      'half_marathon': { beginner: 25, intermediate: 40, advanced: 55 },
      'marathon': { beginner: 30, intermediate: 50, advanced: 70 }
    };

    const base = baseMileage[targetRace][experienceLevel];
    const vdotMultiplier = Math.max(0.7, Math.min(1.3, vdot / 50)); // Scale by fitness
    
    return Math.round(base * vdotMultiplier);
  }

  private static calculateWeeklyMileage(
    plan: TrainingPlan,
    weekNumber: number,
    request: PlanGenerationRequest
  ): number {
    const baseMileage = request.weeklyMileage || 30;
    const progressionFactor = this.getProgressionFactor(weekNumber, plan.totalWeeks);
    
    return Math.round(baseMileage * progressionFactor);
  }

  private static getProgressionFactor(weekNumber: number, totalWeeks: number): number {
    // Create a progressive buildup with recovery weeks
    const buildPhase = Math.floor(totalWeeks * 0.7);
    const peakPhase = Math.floor(totalWeeks * 0.2);
    const taperPhase = totalWeeks - buildPhase - peakPhase;

    if (weekNumber <= buildPhase) {
      // Progressive build: 70% to 100%
      return 0.7 + (0.3 * (weekNumber - 1) / (buildPhase - 1));
    } else if (weekNumber <= buildPhase + peakPhase) {
      // Peak phase: 95% to 100%
      return 0.95 + (0.05 * (weekNumber - buildPhase - 1) / Math.max(1, peakPhase - 1));
    } else {
      // Taper phase: 100% to 60%
      const taperWeek = weekNumber - buildPhase - peakPhase;
      return 1.0 - (0.4 * (taperWeek - 1) / Math.max(1, taperPhase - 1));
    }
  }

  private static selectWorkoutsForWeek(
    templates: WorkoutTemplate[],
    frequency: number,
    weekNumber: number,
    totalWeeks: number,
    request: PlanGenerationRequest
  ): WorkoutTemplate[] {
    const selected: WorkoutTemplate[] = [];
    
    // Always include easy runs as base
    const easyTemplate = templates.find(t => t.type === 'easy')!;
    
    if (frequency >= 3) {
      // 3+ days: Easy, Quality, Long
      selected.push(easyTemplate);
      selected.push(this.selectQualityWorkout(templates, weekNumber, totalWeeks));
      selected.push(templates.find(t => t.type === 'long')!);
    }
    
    if (frequency >= 4) {
      // 4+ days: Add another easy or recovery
      selected.push(weekNumber % 3 === 0 
        ? templates.find(t => t.type === 'recovery')! 
        : easyTemplate
      );
    }
    
    if (frequency >= 5) {
      // 5+ days: Add tempo or interval
      selected.push(this.selectSecondQualityWorkout(templates, weekNumber));
    }
    
    if (frequency >= 6) {
      // 6+ days: Add recovery
      selected.push(templates.find(t => t.type === 'recovery') || easyTemplate);
    }
    
    if (frequency >= 7) {
      // 7 days: Add final easy
      selected.push(easyTemplate);
    }

    return selected.slice(0, frequency);
  }

  private static selectQualityWorkout(
    templates: WorkoutTemplate[],
    weekNumber: number,
    totalWeeks: number
  ): WorkoutTemplate {
    const phase = weekNumber / totalWeeks;
    
    if (phase < 0.3) {
      // Early phase: focus on tempo
      return templates.find(t => t.type === 'tempo')!;
    } else if (phase < 0.8) {
      // Build phase: alternate tempo and intervals
      return weekNumber % 2 === 0
        ? templates.find(t => t.type === 'intervals')!
        : templates.find(t => t.type === 'tempo')!;
    } else {
      // Peak/taper: race-specific work
      return templates.find(t => t.type === 'intervals')!;
    }
  }

  private static selectSecondQualityWorkout(
    templates: WorkoutTemplate[],
    weekNumber: number
  ): WorkoutTemplate {
    // Rotate between different quality sessions
    const qualityTemplates = templates.filter(t => 
      t.type === 'tempo' || t.type === 'intervals'
    );
    return qualityTemplates[weekNumber % qualityTemplates.length];
  }

  private static createWorkoutFromTemplate(
    template: WorkoutTemplate,
    plan: TrainingPlan,
    weekNumber: number,
    dayNumber: number,
    weeklyMileage: number
  ): Workout {
    const distance = weeklyMileage * template.distanceRatio;
    const targetPace = plan.paces[template.paceType];
    const duration = Math.round((distance * targetPace) / 60); // Convert to minutes

    return {
      id: `workout_${plan.id}_w${weekNumber}_d${dayNumber}`,
      planId: plan.id,
      userId: plan.userId,
      week: weekNumber,
      day: dayNumber,
      type: template.type,
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      duration,
      targetPace,
      description: this.generateWorkoutDescription(template, distance, targetPace),
      completed: false,
    };
  }

  private static generateWorkoutDescription(
    template: WorkoutTemplate,
    distance: number,
    targetPace: number
  ): string {
    const paceStr = formatPace(targetPace);
    const distanceStr = distance.toFixed(1);

    switch (template.type) {
      case 'easy':
        return `${distanceStr} miles easy @ ${paceStr}/mile. ${template.description}`;
      case 'tempo':
        return `${distanceStr} miles tempo @ ${paceStr}/mile. ${template.description}`;
      case 'intervals':
        return `${distanceStr} miles total intervals @ ${paceStr}/mile. ${template.description}`;
      case 'long':
        return `${distanceStr} miles long run @ ${paceStr}/mile. ${template.description}`;
      case 'recovery':
        return `${distanceStr} miles recovery @ ${paceStr}/mile. ${template.description}`;
      default:
        return `${distanceStr} miles @ ${paceStr}/mile. ${template.description}`;
    }
  }



  private static getWorkoutDayOfWeek(
    workoutIndex: number,
    request: PlanGenerationRequest
  ): number {
    // Default schedule: avoid back-to-back hard days
    const defaultSchedule = [1, 3, 5, 0, 2, 4, 6]; // Mon, Wed, Fri, Sun, Tue, Thu, Sat
    
    if (request.preferences?.preferredRestDays) {
      // Custom scheduling based on user preferences
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      const availableDays = allDays.filter(day => 
        !request.preferences!.preferredRestDays!.includes(day)
      );
      return availableDays[workoutIndex % availableDays.length];
    }

    return defaultSchedule[workoutIndex % defaultSchedule.length];
  }
}