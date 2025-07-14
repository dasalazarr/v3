// Simple service without external dependencies
import { SimpleOrchestrator } from './orchestrator.js';
import { MultiAgentConfig, WorkflowContext, WorkflowResult } from './types.js';
import logger from '../services/logger-service.js';

export class MultiAgentService {
  private orchestrator: SimpleOrchestrator;

  constructor(aiAgent: any, config: MultiAgentConfig) {
    this.orchestrator = new SimpleOrchestrator(aiAgent, config);
  }

  async processMessage(context: WorkflowContext): Promise<WorkflowResult> {
    logger.info({ 
      userId: context.userId,
      messageLength: context.message.length
    }, '[MULTI_AGENT] Processing message');

    const result = await this.orchestrator.executeWorkflow(context);

    logger.info({ 
      userId: context.userId,
      success: result.success,
      multiAgentUsed: result.multiAgentUsed,
      executionTime: result.executionTime
    }, '[MULTI_AGENT] Workflow completed');

    return result;
  }
}