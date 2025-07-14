import { MemoryContext } from '@running-coach/shared';
export interface QdrantConfig {
    url: string;
    apiKey?: string;
    collectionName: string;
}
export interface OpenAIConfig {
    apiKey: string;
    model?: string;
    baseURL?: string;
}
export interface EmbeddingsConfig {
    apiKey: string;
    model?: string;
    baseURL?: string;
}
export interface MemoryEntry {
    id: string;
    userId: string;
    content: string;
    type: 'conversation' | 'run_data' | 'achievement' | 'goal';
    timestamp: Date;
    metadata?: Record<string, any>;
}
export declare class VectorMemory {
    private static instance;
    private qdrant;
    private openai;
    private embeddingsClient;
    private collectionName;
    private embeddingsModel;
    private model;
    private constructor();
    static getInstance(qdrantConfig?: QdrantConfig, openaiConfig?: OpenAIConfig, embeddingsConfig?: EmbeddingsConfig): VectorMemory;
    initialize(): Promise<void>;
    storeMemory(entry: MemoryEntry): Promise<string>;
    retrieveContext(userId: string, query: string, limit?: number): Promise<MemoryContext>;
    storeConversation(userId: string, role: 'user' | 'assistant', content: string): Promise<void>;
    storeRunData(userId: string, runSummary: string, details: Record<string, any>): Promise<void>;
    storeAchievement(userId: string, achievement: string, details?: Record<string, any>): Promise<void>;
    storeGoal(userId: string, goal: string, details?: Record<string, any>): Promise<void>;
    deleteUserMemories(userId: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    private generateEmbedding;
    private generateMemorySummary;
    private generateId;
}
//# sourceMappingURL=vector-memory.d.ts.map