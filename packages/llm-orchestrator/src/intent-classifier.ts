/**
 * Lightweight Intent Classifier for routing messages to appropriate AI models
 * Routes between DeepSeek (cost-efficient) and GPT-4o Mini (premium experience)
 */

export interface IntentClassification {
  intent: 'run_logging' | 'onboarding_required' | 'complex_coaching' | 'emotional_support' | 'general_conversation' | 'premium_upgrade';
  confidence: number;
  reasoning: string;
  recommendedModel: 'deepseek' | 'gpt4o-mini';
  requiresPremium: boolean;
}

export class IntentClassifier {
  
  /**
   * Classify user message intent and recommend appropriate AI model
   */
  public classify(message: string, userProfile?: { 
    subscriptionStatus?: string; 
    onboardingCompleted?: boolean;
    preferredLanguage?: string;
  }): IntentClassification {
    
    const lowerMessage = message.toLowerCase().trim();
    const isSpanish = userProfile?.preferredLanguage === 'es';
    
    console.log(`🧠 [INTENT_CLASSIFIER] Analyzing message: "${message.substring(0, 50)}..."`);
    console.log(`🧠 [INTENT_CLASSIFIER] User profile:`, {
      subscriptionStatus: userProfile?.subscriptionStatus,
      onboardingCompleted: userProfile?.onboardingCompleted,
      preferredLanguage: userProfile?.preferredLanguage
    });

    // 1. Premium Upgrade Intent (Highest Priority)
    if (this.isPremiumUpgradeIntent(lowerMessage)) {
      return {
        intent: 'premium_upgrade',
        confidence: 0.95,
        reasoning: 'User explicitly requesting premium upgrade',
        recommendedModel: 'deepseek', // Simple transaction, no need for premium model
        requiresPremium: false
      };
    }

    // 2. Onboarding Required (Critical Priority)
    if (!userProfile?.onboardingCompleted) {
      return {
        intent: 'onboarding_required',
        confidence: 1.0,
        reasoning: 'User has not completed mandatory onboarding - will use specialized onboarding prompt and tools',
        recommendedModel: userProfile?.subscriptionStatus === 'premium' ? 'gpt4o-mini' : 'deepseek',
        requiresPremium: false
      };
    }

    // 3. Run Logging Intent
    if (this.isRunLoggingIntent(lowerMessage, isSpanish)) {
      return {
        intent: 'run_logging',
        confidence: 0.9,
        reasoning: 'Message contains run/exercise data to be logged',
        recommendedModel: 'deepseek', // Structured data extraction works well with DeepSeek
        requiresPremium: false
      };
    }

    // 4. Emotional Support Intent
    if (this.isEmotionalSupportIntent(lowerMessage, isSpanish)) {
      return {
        intent: 'emotional_support',
        confidence: 0.85,
        reasoning: 'User needs emotional support or motivation',
        recommendedModel: 'gpt4o-mini', // Better empathy and emotional intelligence
        requiresPremium: true
      };
    }

    // 5. Complex Coaching Intent
    if (this.isComplexCoachingIntent(lowerMessage, isSpanish)) {
      return {
        intent: 'complex_coaching',
        confidence: 0.8,
        reasoning: 'User needs advanced coaching advice or training plan analysis',
        recommendedModel: 'gpt4o-mini', // Better for complex reasoning and personalized advice
        requiresPremium: true
      };
    }

    // 6. General Conversation (Default)
    return {
      intent: 'general_conversation',
      confidence: 0.7,
      reasoning: 'General conversation or simple query',
      recommendedModel: userProfile?.subscriptionStatus === 'premium' ? 'gpt4o-mini' : 'deepseek',
      requiresPremium: false
    };
  }

  private isPremiumUpgradeIntent(message: string): boolean {
    const premiumKeywords = ['premium', 'upgrade', 'paid', 'pay', 'payment', 'subscribe', 'subscription', '💎'];
    return premiumKeywords.some(keyword => message.includes(keyword));
  }

  private isRunLoggingIntent(message: string, isSpanish: boolean): boolean {
    const englishRunKeywords = [
      'ran', 'run', 'jog', 'jogged', 'today i', 'yesterday i', 'this morning',
      'km', 'miles', 'minutes', 'hours', 'pace', 'distance', 'time',
      'completed', 'finished', 'did a', 'went for a'
    ];
    
    const spanishRunKeywords = [
      'corrí', 'correr', 'trotar', 'hoy', 'ayer', 'esta mañana',
      'km', 'kilómetros', 'minutos', 'horas', 'ritmo', 'distancia', 'tiempo',
      'completé', 'terminé', 'hice', 'salí a'
    ];

    const keywords = isSpanish ? spanishRunKeywords : englishRunKeywords;
    const matches = keywords.filter(keyword => message.includes(keyword)).length;
    
    // Also check for numeric patterns (distance + time)
    const hasNumbers = /\d+/.test(message);
    const hasDistanceUnit = /\d+\s*(km|k|miles?|mi)\b/.test(message);
    const hasTimeUnit = /\d+\s*(min|minutes?|hour?s?|hrs?)\b/.test(message);
    
    return matches >= 2 || (hasNumbers && (hasDistanceUnit || hasTimeUnit));
  }

  private isEmotionalSupportIntent(message: string, isSpanish: boolean): boolean {
    const englishEmotionalKeywords = [
      'tired', 'exhausted', 'frustrated', 'discouraged', 'unmotivated', 'sad',
      'struggling', 'difficult', 'hard', 'can\'t', 'unable', 'failed',
      'disappointed', 'stressed', 'overwhelmed', 'anxious', 'worried',
      'feel like', 'feeling', 'emotion', 'mood'
    ];
    
    const spanishEmotionalKeywords = [
      'cansado', 'agotado', 'frustrado', 'desanimado', 'desmotivado', 'triste',
      'luchando', 'difícil', 'duro', 'no puedo', 'incapaz', 'fallé',
      'decepcionado', 'estresado', 'abrumado', 'ansioso', 'preocupado',
      'me siento', 'sintiendo', 'emoción', 'estado de ánimo'
    ];

    const keywords = isSpanish ? spanishEmotionalKeywords : englishEmotionalKeywords;
    return keywords.some(keyword => message.includes(keyword));
  }

  private isComplexCoachingIntent(message: string, isSpanish: boolean): boolean {
    const englishCoachingKeywords = [
      'training plan', 'workout plan', 'schedule', 'program', 'routine',
      'improve', 'faster', 'better', 'performance', 'race', 'marathon',
      'half marathon', '5k', '10k', 'pr', 'personal record', 'goal',
      'strategy', 'technique', 'form', 'injury', 'pain', 'recovery',
      'nutrition', 'diet', 'hydration', 'gear', 'shoes'
    ];
    
    const spanishCoachingKeywords = [
      'plan de entrenamiento', 'plan de ejercicio', 'horario', 'programa', 'rutina',
      'mejorar', 'más rápido', 'mejor', 'rendimiento', 'carrera', 'maratón',
      'medio maratón', '5k', '10k', 'récord personal', 'meta', 'objetivo',
      'estrategia', 'técnica', 'forma', 'lesión', 'dolor', 'recuperación',
      'nutrición', 'dieta', 'hidratación', 'equipo', 'zapatillas'
    ];

    const keywords = isSpanish ? spanishCoachingKeywords : englishCoachingKeywords;
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * Get human-readable explanation of the classification
   */
  public explainClassification(classification: IntentClassification): string {
    const modelName = classification.recommendedModel === 'deepseek' ? 'DeepSeek-V3' : 'GPT-4o Mini';
    
    return `Intent: ${classification.intent} (${Math.round(classification.confidence * 100)}% confidence)
Reasoning: ${classification.reasoning}
Recommended Model: ${modelName}
Premium Required: ${classification.requiresPremium ? 'Yes' : 'No'}`;
  }
}
