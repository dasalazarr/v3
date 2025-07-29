import { z } from 'zod';
import { Database, runs } from '@running-coach/database';
import { VectorMemory } from '@running-coach/vector-memory';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { VDOTCalculator } from '@running-coach/plan-generator';
import { eq, desc } from 'drizzle-orm';

const LogRunSchema = z.object({
  distance: z.number().min(0.1).max(200),
  duration: z.number().min(30).max(50000).optional(), // seconds - reduced minimum for short runs
  perceivedEffort: z.number().min(1).max(10).optional(),
  mood: z.enum(['great', 'good', 'okay', 'tired', 'terrible']).optional(),
  notes: z.string().optional(),
  aches: z.array(z.object({
    location: z.string(),
    severity: z.number().min(1).max(10)
  })).optional(),
  date: z.string().optional(), // ISO date string
  // Add fields for better data extraction
  rawText: z.string().optional() // Original message for debugging
});

export function createRunLoggerTool(
  db: Database,
  vectorMemory: VectorMemory
): ToolFunction {
  return {
    name: 'log_run',
    description: 'Log a completed run with distance, time, effort, and other details. Extract data from natural language: distance in km/miles, duration in minutes (convert to seconds), effort 1-10, mood, notes. Examples: "6.4 km in 34 minutes" = distance: 6.4, duration: 2040 (34*60 seconds)',
    parameters: LogRunSchema,
    execute: async (params: z.infer<typeof LogRunSchema> & { userId?: string }) => {
      const { distance, duration, perceivedEffort, mood, notes, aches, date, rawText } = params;

      // Get user ID from context (this would be passed in during execution)
      const userId = params.userId || 'unknown';

      console.log(`🏃 [RUN_LOGGER] Processing run for user ${userId}:`, {
        distance,
        duration,
        perceivedEffort,
        mood,
        rawText: rawText?.substring(0, 100)
      });
      
      try {
        // Parse date or use current date
        const runDate = date ? new Date(date) : new Date();
        
        // Calculate pace if duration is provided
        let pace: number | undefined;
        if (duration) {
          pace = Math.round(duration / distance); // seconds per mile
        }

        // Insert run into database
        const newRun = await db.query.insert(runs).values({
          userId,
          date: runDate,
          distance: distance.toString(),
          duration,
          perceivedEffort,
          mood,
          notes,
          aches,
          createdAt: new Date()
        }).returning();

        // Store in vector memory
        const runSummary = generateRunSummary(distance, duration, perceivedEffort, mood, notes);
        await vectorMemory.storeRunData(userId, runSummary, {
          distance,
          duration,
          pace,
          perceivedEffort,
          mood,
          date: runDate.toISOString()
        });

        // Calculate current VDOT estimate
        const recentRuns = await getRecentRuns(db, userId);
        const vdotEstimate = VDOTCalculator.calculateFromRecentRuns(
          recentRuns
            .map(run => ({
              ...run,
              id: run.id!,
              date: run.date!,
              userId: run.userId!,
              distance: run.distance ? parseFloat(run.distance) : 0,
              duration: run.duration || 0,
              perceivedEffort: run.perceivedEffort || 0,
              mood: run.mood || undefined,
              aches: run.aches ? (Array.isArray(run.aches) ? run.aches : []) : undefined,
              notes: run.notes || undefined,
              weather: run.weather || undefined,
              route: run.route || undefined,
            }))
            .filter(run => run.duration > 0 && run.distance > 0)
        );

        const response = {
          success: true,
          runId: newRun[0].id,
          message: `Run logged successfully! ${distance} miles`,
          stats: {
            distance,
            pace: pace ? formatPace(pace) : undefined,
            effort: perceivedEffort,
            estimatedVDOT: vdotEstimate
          }
        };

        // Generate motivational message based on the run
        const motivation = generateMotivationalMessage(distance, perceivedEffort, mood);
        if (motivation) {
          response.message += ` ${motivation}`;
        }

        return response;
      } catch (error) {
        console.error('Error logging run:', error);
        return {
          success: false,
          error: 'Failed to log run. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

function generateRunSummary(
  distance: number,
  duration?: number,
  effort?: number,
  mood?: string,
  notes?: string
): string {
  let summary = `Completed ${distance} mile run`;
  
  if (duration) {
    const pace = formatPace(duration / distance);
    summary += ` at ${pace}/mile pace`;
  }
  
  if (effort) {
    summary += `, effort level ${effort}/10`;
  }
  
  if (mood) {
    summary += `, feeling ${mood}`;
  }
  
  if (notes) {
    summary += `. Notes: ${notes}`;
  }
  
  return summary;
}

function formatPace(secondsPerMile: number): string {
  const minutes = Math.floor(secondsPerMile / 60);
  const seconds = Math.round(secondsPerMile % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function generateMotivationalMessage(
  distance: number,
  effort?: number,
  mood?: string
): string | null {
  const messages = [];
  
  // Distance-based motivation
  if (distance >= 20) {
    messages.push("🏃‍♂️ That's an incredible long run! Your endurance is building beautifully.");
  } else if (distance >= 13.1) {
    messages.push("💪 Half marathon distance or more - you're crushing it!");
  } else if (distance >= 10) {
    messages.push("⭐ Double digits! Great work on building that aerobic base.");
  } else if (distance >= 5) {
    messages.push("👏 Solid distance today - consistency pays off!");
  }
  
  // Effort-based motivation
  if (effort) {
    if (effort <= 3) {
      messages.push("😌 Perfect recovery pace - these easy runs are so important!");
    } else if (effort >= 8) {
      messages.push("🔥 High effort session - make sure to recover well!");
    }
  }
  
  // Mood-based motivation
  if (mood === 'great') {
    messages.push("🌟 Love the positive energy! Keep riding that wave.");
  } else if (mood === 'terrible') {
    messages.push("💙 Tough days happen - you still showed up and that's what matters!");
  }
  
  return messages.length > 0 ? messages[Math.floor(Math.random() * messages.length)] : null;
}

type Run = typeof runs.$inferSelect;

async function getRecentRuns(db: Database, userId: string): Promise<Partial<Run>[]> {
  try {
    const recentRuns = await db.query.select()
      .from(runs)
      .where(eq(runs.userId, userId))
      .orderBy(desc(runs.date))
      .limit(10);
    
    return recentRuns.map((run: Run) => ({
      id: run.id,
      userId: run.userId,
      date: run.date,
      distance: run.distance,
      duration: run.duration,
      perceivedEffort: run.perceivedEffort,
      mood: run.mood,
      notes: run.notes,
      aches: run.aches
    }));
  } catch (error) {
    console.error('Error getting recent runs:', error);
    return [];
  }
}