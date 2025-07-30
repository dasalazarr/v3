import OpenAI from 'openai';

export interface IntentClassification {
  intent: 'run_logging' | 'onboarding_required' | 'complex_coaching' | 'emotional_support' | 'general_conversation' | 'premium_upgrade' | 'message_counter_check';
  confidence: number;
  reasoning: string;
  recommendedModel: 'deepseek' | 'gpt4o-mini';
  requiresPremium: boolean;
}

export interface UserProfile {
  subscriptionStatus?: string;
  onboardingCompleted?: boolean;
  preferredLanguage?: string;
}

/**
 * Intelligent Intent Classifier using DeepSeek for natural language understanding
 * Much more accurate than keyword-based classification
 */
export class IntelligentIntentClassifier {
  private deepseek: OpenAI;

  constructor(config: { apiKey: string; baseURL: string; model: string }) {
    this.deepseek = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  /**
   * Classify user intent using DeepSeek's natural language understanding
   */
  public async classify(message: string, userProfile?: UserProfile): Promise<IntentClassification> {
    try {
      // Handle onboarding first (highest priority)
      if (!userProfile?.onboardingCompleted) {
        return {
          intent: 'onboarding_required',
          confidence: 1.0,
          reasoning: 'User has not completed mandatory onboarding',
          recommendedModel: 'gpt4o-mini',
          requiresPremium: false
        };
      }

      // Use DeepSeek for intelligent classification
      const classification = await this.classifyWithDeepSeek(message, userProfile);
      
      console.log(`🧠 [INTELLIGENT_CLASSIFIER] Message: "${message}"`);
      console.log(`🧠 [INTELLIGENT_CLASSIFIER] Intent: ${classification.intent} (${classification.confidence})`);
      console.log(`🧠 [INTELLIGENT_CLASSIFIER] Reasoning: ${classification.reasoning}`);

      return classification;

    } catch (error) {
      console.error('❌ [INTELLIGENT_CLASSIFIER] Error:', error);
      
      // Fallback to basic classification
      return {
        intent: 'general_conversation',
        confidence: 0.5,
        reasoning: 'Fallback due to classification error',
        recommendedModel: 'deepseek',
        requiresPremium: false
      };
    }
  }

  /**
   * Use DeepSeek to intelligently classify the user's intent
   */
  private async classifyWithDeepSeek(message: string, userProfile?: UserProfile): Promise<IntentClassification> {
    const systemPrompt = `You are an expert intent classifier for a running coach AI assistant. 

Analyze the user's message and classify it into one of these intents:

1. **message_counter_check**: User asking about message count, premium status, subscription, or remaining messages
   - Examples: "cuantos mensajes me quedan", "soy premium?", "mi estado", "subscription status"
   - Use GPT-4o Mini for reliable tool calling

2. **premium_upgrade**: User explicitly wanting to upgrade to premium
   - Examples: "quiero premium", "upgrade", "comprar premium"
   - Use DeepSeek (cost-efficient)

3. **run_logging**: User reporting a completed run or workout
   - Examples: "corrí 5k", "ran 3 miles", "finished my workout"
   - Use DeepSeek (structured data extraction)

4. **complex_coaching**: Advanced training questions, injury advice, race strategy
   - Examples: "how to improve my marathon time", "injury prevention", "training plan analysis"
   - Use GPT-4o Mini (better reasoning)

5. **emotional_support**: User needs motivation, encouragement, or emotional support
   - Examples: "I'm struggling", "feeling demotivated", "want to quit"
   - Use GPT-4o Mini (better empathy)

6. **general_conversation**: Simple questions, greetings, basic training info
   - Examples: "hello", "how are you", "what's my plan"
   - Use DeepSeek (cost-efficient)

CRITICAL: Pay special attention to message_counter_check intent. Users may ask in many ways:
- Spanish: "cuantos mensajes", "me quedan", "soy premium", "mi estado", "contador"
- English: "message count", "premium status", "how many left", "subscription"

Respond with a JSON object:
{
  "intent": "intent_name",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this intent was chosen",
  "recommendedModel": "deepseek" or "gpt4o-mini",
  "requiresPremium": true or false
}`;

    const userContext = userProfile ? `
User Context:
- Subscription: ${userProfile.subscriptionStatus || 'unknown'}
- Language: ${userProfile.preferredLanguage || 'unknown'}
- Onboarding: ${userProfile.onboardingCompleted ? 'completed' : 'pending'}
` : '';

    const completion = await this.deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userContext}\nUser message: "${message}"` }
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from DeepSeek');
    }

    const parsed = JSON.parse(response);
    
    // Validate the response
    if (!parsed.intent || !parsed.confidence || !parsed.reasoning || !parsed.recommendedModel) {
      throw new Error('Invalid response format from DeepSeek');
    }

    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      recommendedModel: parsed.recommendedModel,
      requiresPremium: parsed.requiresPremium || false
    };
  }

  /**
   * Get human-readable explanation of the classification
   */
  public explainClassification(classification: IntentClassification): string {
    const explanations = {
      'message_counter_check': 'User is asking about their message count or premium status',
      'premium_upgrade': 'User wants to upgrade to premium subscription',
      'run_logging': 'User is reporting a completed run or workout',
      'complex_coaching': 'User needs advanced coaching advice',
      'emotional_support': 'User needs motivation or emotional support',
      'general_conversation': 'General conversation or simple questions',
      'onboarding_required': 'User needs to complete onboarding first'
    };

    return explanations[classification.intent] || 'Unknown intent';
  }
}
