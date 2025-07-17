import { z } from 'zod';
import { Database, runs } from '@running-coach/database';
import { VectorMemory } from '@running-coach/vector-memory';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { VDOTCalculator } from '@running-coach/plan-generator';
import { eq, and, sql, desc } from 'drizzle-orm';

const LogRunAndCommentSchema = z.object({
  distance_km: z.number().optional().describe("La distancia de la carrera en kilómetros."),
  duration_minutes: z.number().optional().describe("La duración de la carrera en minutos."),
  perceived_effort: z.number().min(1).max(10).optional().describe("El esfuerzo percibido en una escala de 1 a 10."),
  notes: z.string().optional().describe("Cualquier comentario, sensación o nota relevante del usuario (dolor, cansancio, motivación, clima, etc.)."),
});

export function createRunLoggerTool(
  db: Database,
  vectorMemory: VectorMemory
): ToolFunction {
  return {
    name: 'log_run_and_comment',
    description: 'Registra una actividad de carrera (trote, caminata) y/o un comentario, sensación o nota del usuario. Úsalo proactivamente cuando el usuario mencione una actividad o comparta un sentimiento relevante.',
    parameters: LogRunAndCommentSchema,
    execute: async (params: z.infer<typeof LogRunAndCommentSchema> & { userId?: string }) => {
      const { distance_km, duration_minutes, perceived_effort, notes } = params;
      const userId = params.userId;

      if (!userId) {
        throw new Error('User ID is required to log run or comment.');
      }

      const isRun = distance_km !== undefined || duration_minutes !== undefined;
      const isComment = notes !== undefined;

      if (!isRun && !isComment) {
        return { success: false, error: 'No data provided to log.' };
      }

      try {
        // Find a run for today to potentially update it
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const [todaysRun] = await db.query
          .select()
          .from(runs)
          .where(and(
            eq(runs.userId, userId),
            sql`date >= ${todayStart.toISOString()}`,
            sql`date <= ${todayEnd.toISOString()}`
          ))
          .limit(1);

        let runId: string;
        let message: string = '';

        if (isRun) {
          const runData = {
            userId,
            date: new Date(),
            distance: String(distance_km || 0),
            duration: duration_minutes ? duration_minutes * 60 : undefined,
            perceivedEffort: perceived_effort,
            notes: notes,
          };

          const [newRun] = await db.query.insert(runs).values(runData).returning();
          runId = newRun.id;
          message = `¡Entendido! He registrado tu carrera de ${distance_km || 'hoy'}.`;

        } else if (isComment) {
          if (todaysRun) {
            // Append comment to today's run
            const updatedNotes = todaysRun.notes ? `${todaysRun.notes}\n${notes}` : notes;
            await db.query.update(runs).set({ notes: updatedNotes }).where(eq(runs.id, todaysRun.id));
            runId = todaysRun.id;
            message = '¡Anotado! He añadido tu comentario a la actividad de hoy.';
          } else {
            // Create a new "comment-only" run
            const [newCommentRun] = await db.query.insert(runs).values({
              userId,
              date: new Date(),
              distance: '0.00', // Schema requires distance, so we use 0 for comment-only entries
              notes: notes,
            }).returning();
            runId = newCommentRun.id;
            message = '¡Anotado! He guardado tu comentario de hoy.';
          }
        }

        // Store context in vector memory
        const summary = `User logged: ${isRun ? `run of ${distance_km}km` : ''}${isRun && isComment ? ' and ' : ''}${isComment ? `comment: \'${notes}\'` : ''}`;
        await vectorMemory.storeRunData(userId, summary, params);

        return {
          success: true,
          message,
          runId: runId!,
        };

      } catch (error) {
        console.error('Error logging run/comment:', error);
        return {
          success: false,
          error: 'Failed to log run or comment. Please try again.',
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