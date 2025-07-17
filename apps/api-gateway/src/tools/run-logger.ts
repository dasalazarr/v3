import { z } from 'zod';
import { Database, runs } from '@running-coach/database';
import { VectorMemory } from '@running-coach/vector-memory';
import { ToolFunction } from '@running-coach/llm-orchestrator';
import { VDOTCalculator } from '@running-coach/plan-generator';
import { eq, and, sql, desc } from 'drizzle-orm';

const LogRunAndCommentSchema = z.object({
  distance_km: z.number().optional().describe("La distancia de la carrera en kilómetros."),
  duration_minutes: z.number().optional().describe("La duración de la carrera en minutos."),
  effort: z.number().min(1).max(10).optional().describe("El esfuerzo percibido en una escala de 1 a 10."),
  sensation: z.string().optional().describe("La sensación o estado de ánimo del usuario durante o después de la actividad (ej. 'genial', 'cansado', 'fuerte')."),
  notes: z.string().optional().describe("Cualquier comentario o nota adicional relevante del usuario (clima, ruta, etc.)."),
  type: z.string().optional().describe("El tipo de actividad (ej. 'carrera', 'trote', 'caminata', 'entrenamiento de fuerza')."),
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
      const { distance_km, duration_minutes, effort, sensation, notes, type } = params;
      const userId = params.userId;

      if (!userId) {
        throw new Error('User ID is required to log run or comment.');
      }

      // At least one of these should be present for a meaningful log
      if (distance_km === undefined && duration_minutes === undefined && effort === undefined && sensation === undefined && notes === undefined && type === undefined) {
        return { success: false, error: 'No data provided to log.' };
      }

      try {
        const runData = {
          userId,
          date: new Date(),
          distance: distance_km !== undefined ? String(distance_km) : '0.00', // Default to 0 if not provided
          duration: duration_minutes !== undefined ? duration_minutes * 60 : undefined,
          effort: effort,
          sensation: sensation,
          notes: notes,
          type: type,
        };

        const [newRun] = await db.insert(runs).values(runData).returning();
        const runId = newRun.id;

        // Store context in vector memory
        let summary = `User logged an activity.`;
        if (type) summary += ` Type: ${type}.`;
        if (distance_km) summary += ` Distance: ${distance_km}km.`;
        if (duration_minutes) summary += ` Duration: ${duration_minutes}min.`;
        if (effort) summary += ` Effort: ${effort}/10.`;
        if (sensation) summary += ` Sensation: ${sensation}.`;
        if (notes) summary += ` Notes: ${notes}.`;
        
        await vectorMemory.storeRunData(userId, summary, params);

        return {
          success: true,
          message: `¡Actividad registrada! ID: ${runId}`,
          runId: runId!,
        };

      } catch (error) {
        console.error('Error logging activity:', error);
        return {
          success: false,
          error: 'Failed to log activity. Please try again.',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

type Run = typeof runs.$inferSelect;

async function getRecentRuns(db: Database, userId: string): Promise<Partial<Run>[]> {
  try {
    const recentRuns = await db.select()
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
      effort: run.effort,
      sensation: run.sensation,
      notes: run.notes,
      aches: run.aches,
      type: run.type
    }));
  } catch (error) {
    console.error('Error getting recent runs:', error);
    return [];
  }
}

