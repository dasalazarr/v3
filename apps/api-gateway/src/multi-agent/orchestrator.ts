// Simple orchestrator without external dependencies
import { MultiAgentConfig, WorkflowContext, WorkflowResult } from './types.js';

export class SimpleOrchestrator {
  constructor(
    private aiAgent: any,
    private config: MultiAgentConfig
  ) {}

  async executeWorkflow(context: WorkflowContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    try {
      // Check if should use multi-agent
      if (!this.shouldUseMultiAgent(context)) {
        return await this.singleAgentResponse(context, startTime);
      }

      // Multi-agent processing
      const enhancedPrompt = this.buildEnhancedPrompt(context);
      const response = await this.aiAgent.processMessage({
        userId: context.userId,
        message: enhancedPrompt,
        userProfile: context.userProfile
      });

      return {
        success: true,
        content: response.content,
        executionTime: Date.now() - startTime,
        multiAgentUsed: true
      };

    } catch (error) {
      return {
        success: false,
        content: this.getErrorMessage(context.language),
        executionTime: Date.now() - startTime,
        multiAgentUsed: false
      };
    }
  }

  private shouldUseMultiAgent(context: WorkflowContext): boolean {
    if (!this.config.enabled) return false;
    
    // Percentage rollout
    const random = Math.random() * 100;
    if (random > this.config.percentage) return false;
    
    // Complex keywords
    const complexKeywords = [
      'plan', 'analyze', 'progress', 'training', 'schedule',
      'plan', 'analizar', 'progreso', 'entrenamiento', 'horario'
    ];
    
    return complexKeywords.some(keyword => 
      context.message.toLowerCase().includes(keyword)
    );
  }

  private async singleAgentResponse(context: WorkflowContext, startTime: number): Promise<WorkflowResult> {
    const response = await this.aiAgent.processMessage({
      userId: context.userId,
      message: context.message,
      userProfile: context.userProfile
    });

    return {
      success: true,
      content: response.content,
      executionTime: Date.now() - startTime,
      multiAgentUsed: false
    };
  }

  private buildEnhancedPrompt(context: WorkflowContext): string {
    const lang = context.language === 'es' ? 'Spanish' : 'English';
    const profile = context.userProfile || {};
    
    return `As an expert running coach, provide a comprehensive response to: "${context.message}"

User Profile: ${JSON.stringify(profile)}
Language: ${lang}

Please provide:
1. Immediate actionable advice
2. Specific recommendations based on user's profile
3. Long-term planning if applicable
4. Motivation and encouragement

Be detailed, specific, and personalized.`;
  }

  private getErrorMessage(language: 'en' | 'es'): string {
    return language === 'es' 
      ? 'Disculpa, tengo problemas técnicos. ¿Puedes intentar de nuevo?'
      : 'Sorry, I\'m having technical issues. Can you please try again?';
  }
}