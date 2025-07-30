export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  shouldRetry: boolean;
}

export class ValidationService {
  
  /**
   * Valida la ejecución de un tool
   */
  validateToolExecution(toolName: string, params: any, result: any): ValidationResult {
    console.log(`🔍 [VALIDATION] Validating tool execution: ${toolName}`);
    
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      shouldRetry: false
    };

    switch (toolName) {
      case 'complete_onboarding':
        return this.validateOnboardingCompletion(params, result);
      
      case 'generate_training_plan':
        return this.validateTrainingPlanGeneration(params, result);
      
      case 'log_run':
        return this.validateRunLogging(params, result);
      
      default:
        return validation;
    }
  }

  private validateOnboardingCompletion(params: any, result: any): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      shouldRetry: false
    };

    // Verificar que se proporcionaron los campos requeridos
    const requiredFields = ['name', 'age', 'experienceLevel', 'weeklyFrequency', 'mainGoal'];
    for (const field of requiredFields) {
      if (!params[field]) {
        validation.errors.push(`Missing required field: ${field}`);
        validation.isValid = false;
      }
    }

    // Verificar que el resultado indica éxito
    if (result && result.error) {
      validation.errors.push(`Tool execution failed: ${result.error}`);
      validation.isValid = false;
      validation.shouldRetry = true;
    }

    // Verificar que se guardó el usuario
    if (result && !result.success) {
      validation.errors.push('Onboarding completion was not successful');
      validation.isValid = false;
      validation.shouldRetry = true;
    }

    return validation;
  }

  private validateTrainingPlanGeneration(params: any, result: any): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      shouldRetry: false
    };

    // Verificar parámetros requeridos
    if (!params.userId) {
      validation.errors.push('Missing userId for training plan generation');
      validation.isValid = false;
    }

    if (!params.targetRace) {
      validation.errors.push('Missing targetRace for training plan generation');
      validation.isValid = false;
    }

    // Verificar resultado
    if (result && result.error) {
      validation.errors.push(`Training plan generation failed: ${result.error}`);
      validation.isValid = false;
      validation.shouldRetry = true;
    }

    // Verificar que se generaron workouts
    if (result && result.success && (!result.workoutsGenerated || result.workoutsGenerated === 0)) {
      validation.warnings.push('Training plan generated but no workouts created');
    }

    return validation;
  }

  private validateRunLogging(params: any, result: any): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      shouldRetry: false
    };

    // Verificar datos básicos de la carrera
    if (!params.distance || params.distance <= 0) {
      validation.errors.push('Invalid or missing distance');
      validation.isValid = false;
    }

    if (!params.duration || params.duration <= 0) {
      validation.errors.push('Invalid or missing duration');
      validation.isValid = false;
    }

    // Verificar resultado
    if (result && result.error) {
      validation.errors.push(`Run logging failed: ${result.error}`);
      validation.isValid = false;
      validation.shouldRetry = true;
    }

    return validation;
  }

  /**
   * Valida la respuesta del AI para detectar problemas comunes
   */
  validateAIResponse(response: string, context: any): ValidationResult {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      shouldRetry: false
    };

    // Verificar que la respuesta no esté vacía
    if (!response || response.trim().length === 0) {
      validation.errors.push('AI response is empty');
      validation.isValid = false;
      validation.shouldRetry = true;
    }

    // Verificar que la respuesta no sea demasiado larga (posible alucinación)
    if (response.length > 2000) {
      validation.warnings.push('AI response is unusually long');
    }

    // Verificar que no contenga JSON malformado visible
    if (response.includes('{') && response.includes('}') && !this.isValidJSON(response)) {
      validation.warnings.push('Response may contain malformed JSON');
    }

    // Verificar consistencia de idioma
    if (context.expectedLanguage) {
      const detectedLanguage = this.detectResponseLanguage(response);
      if (detectedLanguage !== context.expectedLanguage) {
        validation.warnings.push(`Language mismatch: expected ${context.expectedLanguage}, got ${detectedLanguage}`);
      }
    }

    return validation;
  }

  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private detectResponseLanguage(response: string): 'en' | 'es' | 'unknown' {
    const spanishWords = ['hola', 'gracias', 'por favor', 'entrenamiento', 'carrera', 'kilómetros'];
    const englishWords = ['hello', 'thanks', 'please', 'training', 'run', 'miles'];

    const lowerResponse = response.toLowerCase();
    const spanishMatches = spanishWords.filter(word => lowerResponse.includes(word)).length;
    const englishMatches = englishWords.filter(word => lowerResponse.includes(word)).length;

    if (spanishMatches > englishMatches) return 'es';
    if (englishMatches > spanishMatches) return 'en';
    return 'unknown';
  }

  /**
   * Detecta bucles conversacionales
   */
  detectConversationLoop(userId: string, response: string, recentResponses: string[]): boolean {
    // Verificar si la respuesta es idéntica a alguna reciente
    if (recentResponses.includes(response)) {
      console.log(`🔄 [VALIDATION] Conversation loop detected for user ${userId}`);
      return true;
    }

    // Verificar similitud alta (más del 80% igual)
    for (const recentResponse of recentResponses) {
      const similarity = this.calculateSimilarity(response, recentResponse);
      if (similarity > 0.8) {
        console.log(`🔄 [VALIDATION] High similarity detected (${similarity}) for user ${userId}`);
        return true;
      }
    }

    return false;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
