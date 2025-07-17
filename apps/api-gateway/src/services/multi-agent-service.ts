import * as fs from 'fs/promises';
// Simplified service without external dependencies
import { MultiAgentService } from '../multi-agent/service.js';
import { createRunLoggerTool } from '../tools/run-logger.js';
import { Database } from '@running-coach/database';
import { VectorMemory } from '@running-coach/vector-memory';
import { MultiAgentConfig, WorkflowContext } from '../multi-agent/types.js';
import logger from './logger-service.js';

export class MultiAgentServiceWrapper {
  private multiAgentService: MultiAgentService;
  private runLoggerTool: ReturnType<typeof createRunLoggerTool>;

  constructor(
    private aiAgent: any,
    private db: Database,
    private vectorMemory: any,
    config: MultiAgentConfig
  ) {
    this.runLoggerTool = createRunLoggerTool(this.db, this.vectorMemory);
    this.multiAgentService = new MultiAgentService(aiAgent, config);
  }

  async processMessage(
    userId: string,
    message: string,
    userProfile: any,
    language: 'en' | 'es'
  ) {
    try {
      // 1. Load the activity extraction prompt
      const promptPath = './assets/prompts/prompt_activity_extraction.txt';
      const promptTemplate = await fs.readFile(promptPath, 'utf-8');
      const prompt = promptTemplate.replace('{{MESSAGE}}', message);

      // 2. Call the LLM for intent and data extraction
      const extractionResult = await this.aiAgent.chat(prompt, {
        response_format: { type: "json_object" }
      });
      const parsedResult = JSON.parse(extractionResult.text);

      logger.info({ userId, parsedResult }, '[MULTI_AGENT] Parsed extraction result');

      // 3. Based on the extracted intent, call the appropriate tool or handle the message
      const startTime = Date.now();
      switch (parsedResult.intent) {
        case 'log_activity': {
          const activityData = { ...parsedResult.data, userId };
          const logResult = await this.runLoggerTool.execute(activityData);

          // Generate synthesis response
          let synthesisText = '';
          if (logResult.success) {
            const synthesisPromptPath = './assets/prompts/prompt_synthesis.txt';
            const synthesisPromptTemplate = await fs.readFile(synthesisPromptPath, 'utf-8');
            const synthesisInput = JSON.stringify({
              activity_data: parsedResult.data,
              log_result: logResult,
            });
            const synthesisPrompt = synthesisPromptTemplate.replace('{{INPUT_JSON}}', synthesisInput);
            const synthesisResponse = await this.aiAgent.chat(synthesisPrompt);
            synthesisText = synthesisResponse.text;
          }

          return {
            response: logResult.success ? synthesisText : (logResult.error || 'Error al registrar la actividad.'),
            toolExecuted: true,
            toolName: this.runLoggerTool.name,
            toolOutput: logResult,
            multiAgentUsed: true,
            executionTime: Date.now() - startTime,
            success: !!logResult.success
          };
        }
        case 'add_note': {
          return {
            response: 'Gracias, he tomado nota de tu comentario.',
            toolExecuted: false,
            toolName: undefined,
            toolOutput: undefined,
            multiAgentUsed: true,
            executionTime: Date.now() - startTime,
            success: true
          };
        }
        case 'question': {
          return {
            response: 'Gracias por tu pregunta. Estoy procesando la información para darte una respuesta.',
            toolExecuted: false,
            toolName: undefined,
            toolOutput: undefined,
            multiAgentUsed: true,
            executionTime: Date.now() - startTime,
            success: true
          };
        }
        case 'other':
        default: {
          // If no specific intent, pass to the general multi-agent service
          const context: WorkflowContext = {
            userId,
            message,
            userProfile,
            language
          };
          const result = await this.multiAgentService.processMessage(context);
          return {
            response: result.content,
            toolExecuted: false,
            toolName: undefined,
            toolOutput: undefined,
            multiAgentUsed: result.multiAgentUsed,
            executionTime: result.executionTime,
            success: result.success
          };
        }
      }
    } catch (error) {
      logger.error({ userId, error }, '[MULTI_AGENT] Error processing message');
      throw error;
    }
  }

  shouldUseMultiAgent(message: string): boolean {
    return true; // All messages now go through the NLP pipeline for intent classification
  }
}