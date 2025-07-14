import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { UserProfile } from '@running-coach/shared';
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
    contextOverride?: Array<{
        role: string;
        content: string;
    }>;
}
export declare class AIAgent {
    private openai;
    private chatBuffer;
    private vectorMemory;
    private toolRegistry;
    private model;
    constructor(openaiConfig: OpenAIConfig, chatBuffer: ChatBuffer, vectorMemory: VectorMemory, toolRegistry: ToolRegistry);
    processMessage(request: ProcessMessageRequest): Promise<AgentResponse>;
    generateResponse(prompt: string, context?: Array<{
        role: string;
        content: string;
    }>): Promise<string>;
    private detectLanguage;
    private buildSystemPrompt;
    private getEnglishSystemPrompt;
    private getSpanishSystemPrompt;
    private buildProfileContext;
    private calculateConfidence;
}
//# sourceMappingURL=ai-agent.d.ts.map