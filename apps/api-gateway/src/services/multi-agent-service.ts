// Simplified service without external dependencies
import { MultiAgentService } from '../multi-agent/service.js';
import { MultiAgentConfig, WorkflowContext } from '../multi-agent/types.js';
import logger from './logger-service.js';

export class MultiAgentServiceWrapper {
  private multiAgentService: MultiAgentService;

  constructor(
    private aiAgent: any,
    private vectorMemory: any,
    config: MultiAgentConfig
  ) {
    this.multiAgentService = new MultiAgentService(aiAgent, config);
  }

  async processMessage(
    userId: string,
    message: string,
    userProfile: any,
    language: 'en' | 'es'
  ) {
    try {
      // Build workflow context
      const context: WorkflowContext = {
        userId,
        message,
        userProfile,
        language
      };

      const result = await this.multiAgentService.processMessage(context);
      return result;

    } catch (error) {
      logger.error({ userId, error }, '[MULTI_AGENT] Error processing message');
      throw error;
    }
  }

  shouldUseMultiAgent(message: string): boolean {
    // Simple keyword detection
    const complexityKeywords = [
      'plan', 'analyze', 'progress', 'training', 'schedule', 'workout',
      'plan', 'analizar', 'progreso', 'entrenamiento', 'horario', 'ejercicio'
    ];
    
    const lowerMessage = message.toLowerCase();
    return complexityKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}