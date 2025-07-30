export type IntentType = 'data_logging' | 'emotional_support' | 'complex_coaching' | 'onboarding' | 'general';

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  recommendedAgent: 'deepseek' | 'gpt4';
}

export class IntentClassifier {
  
  /**
   * Clasifica la intención del mensaje del usuario
   */
  classify(message: string, userProfile?: any): IntentClassification {
    const lowerMsg = message.toLowerCase().trim();
    
    console.log(`🧠 [INTENT_CLASSIFIER] Analyzing message: "${message.substring(0, 50)}..."`);
    
    // 1. ONBOARDING - Prioridad máxima
    if (this.isOnboardingIntent(lowerMsg, userProfile)) {
      return {
        intent: 'onboarding',
        confidence: 0.95,
        reasoning: 'User needs to complete onboarding or is in onboarding flow',
        recommendedAgent: 'deepseek' // Más económico para onboarding estructurado
      };
    }

    // 2. DATA LOGGING - Registro de entrenamientos
    if (this.isDataLoggingIntent(lowerMsg)) {
      return {
        intent: 'data_logging',
        confidence: 0.9,
        reasoning: 'Message contains run data (distance, time, pace)',
        recommendedAgent: 'deepseek' // Más económico para tareas estructuradas
      };
    }

    // 3. EMOTIONAL SUPPORT - Soporte emocional
    if (this.isEmotionalSupportIntent(lowerMsg)) {
      return {
        intent: 'emotional_support',
        confidence: 0.85,
        reasoning: 'Message contains emotional language requiring empathy',
        recommendedAgent: 'gpt4' // Mejor para respuestas empáticas
      };
    }

    // 4. COMPLEX COACHING - Coaching avanzado
    if (this.isComplexCoachingIntent(lowerMsg)) {
      return {
        intent: 'complex_coaching',
        confidence: 0.8,
        reasoning: 'Message requires advanced coaching knowledge',
        recommendedAgent: 'gpt4' // Mejor para análisis complejo
      };
    }

    // 5. GENERAL - Conversación general
    return {
      intent: 'general',
      confidence: 0.6,
      reasoning: 'General conversation or unclear intent',
      recommendedAgent: userProfile?.subscriptionStatus === 'premium' ? 'gpt4' : 'deepseek'
    };
  }

  private isOnboardingIntent(message: string, userProfile?: any): boolean {
    // Si el usuario no ha completado onboarding
    if (userProfile && !userProfile.onboardingCompleted) {
      return true;
    }

    // Palabras clave de inicio o reinicio de onboarding
    const onboardingKeywords = [
      'empezar', 'comenzar', 'iniciar', 'start', 'begin',
      'nuevo', 'new', 'first time', 'primera vez',
      'perfil', 'profile', 'información', 'information'
    ];

    return onboardingKeywords.some(keyword => message.includes(keyword));
  }

  private isDataLoggingIntent(message: string): boolean {
    // Patrones de datos de entrenamiento
    const dataPatterns = [
      /\d+\s*(km|k|miles?|mi)\b/i,           // Distancia: "5km", "3 miles"
      /\d+\s*(min|minutes?|hrs?|hours?)\b/i,  // Tiempo: "30 min", "1 hour"
      /\d+:\d+/,                              // Pace: "5:30", "7:45"
      /corrí|ran|correr|running|workout|entrenamiento/i
    ];

    const hasDataPattern = dataPatterns.some(pattern => pattern.test(message));
    
    // También buscar palabras clave de registro
    const loggingKeywords = [
      'corrí', 'ran', 'finished', 'completed', 'terminé',
      'workout', 'entrenamiento', 'carrera', 'run'
    ];

    const hasLoggingKeyword = loggingKeywords.some(keyword => message.includes(keyword));

    return hasDataPattern && hasLoggingKeyword;
  }

  private isEmotionalSupportIntent(message: string): boolean {
    const emotionalKeywords = [
      // Emociones negativas
      'tired', 'cansado', 'exhausted', 'agotado',
      'frustrated', 'frustrado', 'discouraged', 'desanimado',
      'difficult', 'difícil', 'hard', 'duro',
      'can\'t', 'no puedo', 'impossible', 'imposible',
      'give up', 'rendirme', 'quit', 'dejar',
      
      // Emociones positivas que requieren refuerzo
      'excited', 'emocionado', 'motivated', 'motivado',
      'proud', 'orgulloso', 'happy', 'feliz',
      'achieved', 'logré', 'accomplished', 'conseguí',
      
      // Solicitudes de apoyo
      'help', 'ayuda', 'support', 'apoyo',
      'advice', 'consejo', 'what should', 'qué debería'
    ];

    return emotionalKeywords.some(keyword => message.includes(keyword));
  }

  private isComplexCoachingIntent(message: string): boolean {
    const coachingKeywords = [
      // Planificación y estrategia
      'plan', 'strategy', 'estrategia', 'programa',
      'training plan', 'plan de entrenamiento',
      'schedule', 'horario', 'calendar', 'calendario',
      
      // Objetivos y carreras
      'marathon', 'maratón', 'half marathon', 'medio maratón',
      '5k', '10k', '21k', '42k', 'race', 'carrera',
      'goal', 'objetivo', 'target', 'meta',
      'personal record', 'récord personal', 'pr', 'pb',
      
      // Técnica y mejora
      'improve', 'mejorar', 'faster', 'más rápido',
      'technique', 'técnica', 'form', 'forma',
      'pace', 'ritmo', 'speed', 'velocidad',
      'endurance', 'resistencia', 'strength', 'fuerza',
      
      // Análisis y ciencia
      'vdot', 'heart rate', 'frecuencia cardíaca',
      'lactate', 'lactato', 'vo2', 'threshold', 'umbral',
      'periodization', 'periodización', 'tapering', 'descarga'
    ];

    return coachingKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Determina si se debe usar GPT-4 basado en la intención y perfil del usuario
   */
  shouldUseGPT4(classification: IntentClassification, userProfile?: any): boolean {
    // Siempre GPT-4 para usuarios premium
    if (userProfile?.subscriptionStatus === 'premium') {
      return true;
    }

    // GPT-4 para intenciones que requieren mayor sofisticación
    const gpt4Intents: IntentType[] = ['emotional_support', 'complex_coaching'];
    return gpt4Intents.includes(classification.intent);
  }
}
