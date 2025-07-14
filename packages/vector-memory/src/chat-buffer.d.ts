import { ChatMessage } from '@running-coach/shared';
export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
}
export declare class ChatBuffer {
    private static instance;
    private redis;
    private constructor();
    static getInstance(config?: RedisConfig): ChatBuffer;
    addMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, any>): Promise<void>;
    getMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
    getConversationContext(userId: string): Promise<Array<{
        role: string;
        content: string;
    }>>;
    clearUserChat(userId: string): Promise<void>;
    getUserSessionInfo(userId: string): Promise<{
        messageCount: number;
        lastActivity: Date | null;
        firstActivity: Date | null;
    }>;
    healthCheck(): Promise<boolean>;
    close(): Promise<void>;
    setUserState(userId: string, state: Record<string, any>, ttl?: number): Promise<void>;
    getUserState(userId: string): Promise<Record<string, string>>;
    clearUserState(userId: string): Promise<void>;
    incrementKey(key: string, ttl?: number): Promise<number>;
    getKeyValue(key: string): Promise<number>;
    private getUserChatKey;
    private getUserStateKey;
    private generateId;
}
//# sourceMappingURL=chat-buffer.d.ts.map