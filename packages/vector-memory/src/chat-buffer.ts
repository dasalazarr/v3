import Redis from 'ioredis';
import { ChatMessage, CHAT_BUFFER_SIZE, CHAT_BUFFER_TTL, generateId } from '@running-coach/shared';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export class ChatBuffer {
  private static instance: ChatBuffer;
  private redis: Redis;

  private constructor(config: RedisConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }

  public static getInstance(config?: RedisConfig): ChatBuffer {
    if (!ChatBuffer.instance) {
      if (!config) {
        throw new Error('Redis config required for first initialization');
      }
      ChatBuffer.instance = new ChatBuffer(config);
    }
    return ChatBuffer.instance;
  }

  /**
   * Add a message to the user's chat buffer
   */
  public async addMessage(
    userId: string, 
    role: 'user' | 'assistant' | 'system', 
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const key = this.getUserChatKey(userId);
    const message: ChatMessage = {
      id: generateId(),
      userId,
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    try {
      await this.redis
        .multi()
        .lpush(key, JSON.stringify(message))
        .ltrim(key, 0, CHAT_BUFFER_SIZE - 1) // Keep only last N messages
        .expire(key, CHAT_BUFFER_TTL)
        .exec();

      console.log(`💬 Added ${role} message to chat buffer for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error adding message to chat buffer for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get recent messages for a user
   */
  public async getMessages(userId: string, limit?: number): Promise<ChatMessage[]> {
    const key = this.getUserChatKey(userId);
    const actualLimit = limit || CHAT_BUFFER_SIZE;

    try {
      const messages = await this.redis.lrange(key, 0, actualLimit - 1);
      return messages.map((msg: string) => JSON.parse(msg) as ChatMessage);
    } catch (error) {
      console.error(`❌ Error getting messages for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get conversation context for AI processing
   */
  public async getConversationContext(userId: string): Promise<Array<{role: string, content: string}>> {
    const messages = await this.getMessages(userId);
    
    // Return in chronological order (oldest first) for AI context
    return messages
      .reverse()
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  /**
   * Clear chat buffer for a user
   */
  public async clearUserChat(userId: string): Promise<void> {
    const key = this.getUserChatKey(userId);
    try {
      await this.redis.del(key);
      console.log(`🗑️ Cleared chat buffer for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error clearing chat buffer for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user session info
   */
  public async getUserSessionInfo(userId: string): Promise<{
    messageCount: number;
    lastActivity: Date | null;
    firstActivity: Date | null;
  }> {
    const messages = await this.getMessages(userId);
    
    if (messages.length === 0) {
      return {
        messageCount: 0,
        lastActivity: null,
        firstActivity: null
      };
    }

    const timestamps = messages.map(m => new Date(m.timestamp));
    timestamps.sort((a, b) => a.getTime() - b.getTime());

    return {
      messageCount: messages.length,
      firstActivity: timestamps[0],
      lastActivity: timestamps[timestamps.length - 1]
    };
  }

  /**
   * Health check for Redis connection
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Set user state/context
   */
  public async setUserState(userId: string, state: Record<string, any>, ttl?: number): Promise<void> {
    const key = this.getUserStateKey(userId);
    try {
      await this.redis.hmset(key, state);
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
    } catch (error) {
      console.error(`❌ Error setting user state for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user state/context
   */
  public async getUserState(userId: string): Promise<Record<string, string>> {
    const key = this.getUserStateKey(userId);
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      console.error(`❌ Error getting user state for ${userId}:`, error);
      return {};
    }
  }

  /**
   * Clear user state
   */
  public async clearUserState(userId: string): Promise<void> {
    const key = this.getUserStateKey(userId);
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`❌ Error clearing user state for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Increment a generic counter key with optional TTL
   */
  public async incrementKey(
    key: string,
    ttl?: number
  ): Promise<number> {
    try {
      const count = await this.redis.incr(key);
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
      return count;
    } catch (error) {
      console.error(`❌ Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get numeric value of a key
   */
  public async getKeyValue(key: string): Promise<number> {
    try {
      const val = await this.redis.get(key);
      return val ? parseInt(val, 10) : 0;
    } catch (error) {
      console.error(`❌ Error reading key ${key}:`, error);
      return 0;
    }
  }

  private getUserChatKey(userId: string): string {
    return `chat:${userId}`;
  }

  private getUserStateKey(userId: string): string {
    return `state:${userId}`;
  }


}