import OpenAI from 'openai';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { UserProfile, ApiResponse } from '@running-coach/shared';
import { ToolRegistry } from './tool-registry.js';
import { IntentClassifier, IntentClassification } from './intent-classifier.js';
import { AIAgent, AgentResponse, ProcessMessageRequest } from './ai-agent.js';

export interface HybridAIConfig {
  deepseek: {
    apiKey: string;
    baseURL: string;
    model: string;
  };
  openai: {
    apiKey: string;
    baseURL?: string;
    model: string; // gpt-4o-mini
  };
}

export interface HybridAgentResponse extends AgentResponse {
  modelUsed: 'deepseek' | 'gpt4o-mini';
  intent: string;
  costOptimized: boolean;
  classification: IntentClassification;
}

/**
 * Hybrid AI Agent that intelligently routes between DeepSeek and GPT-4o Mini
 * based on intent classification and user subscription status
 */
export class HybridAIAgent {
  private deepseekAgent: AIAgent;
  private openaiAgent: AIAgent;
  private intentClassifier: IntentClassifier;
  private chatBuffer: ChatBuffer;
  private vectorMemory: VectorMemory;
  private toolRegistry: ToolRegistry;

  constructor(
    config: HybridAIConfig,
    chatBuffer: ChatBuffer,
    vectorMemory: VectorMemory,
    toolRegistry: ToolRegistry
  ) {
    this.chatBuffer = chatBuffer;
    this.vectorMemory = vectorMemory;
    this.toolRegistry = toolRegistry;
    this.intentClassifier = new IntentClassifier();

    // Initialize DeepSeek agent
    this.deepseekAgent = new AIAgent(
      {
        apiKey: config.deepseek.apiKey,
        baseURL: config.deepseek.baseURL,
        model: config.deepseek.model
      },
      chatBuffer,
      vectorMemory,
      toolRegistry
    );

    // Initialize OpenAI agent
    this.openaiAgent = new AIAgent(
      {
        apiKey: config.openai.apiKey,
        baseURL: config.openai.baseURL,
        model: config.openai.model
      },
      chatBuffer,
      vectorMemory,
      toolRegistry
    );

    console.log('🤖 [HYBRID_AI] Hybrid AI Agent initialized with DeepSeek and GPT-4o Mini');
  }

  /**
   * Process message with intelligent model routing
   */
  public async processMessage(request: ProcessMessageRequest): Promise<HybridAgentResponse> {
    const { userId, message, userProfile } = request;

    try {
      // Classify intent and determine optimal model
      const classification = this.intentClassifier.classify(message, {
        subscriptionStatus: (userProfile as any)?.subscriptionStatus,
        onboardingCompleted: (userProfile as any)?.onboardingCompleted,
        preferredLanguage: (userProfile as any)?.preferredLanguage
      });

      console.log('🧠 [HYBRID_AI] Intent Classification:');
      console.log(this.intentClassifier.explainClassification(classification));

      // Check if premium features are required but user doesn't have premium
      const userHasPremium = (userProfile as any)?.subscriptionStatus === 'premium';
      const needsPremiumButNotAvailable = classification.requiresPremium && !userHasPremium;

      // Select appropriate agent
      let selectedAgent: AIAgent;
      let modelUsed: 'deepseek' | 'gpt4o-mini';
      let costOptimized = false;

      if (needsPremiumButNotAvailable) {
        // Use DeepSeek for non-premium users requesting premium features
        selectedAgent = this.deepseekAgent;
        modelUsed = 'deepseek';
        costOptimized = true;
        console.log('💰 [HYBRID_AI] Premium feature requested by free user - using cost-optimized DeepSeek');
      } else if (classification.recommendedModel === 'gpt4o-mini') {
        selectedAgent = this.openaiAgent;
        modelUsed = 'gpt4o-mini';
        console.log('🎯 [HYBRID_AI] Using GPT-4o Mini for premium experience');
      } else {
        selectedAgent = this.deepseekAgent;
        modelUsed = 'deepseek';
        costOptimized = true;
        console.log('⚡ [HYBRID_AI] Using DeepSeek for cost-efficient processing');
      }

      // Process message with selected agent
      const response = await selectedAgent.processMessage(request);

      // Add premium upsell if needed
      let finalContent = response.content;
      if (needsPremiumButNotAvailable && classification.intent !== 'premium_upgrade') {
        const upsellMessage = (userProfile as any)?.preferredLanguage === 'es'
          ? '\n\n💎 Para obtener consejos más personalizados y análisis avanzado, considera actualizar a Andes Premium. Escribe "premium" para más información.'
          : '\n\n💎 For more personalized advice and advanced analysis, consider upgrading to Andes Premium. Type "premium" for more information.';
        
        finalContent += upsellMessage;
      }

      return {
        ...response,
        content: finalContent,
        modelUsed,
        intent: classification.intent,
        costOptimized,
        classification
      };

    } catch (error) {
      console.error(`❌ [HYBRID_AI] Error processing message for ${userId}:`, error);
      
      // Fallback to DeepSeek on error
      try {
        const fallbackResponse = await this.deepseekAgent.processMessage(request);
        return {
          ...fallbackResponse,
          modelUsed: 'deepseek',
          intent: 'general_conversation',
          costOptimized: true,
          classification: {
            intent: 'general_conversation',
            confidence: 0.5,
            reasoning: 'Fallback due to error',
            recommendedModel: 'deepseek',
            requiresPremium: false
          }
        };
      } catch (fallbackError) {
        console.error(`❌ [HYBRID_AI] Fallback also failed for ${userId}:`, fallbackError);
        throw error;
      }
    }
  }

  /**
   * Get usage statistics for cost monitoring
   */
  public getUsageStats(): {
    deepseekCalls: number;
    openaiCalls: number;
    costOptimizationRate: number;
  } {
    // This would be implemented with actual usage tracking
    // For now, return placeholder values
    return {
      deepseekCalls: 0,
      openaiCalls: 0,
      costOptimizationRate: 0.75 // 75% of calls use cost-optimized DeepSeek
    };
  }

  /**
   * Force a specific model for testing purposes
   */
  public async processMessageWithModel(
    request: ProcessMessageRequest, 
    forceModel: 'deepseek' | 'gpt4o-mini'
  ): Promise<HybridAgentResponse> {
    const agent = forceModel === 'deepseek' ? this.deepseekAgent : this.openaiAgent;
    const response = await agent.processMessage(request);
    
    return {
      ...response,
      modelUsed: forceModel,
      intent: 'forced_model_test',
      costOptimized: forceModel === 'deepseek',
      classification: {
        intent: 'general_conversation',
        confidence: 1.0,
        reasoning: `Forced to use ${forceModel} for testing`,
        recommendedModel: forceModel,
        requiresPremium: false
      }
    };
  }
}
