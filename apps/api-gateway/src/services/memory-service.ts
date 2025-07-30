import { injectable, inject } from 'tsyringe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

export interface UserMemory {
  userId: string;
  profileData: {
    name?: string;
    age?: number;
    experienceLevel?: string;
    weeklyFrequency?: number;
    mainGoal?: string;
    injuries?: string;
    lastRunDistance?: number;
    lastRunTime?: number;
    lastRunPace?: string;
  };
  conversationContext: {
    lastInteraction: Date;
    recentTopics: string[];
    currentFlow?: string;
  };
  trainingState: {
    currentWeek?: number;
    lastWorkout?: Date;
    completedWorkouts?: number;
    upcomingGoals?: string[];
  };
}

@injectable()
export class MemoryService {
  constructor(
    @inject('Database') private database: Database
  ) {}

  /**
   * Recupera el contexto completo del usuario para personalizar respuestas
   */
  async getEnhancedContext(userId: string): Promise<UserMemory | null> {
    try {
      console.log(`🧠 [MEMORY] Retrieving enhanced context for user ${userId}`);

      // Obtener datos del usuario
      const [user] = await this.database.query
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        console.log(`🧠 [MEMORY] User ${userId} not found`);
        return null;
      }

      // Obtener carreras recientes (últimas 5) - simplificado por ahora
      const recentRuns: any[] = []; // TODO: Implementar query de runs cuando esté disponible

      // Construir memoria contextual
      const memory: UserMemory = {
        userId,
        profileData: {
          name: (user as any).name || undefined,
          age: user.age || undefined,
          experienceLevel: user.experienceLevel || undefined,
          weeklyFrequency: Number(user.weeklyMileage) || 0,
          mainGoal: user.onboardingGoal || undefined,
          injuries: (user.injuryHistory as string) || undefined,
        },
        conversationContext: {
          lastInteraction: user.updatedAt,
          recentTopics: [], // Se puede expandir con análisis de conversaciones
          currentFlow: user.onboardingCompleted ? 'training' : 'onboarding'
        },
        trainingState: {
          currentWeek: 1, // Se puede calcular basado en fecha de inicio
          lastWorkout: recentRuns[0]?.date,
          completedWorkouts: recentRuns.length,
          upcomingGoals: user.goalRace ? [user.goalRace] : []
        }
      };

      console.log(`🧠 [MEMORY] Enhanced context retrieved:`, {
        hasProfile: !!memory.profileData.name,
        recentRuns: recentRuns.length,
        currentFlow: memory.conversationContext.currentFlow
      });

      return memory;

    } catch (error) {
      console.error(`❌ [MEMORY] Error retrieving context for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Actualiza el contexto conversacional del usuario
   */
  async updateConversationContext(userId: string, topic: string, flow?: string): Promise<void> {
    try {
      console.log(`🧠 [MEMORY] Updating conversation context for user ${userId}: ${topic}`);
      
      // Por ahora, solo actualizamos la fecha de última interacción
      // En el futuro se puede expandir para guardar temas y flujos
      await this.database.query
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId));

    } catch (error) {
      console.error(`❌ [MEMORY] Error updating context for user ${userId}:`, error);
    }
  }

  /**
   * Genera un resumen contextual para el prompt del AI
   */
  generateContextualPrompt(memory: UserMemory, language: 'en' | 'es' = 'es'): string {
    if (!memory) return '';

    const { profileData, conversationContext, trainingState } = memory;
    
    if (language === 'es') {
      let context = `## CONTEXTO DEL USUARIO:\n`;
      
      if (profileData.name) {
        context += `- Nombre: ${profileData.name}\n`;
      }
      
      if (profileData.age && profileData.experienceLevel) {
        context += `- Perfil: ${profileData.age} años, nivel ${profileData.experienceLevel}\n`;
      }
      
      if (profileData.mainGoal) {
        context += `- Objetivo: ${profileData.mainGoal}\n`;
      }
      
      if (trainingState.completedWorkouts && trainingState.completedWorkouts > 0) {
        context += `- Entrenamientos completados: ${trainingState.completedWorkouts}\n`;
      }
      
      if (profileData.injuries) {
        context += `- Lesiones/limitaciones: ${profileData.injuries}\n`;
      }

      return context;
    } else {
      let context = `## USER CONTEXT:\n`;
      
      if (profileData.name) {
        context += `- Name: ${profileData.name}\n`;
      }
      
      if (profileData.age && profileData.experienceLevel) {
        context += `- Profile: ${profileData.age} years old, ${profileData.experienceLevel} level\n`;
      }
      
      if (profileData.mainGoal) {
        context += `- Goal: ${profileData.mainGoal}\n`;
      }
      
      if (trainingState.completedWorkouts && trainingState.completedWorkouts > 0) {
        context += `- Completed workouts: ${trainingState.completedWorkouts}\n`;
      }
      
      if (profileData.injuries) {
        context += `- Injuries/limitations: ${profileData.injuries}\n`;
      }

      return context;
    }
  }
}
