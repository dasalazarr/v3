import OpenAI from 'openai';
import { franc } from 'franc';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { UserProfile, ApiResponse } from '@running-coach/shared';
import { ToolRegistry } from './tool-registry.js';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export interface AgentResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    parameters: any;
    result: any;
  }>;
  language: 'en' | 'es';
  confidence: number;
}

export interface ProcessMessageRequest {
  userId: string;
  message: string;
  userProfile?: UserProfile;
  contextOverride?: Array<{role: string, content: string}>;
  systemPrompt?: string; // Custom system prompt for specialized flows
}

export class AIAgent {
  private openai: OpenAI;
  private chatBuffer: ChatBuffer;
  private vectorMemory: VectorMemory;
  private toolRegistry: ToolRegistry;
  private model: string;

  constructor(
    openaiConfig: OpenAIConfig,
    chatBuffer: ChatBuffer,
    vectorMemory: VectorMemory,
    toolRegistry: ToolRegistry
  ) {
    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
      baseURL: openaiConfig.baseURL,
    });
    
    this.chatBuffer = chatBuffer;
    this.vectorMemory = vectorMemory;
    this.toolRegistry = toolRegistry;
    this.model = openaiConfig.model || 'gpt-4';
  }

  /**
   * Process a user message with full context and tool calling
   */
  public async processMessage(request: ProcessMessageRequest): Promise<AgentResponse> {
    const { userId, message, userProfile, contextOverride, systemPrompt } = request;

    try {
      // Store user message in chat buffer and vector memory
      await this.chatBuffer.addMessage(userId, 'user', message);
      await this.vectorMemory.storeConversation(userId, 'user', message);

      // Use preferred language from user profile or detect language
      let language: 'en' | 'es' = this.detectLanguage(message); // Detect from message first

      if (userProfile?.preferredLanguage && (userProfile.preferredLanguage === 'en' || userProfile.preferredLanguage === 'es')) {
        language = userProfile.preferredLanguage;
        console.log(`🌐 Using user's preferred language: ${language}`);
      } else {
        // Use detected language from message
        console.log(`🌐 Detected language from message: ${language}`);
      }

      // Get conversation context
      const conversationHistory = contextOverride || 
        await this.chatBuffer.getConversationContext(userId);

      // Get relevant vector memory context
      const memoryContext = await this.vectorMemory.retrieveContext(userId, message);

      // Build system prompt (use custom if provided, otherwise build default)
      const finalSystemPrompt = systemPrompt || this.buildSystemPrompt(userProfile, memoryContext, language);

      if (systemPrompt) {
        console.log(`🎯 [AI_AGENT] Using custom system prompt for specialized flow`);
      }

      // Prepare messages for OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: finalSystemPrompt },
        ...conversationHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      // Get available tools
      const tools = this.toolRegistry.getOpenAITools();

      // Call OpenAI with function calling
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 400,
      });

      const choice = completion.choices[0];
      let content = choice.message.content || '';
      const toolCalls: any[] = [];

      // Execute tool calls if any
      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          try {
            const result = await this.toolRegistry.execute({
              name: toolCall.function.name,
              parameters: { ...JSON.parse(toolCall.function.arguments), userId },
            });
            
            // Handle validation errors by asking the user for more information
            if (result.error === 'VALIDATION_FAILED') {
              content = result.message; // Use the validation message as the response
              toolCalls.pop(); // Remove the failed tool call
              break; // Exit the loop and return the validation message
            }

            toolCalls.push({
              name: toolCall.function.name,
              parameters: JSON.parse(toolCall.function.arguments),
              result,
            });

            // Add tool result to context for follow-up response
            messages.push({
              role: 'assistant',
              content: null,
              tool_calls: [toolCall],
            });
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            });
          } catch (error) {
            console.error(`Tool execution failed: ${toolCall.function.name}`, error);
            toolCalls.push({
              name: toolCall.function.name,
              parameters: JSON.parse(toolCall.function.arguments),
              result: { error: error instanceof Error ? error.message : 'Unknown error' },
            });
          }
        }

        // Get final response after tool execution
        if (toolCalls.length > 0) {
          const followupCompletion = await this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0.7,
            max_tokens: 400,
          });
          content = followupCompletion.choices[0].message.content || content;
        }
      }

      // Store assistant response
      await this.chatBuffer.addMessage(userId, 'assistant', content);
      await this.vectorMemory.storeConversation(userId, 'assistant', content);

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        language,
        confidence: this.calculateConfidence(completion),
      };

    } catch (error) {
      console.error(`❌ Error processing message for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate a standalone response without storing in memory
   */
  public async generateResponse(
    prompt: string,
    context?: Array<{role: string, content: string}>
  ): Promise<string> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        ...(context || []).map((msg: { role:string; content: string }) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        { role: 'user', content: prompt }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 400,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('❌ Error generating response:', error);
      throw error;
    }
  }

  private detectLanguage(text: string): 'en' | 'es' {
    const cleanText = text.toLowerCase().trim();

    // Enhanced keyword-based detection for better accuracy
    const englishKeywords = ['hi', 'hello', 'i', 'want', 'start', 'free', 'training', 'with', 'andes', 'run', 'running', 'the', 'and', 'my', 'is', 'are', 'have', 'will', 'would', 'could', 'should'];
    const spanishKeywords = ['hola', 'quiero', 'comenzar', 'empezar', 'entrenamiento', 'gratuito', 'con', 'andes', 'correr', 'corriendo', 'el', 'la', 'y', 'mi', 'es', 'son', 'tengo', 'voy', 'podría', 'debería'];

    const englishMatches = englishKeywords.filter(keyword => cleanText.includes(keyword)).length;
    const spanishMatches = spanishKeywords.filter(keyword => cleanText.includes(keyword)).length;

    console.log(`🌐 [AI_AGENT_DETECT] Text: "${text.substring(0, 50)}..."`);
    console.log(`🌐 [AI_AGENT_DETECT] English matches: ${englishMatches}, Spanish matches: ${spanishMatches}`);

    // If keyword-based detection is conclusive, use it
    if (englishMatches > spanishMatches && englishMatches >= 1) {
      console.log(`🌐 [AI_AGENT_DETECT] Keyword-based detection: English`);
      return 'en';
    }
    if (spanishMatches > englishMatches && spanishMatches >= 1) {
      console.log(`🌐 [AI_AGENT_DETECT] Keyword-based detection: Spanish`);
      return 'es';
    }

    // Fallback to franc
    const detected = franc(text);
    const result = detected === 'spa' ? 'es' : (detected === 'eng' ? 'en' : 'es');
    console.log(`🌐 [AI_AGENT_DETECT] Franc detected: ${detected} -> ${result}`);

    return result;
  }

  private buildSystemPrompt(
    userProfile?: UserProfile,
    memoryContext?: any,
    language: 'en' | 'es' = 'en'
  ): string {
    const basePrompt = language === 'es' 
      ? this.getSpanishSystemPrompt()
      : this.getEnglishSystemPrompt();

    let enhancedPrompt = basePrompt;

    // Add language context explicitly
    enhancedPrompt += `\n\n## LANGUAGE / IDIOMA:\n${language === 'es' ? 'Español' : 'English'}`;
    
    // Add user profile context
    if (userProfile) {
      const profileContext = this.buildProfileContext(userProfile, language);
      const profileTitle = language === 'es' ? 'PERFIL DEL USUARIO' : 'USER PROFILE';
      enhancedPrompt += `\n\n## ${profileTitle}:\n${profileContext}`;
    }

    // Add memory context
    if (memoryContext?.summary) {
      const contextTitle = language === 'es' ? 'CONTEXTO RELEVANTE' : 'RELEVANT CONTEXT';
      enhancedPrompt += `\n\n## ${contextTitle}:\n${memoryContext.summary}`;
    }

    return enhancedPrompt;
  }

  private getEnglishSystemPrompt(): string {
    return `You are an expert AI running coach specialized in personalized training plans and motivation. Your expertise includes:\n\n## CORE COMPETENCIES\n- Creating scientific training plans using Jack Daniels VDOT methodology\n- Analyzing running data and providing actionable insights\n- Motivating runners and adapting to their psychological state\n- Injury prevention and recovery guidance\n- Nutrition and hydration advice for runners\n\n## PERSONALITY\n- Encouraging and motivational, but realistic\n- Uses running community language and terminology\n- Celebrates achievements, no matter how small\n- Provides specific, actionable advice\n- Empathetic to struggles and setbacks\n\n## AVAILABLE TOOLS\nYou have access to tools for:\n- \`check_onboarding_status\`: Check if user completed their profile\n- \`complete_onboarding\`: Save user profile information\n- \`generate_training_plan\`: Create personalized training plan\n- \`log_run\`: Log runs and workouts\n- \`update_training_plan\`: Update existing plans\n\n## ENHANCED ONBOARDING FLOW\nWhen a new user interacts:\n1. ALWAYS use \`check_onboarding_status\` first\n2. Collect information in this order:\n   - Name\n   - Age\n   - Experience level (beginner/intermediate/advanced)\n   - Training days per week\n   - Main goal (5K, 10K, half marathon, marathon)\n   - **KEY QUESTION**: "When was your last run and what distance/time did you do?" (for real VDOT calculation)\n   - Injuries or limitations\n3. Once complete, use \`complete_onboarding\`\n4. Immediately use \`generate_training_plan\` with language: 'en'\n\n## UNITS AND FORMAT\n- **ALWAYS use MILES** for English users\n- Paces in min/mile format (e.g., 7:30 min/mile)\n- Distances in miles (e.g., 4.0 miles, not km)\n\n## RUN LOGGING\nIf user mentions a completed run, ALWAYS use \`log_run\` automatically.\n\n## RESPONSE GUIDELINES\n- Keep responses short and friendly\n- Use tools proactively\n- Personalize using user history\n- Include specific paces in miles when relevant\n- Celebrate every achievement and progress`
  }

  private getSpanishSystemPrompt(): string {
    return `Eres un entrenador experto de running especializado en planes de entrenamiento personalizados y motivación. Tu experiencia incluye:\n\n## COMPETENCIAS PRINCIPALES\n- Crear planes de entrenamiento científicos usando la metodología VDOT de Jack Daniels\n- Analizar datos de running y proporcionar insights accionables\n- Motivar corredores y adaptarte a su estado psicológico\n- Prevención de lesiones y guía de recuperación\n- Consejos de nutrición e hidratación para corredores\n\n## PERSONALIDAD\n- Alentador y motivacional, pero realista\n- Usa el lenguaje y terminología de la comunidad runner\n- Celebra logros, sin importar cuán pequeños sean\n- Proporciona consejos específicos y accionables\n- Empático con las luchas y contratiempos\n\n## HERRAMIENTAS DISPONIBLES\nTienes acceso a herramientas para:\n- \`check_onboarding_status\`: Verificar si el usuario completó su perfil\n- \`complete_onboarding\`: Guardar información del perfil del usuario\n- \`generate_training_plan\`: Crear plan de entrenamiento personalizado\n- \`log_run\`: Registrar carreras y entrenamientos\n- \`update_training_plan\`: Actualizar planes existentes\n\n## FLUJO DE ONBOARDING MEJORADO\nCuando un usuario nuevo interactúe:\n1. SIEMPRE usa \`check_onboarding_status\` primero\n2. Recopila información en este orden:\n   - Nombre\n   - Edad\n   - Nivel de experiencia (principiante/intermedio/avanzado)\n   - Días de entrenamiento por semana\n   - Meta principal (5K, 10K, media maratón, maratón)\n   - **PREGUNTA CLAVE**: "¿Cuándo fue tu última carrera y qué distancia/tiempo hiciste?" (para calcular VDOT real)\n   - Lesiones o limitaciones\n3. Una vez completo, usa \`complete_onboarding\`\n4. Inmediatamente usa \`generate_training_plan\` con language: 'es'\n\n## UNIDADES Y FORMATO\n- **SIEMPRE usa KILÓMETROS** para usuarios en español\n- Ritmos en formato min/km (ej: 5:20 min/km)\n- Distancias en km (ej: 6.4 km, no millas)\n\n## REGISTRO DE CARRERAS\nSi el usuario menciona una carrera completada, SIEMPRE usa \`log_run\` automáticamente.\n\n## GUÍAS DE RESPUESTA\n- Mantén las respuestas cortas y amables\n- Usa las herramientas proactivamente\n- Personaliza usando el historial del usuario\n- Incluye ritmos específicos en km cuando sea relevante\n- Celebra cada logro y progreso`
  }

  private buildProfileContext(userProfile: UserProfile, language: 'en' | 'es'): string {
    const context: string[] = [];

    if (userProfile.age) {
      context.push(language === 'es' ? `Edad: ${userProfile.age} años` : `Age: ${userProfile.age} years`);
    }

    if (userProfile.goalRace) {
      const raceNames: Record<string, string> = {
        '5k': '5K',
        '10k': '10K',
        'half_marathon': language === 'es' ? 'Media Maratón' : 'Half Marathon',
        'marathon': language === 'es' ? 'Maratón' : 'Marathon',
        'ultra': 'Ultra'
      };
      context.push(language === 'es' 
        ? `Objetivo de carrera: ${raceNames[userProfile.goalRace]}`
        : `Goal race: ${raceNames[userProfile.goalRace]}`
      );
    }

    if (userProfile.experienceLevel) {
      const levels: Record<string, string> = {
        'beginner': language === 'es' ? 'Principiante' : 'Beginner',
        'intermediate': language === 'es' ? 'Intermedio' : 'Intermediate',
        'advanced': language === 'es' ? 'Avanzado' : 'Advanced'
      };
      context.push(language === 'es'
        ? `Nivel: ${levels[userProfile.experienceLevel]}`
        : `Level: ${levels[userProfile.experienceLevel]}`
      );
    }

    if (userProfile.weeklyMileage) {
      context.push(language === 'es'
        ? `Kilometraje semanal: ${userProfile.weeklyMileage} millas`
        : `Weekly mileage: ${userProfile.weeklyMileage} miles`
      );
    }

    if (userProfile.injuryHistory && userProfile.injuryHistory.length > 0) {
      const activeInjuries = userProfile.injuryHistory.filter((injury: { recovered: boolean; type: string }) => !injury.recovered);
      if (activeInjuries.length > 0) {
        context.push(language === 'es'
          ? `Lesiones activas: ${activeInjuries.map((i: { type: string }) => i.type).join(', ')}`
          : `Active injuries: ${activeInjuries.map((i: { type: string }) => i.type).join(', ')}`
        );
      }
    }

    return context.join('\n');
  }

  private calculateConfidence(completion: OpenAI.Chat.Completions.ChatCompletion): number {
    // Simple confidence calculation based on response characteristics
    // In production, this could be more sophisticated
    const choice = completion.choices[0];
    const hasToolCalls = choice.message.tool_calls && choice.message.tool_calls.length > 0;
    const contentLength = choice.message.content?.length || 0;
    
    let confidence = 0.7; // Base confidence
    
    if (hasToolCalls) confidence += 0.2; // Tool usage indicates higher confidence
    if (contentLength > 100) confidence += 0.1; // Longer responses tend to be more confident
    
    return Math.min(confidence, 1.0);
  }
}