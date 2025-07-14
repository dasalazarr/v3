import OpenAI from 'openai';
import { franc } from 'franc';
export class AIAgent {
    openai;
    chatBuffer;
    vectorMemory;
    toolRegistry;
    model;
    constructor(openaiConfig, chatBuffer, vectorMemory, toolRegistry) {
        this.openai = new OpenAI({
            apiKey: openaiConfig.apiKey,
            baseURL: openaiConfig.baseURL,
        });
        this.chatBuffer = chatBuffer;
        this.vectorMemory = vectorMemory;
        this.toolRegistry = toolRegistry;
        this.model = openaiConfig.model || 'gpt-4';
    }
    async processMessage(request) {
        const { userId, message, userProfile, contextOverride } = request;
        try {
            await this.chatBuffer.addMessage(userId, 'user', message);
            await this.vectorMemory.storeConversation(userId, 'user', message);
            let language = 'es';
            if (userProfile?.preferredLanguage && (userProfile.preferredLanguage === 'en' || userProfile.preferredLanguage === 'es')) {
                language = userProfile.preferredLanguage;
                console.log(`🌐 Using user's preferred language: ${language}`);
            }
            else {
                language = this.detectLanguage(message);
                console.log(`🌐 Detected language: ${language}`);
            }
            const conversationHistory = contextOverride ||
                await this.chatBuffer.getConversationContext(userId);
            const memoryContext = await this.vectorMemory.retrieveContext(userId, message);
            const systemPrompt = this.buildSystemPrompt(userProfile, memoryContext, language);
            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.map((msg) => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: 'user', content: message }
            ];
            const tools = this.toolRegistry.getOpenAITools();
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
            const toolCalls = [];
            if (choice.message.tool_calls) {
                for (const toolCall of choice.message.tool_calls) {
                    try {
                        const result = await this.toolRegistry.execute({
                            name: toolCall.function.name,
                            parameters: { ...JSON.parse(toolCall.function.arguments), userId },
                        });
                        if (result.error === 'VALIDATION_FAILED') {
                            content = result.message;
                            toolCalls.pop();
                            break;
                        }
                        toolCalls.push({
                            name: toolCall.function.name,
                            parameters: JSON.parse(toolCall.function.arguments),
                            result,
                        });
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
                    }
                    catch (error) {
                        console.error(`Tool execution failed: ${toolCall.function.name}`, error);
                        toolCalls.push({
                            name: toolCall.function.name,
                            parameters: JSON.parse(toolCall.function.arguments),
                            result: { error: error instanceof Error ? error.message : 'Unknown error' },
                        });
                    }
                }
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
            await this.chatBuffer.addMessage(userId, 'assistant', content);
            await this.vectorMemory.storeConversation(userId, 'assistant', content);
            return {
                content,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                language,
                confidence: this.calculateConfidence(completion),
            };
        }
        catch (error) {
            console.error(`❌ Error processing message for ${userId}:`, error);
            throw error;
        }
    }
    async generateResponse(prompt, context) {
        try {
            const messages = [
                ...(context || []).map((msg) => ({
                    role: msg.role,
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
        }
        catch (error) {
            console.error('❌ Error generating response:', error);
            throw error;
        }
    }
    detectLanguage(text) {
        const detected = franc(text);
        return detected === 'spa' ? 'es' : 'en';
    }
    buildSystemPrompt(userProfile, memoryContext, language = 'en') {
        const basePrompt = language === 'es'
            ? this.getSpanishSystemPrompt()
            : this.getEnglishSystemPrompt();
        let enhancedPrompt = basePrompt;
        enhancedPrompt += `\n\n## LANGUAGE / IDIOMA:\n${language === 'es' ? 'Español' : 'English'}`;
        if (userProfile) {
            const profileContext = this.buildProfileContext(userProfile, language);
            const profileTitle = language === 'es' ? 'PERFIL DEL USUARIO' : 'USER PROFILE';
            enhancedPrompt += `\n\n## ${profileTitle}:\n${profileContext}`;
        }
        if (memoryContext?.summary) {
            const contextTitle = language === 'es' ? 'CONTEXTO RELEVANTE' : 'RELEVANT CONTEXT';
            enhancedPrompt += `\n\n## ${contextTitle}:\n${memoryContext.summary}`;
        }
        return enhancedPrompt;
    }
    getEnglishSystemPrompt() {
        return `You are an expert AI running coach specialized in personalized training plans and motivation. Your expertise includes:\n\n## CORE COMPETENCIES\n- Creating scientific training plans using Jack Daniels VDOT methodology\n- Analyzing running data and providing actionable insights\n- Motivating runners and adapting to their psychological state\n- Injury prevention and recovery guidance\n- Nutrition and hydration advice for runners\n\n## PERSONALITY\n- Encouraging and motivational, but realistic\n- Uses running community language and terminology\n- Celebrates achievements, no matter how small\n- Provides specific, actionable advice\n- Empathetic to struggles and setbacks\n\n## RESPONSE GUIDELINES\n- Always personalize responses using user's history and goals\n- Include specific training paces and distances when relevant\n- Suggest concrete next steps\n- Ask follow-up questions to gather more context\n- Use motivational language while being informative\n- Keep replies short and friendly, ideally under three sentences\n\n## AVAILABLE TOOLS\nYou have access to tools for:\n- Logging runs and workouts\n- Updating training plans\n- Generating VDOT-based pace recommendations\n- Scheduling workouts and rest days\n- Tracking progress and generating insights\n\nAlways use tools when the user provides data or requests specific actions.\n\n## PROACTIVE BEHAVIOR\nIf a user provides data that clearly describes a completed run (e.g., distance, duration, pace), you MUST proactively use the \`log_run\` tool to record it, even if not explicitly asked. After using the tool, confirm to the user that the run has been logged.`;
    }
    getSpanishSystemPrompt() {
        return `Eres un entrenador experto de running especializado en planes de entrenamiento personalizados y motivación. Tu experiencia incluye:\n\n## COMPETENCIAS PRINCIPALES\n- Crear planes de entrenamiento científicos usando la metodología VDOT de Jack Daniels\n- Analizar datos de running y proporcionar insights accionables\n- Motivar corredores y adaptarte a su estado psicológico\n- Prevención de lesiones y guía de recuperación\n- Consejos de nutrición e hidratación para corredores\n\n## PERSONALIDAD\n- Alentador y motivacional, pero realista\n- Usa el lenguaje y terminología de la comunidad runner\n- Celebra logros, sin importar cuán pequeños sean\n- Proporciona consejos específicos y accionables\n- Empático con las luchas y contratiempos\n\n## GUÍAS DE RESPUESTA\n- Siempre personaliza las respuestas usando el historial y objetivos del usuario\n- Incluye ritmos y distancias específicas cuando sea relevante\n- Sugiere pasos concretos a seguir\n- Haz preguntas de seguimiento para obtener más contexto\n- Usa lenguaje motivacional mientras eres informativo\n- Mantén las respuestas cortas y amables, idealmente en menos de tres frases\n\n## HERRAMIENTAS DISPONIBLES\nTienes acceso a herramientas para:\n- Registrar carreras y entrenamientos\n- Actualizar planes de entrenamiento\n- Generar recomendaciones de ritmo basadas en VDOT\n- Programar entrenamientos y días de descanso\n- Seguir progreso y generar insights\n\nSiempre usa las herramientas cuando el usuario proporcione datos o solicite acciones específicas.`;
    }
    buildProfileContext(userProfile, language) {
        const context = [];
        if (userProfile.age) {
            context.push(language === 'es' ? `Edad: ${userProfile.age} años` : `Age: ${userProfile.age} years`);
        }
        if (userProfile.goalRace) {
            const raceNames = {
                '5k': '5K',
                '10k': '10K',
                'half_marathon': language === 'es' ? 'Media Maratón' : 'Half Marathon',
                'marathon': language === 'es' ? 'Maratón' : 'Marathon',
                'ultra': 'Ultra'
            };
            context.push(language === 'es'
                ? `Objetivo de carrera: ${raceNames[userProfile.goalRace]}`
                : `Goal race: ${raceNames[userProfile.goalRace]}`);
        }
        if (userProfile.experienceLevel) {
            const levels = {
                'beginner': language === 'es' ? 'Principiante' : 'Beginner',
                'intermediate': language === 'es' ? 'Intermedio' : 'Intermediate',
                'advanced': language === 'es' ? 'Avanzado' : 'Advanced'
            };
            context.push(language === 'es'
                ? `Nivel: ${levels[userProfile.experienceLevel]}`
                : `Level: ${levels[userProfile.experienceLevel]}`);
        }
        if (userProfile.weeklyMileage) {
            context.push(language === 'es'
                ? `Kilometraje semanal: ${userProfile.weeklyMileage} millas`
                : `Weekly mileage: ${userProfile.weeklyMileage} miles`);
        }
        if (userProfile.injuryHistory && userProfile.injuryHistory.length > 0) {
            const activeInjuries = userProfile.injuryHistory.filter((injury) => !injury.recovered);
            if (activeInjuries.length > 0) {
                context.push(language === 'es'
                    ? `Lesiones activas: ${activeInjuries.map((i) => i.type).join(', ')}`
                    : `Active injuries: ${activeInjuries.map((i) => i.type).join(', ')}`);
            }
        }
        return context.join('\n');
    }
    calculateConfidence(completion) {
        const choice = completion.choices[0];
        const hasToolCalls = choice.message.tool_calls && choice.message.tool_calls.length > 0;
        const contentLength = choice.message.content?.length || 0;
        let confidence = 0.7;
        if (hasToolCalls)
            confidence += 0.2;
        if (contentLength > 100)
            confidence += 0.1;
        return Math.min(confidence, 1.0);
    }
}
//# sourceMappingURL=ai-agent.js.map