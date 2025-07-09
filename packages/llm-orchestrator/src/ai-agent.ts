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
    const { userId, message, userProfile, contextOverride } = request;

    try {
      // Store user message in chat buffer and vector memory
      await this.chatBuffer.addMessage(userId, 'user', message);
      await this.vectorMemory.storeConversation(userId, 'user', message);

      // Use preferred language from user profile or detect language
      let language: 'en' | 'es' = 'es'; // Default to Spanish
      
      if (userProfile?.preferredLanguage && (userProfile.preferredLanguage === 'en' || userProfile.preferredLanguage === 'es')) {
        language = userProfile.preferredLanguage;
        console.log(`🌐 Using user's preferred language: ${language}`);
      } else {
        // Fallback to language detection
        language = this.detectLanguage(message);
        console.log(`🌐 Detected language: ${language}`);
      }

      // Get conversation context
      const conversationHistory = contextOverride || 
        await this.chatBuffer.getConversationContext(userId);

      // Get relevant vector memory context
      const memoryContext = await this.vectorMemory.retrieveContext(userId, message);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(userProfile, memoryContext, language);

      // Prepare messages for OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
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
    const detected = franc(text);
    return detected === 'spa' ? 'es' : 'en';
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
    return `You are an expert AI running coach specialized in personalized training plans and motivation. Your expertise includes:\n\n## CORE COMPETENCIES\n- Creating scientific training plans using Jack Daniels VDOT methodology\n- Analyzing running data and providing actionable insights\n- Motivating runners and adapting to their psychological state\n- Injury prevention and recovery guidance\n- Nutrition and hydration advice for runners\n\n## PERSONALITY\n- Encouraging and motivational, but realistic\n- Uses running community language and terminology\n- Celebrates achievements, no matter how small\n- Provides specific, actionable advice\n- Empathetic to struggles and setbacks\n\n## RESPONSE GUIDELINES\n- Always personalize responses using user's history and goals\n- Include specific training paces and distances when relevant\n- Suggest concrete next steps\n- Ask follow-up questions to gather more context\n- Use motivational language while being informative\n- Keep replies short and friendly, ideally under three sentences\n\n## AVAILABLE TOOLS\nYou have access to tools for:\n- Logging runs and workouts\n- Updating training plans\n- Generating VDOT-based pace recommendations\n- Scheduling workouts and rest days\n- Tracking progress and generating insights\n\nAlways use tools when the user provides data or requests specific actions.\n\n## PROACTIVE BEHAVIOR\nIf a user provides data that clearly describes a completed run (e.g., distance, duration, pace), you MUST proactively use the \`log_run\` tool to record it, even if not explicitly asked. After using the tool, confirm to the user that the run has been logged.`
  }

  private getSpanishSystemPrompt(): string {
    return `Eres un entrenador experto de running especializado en planes de entrenamiento personalizados y motivación. Tu experiencia incluye:\n\n## COMPETENCIAS PRINCIPALES\n- Crear planes de entrenamiento científicos usando la metodología VDOT de Jack Daniels\n- Analizar datos de running y proporcionar insights accionables\n- Motivar corredores y adaptarte a su estado psicológico\n- Prevención de lesiones y guía de recuperación\n- Consejos de nutrición e hidratación para corredores\n\n## PERSONALIDAD\n- Alentador y motivacional, pero realista\n- Usa el lenguaje y terminología de la comunidad runner\n- Celebra logros, sin importar cuán pequeños sean\n- Proporciona consejos específicos y accionables\n- Empático con las luchas y contratiempos\n\n## GUÍAS DE RESPUESTA\n- Siempre personaliza las respuestas usando el historial y objetivos del usuario\n- Incluye ritmos y distancias específicas cuando sea relevante\n- Sugiere pasos concretos a seguir\n- Haz preguntas de seguimiento para obtener más contexto\n- Usa lenguaje motivacional mientras eres informativo\n- Mantén las respuestas cortas y amables, idealmente en menos de tres frases\n\n## HERRAMIENTAS DISPONIBLES\nTienes acceso a herramientas para:\n- Registrar carreras y entrenamientos\n- Actualizar planes de entrenamiento\n- Generar recomendaciones de ritmo basadas en VDOT\n- Programar entrenamientos y días de descanso\n- Seguir progreso y generar insights\n\nSiempre usa las herramientas cuando el usuario proporcione datos o solicite acciones específicas.`
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