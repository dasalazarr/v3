export interface MultiAgentConfig {
  enabled: boolean;
  percentage: number;
  enableReflection: boolean;
  agentTimeout: number;
  maxRetries: number;
}

export interface WorkflowContext {
  userId: string;
  message: string;
  userProfile: any;
  language: 'en' | 'es';
}

export interface WorkflowResult {
  success: boolean;
  content: string;
  executionTime: number;
  multiAgentUsed: boolean;
}