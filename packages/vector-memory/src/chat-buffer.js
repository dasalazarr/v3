import Redis from 'ioredis';
import { CHAT_BUFFER_SIZE, CHAT_BUFFER_TTL } from '@running-coach/shared';
export class ChatBuffer {
    static instance;
    redis;
    constructor(config) {
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
    static getInstance(config) {
        if (!ChatBuffer.instance) {
            if (!config) {
                throw new Error('Redis config required for first initialization');
            }
            ChatBuffer.instance = new ChatBuffer(config);
        }
        return ChatBuffer.instance;
    }
    async addMessage(userId, role, content, metadata) {
        const key = this.getUserChatKey(userId);
        const message = {
            id: this.generateId(),
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
                .ltrim(key, 0, CHAT_BUFFER_SIZE - 1)
                .expire(key, CHAT_BUFFER_TTL)
                .exec();
            console.log(`💬 Added ${role} message to chat buffer for user ${userId}`);
        }
        catch (error) {
            console.error(`❌ Error adding message to chat buffer for ${userId}:`, error);
            throw error;
        }
    }
    async getMessages(userId, limit) {
        const key = this.getUserChatKey(userId);
        const actualLimit = limit || CHAT_BUFFER_SIZE;
        try {
            const messages = await this.redis.lrange(key, 0, actualLimit - 1);
            return messages.map((msg) => JSON.parse(msg));
        }
        catch (error) {
            console.error(`❌ Error getting messages for ${userId}:`, error);
            return [];
        }
    }
    async getConversationContext(userId) {
        const messages = await this.getMessages(userId);
        return messages
            .reverse()
            .map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }
    async clearUserChat(userId) {
        const key = this.getUserChatKey(userId);
        try {
            await this.redis.del(key);
            console.log(`🗑️ Cleared chat buffer for user ${userId}`);
        }
        catch (error) {
            console.error(`❌ Error clearing chat buffer for ${userId}:`, error);
            throw error;
        }
    }
    async getUserSessionInfo(userId) {
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
    async healthCheck() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
    async close() {
        await this.redis.quit();
    }
    async setUserState(userId, state, ttl) {
        const key = this.getUserStateKey(userId);
        try {
            await this.redis.hmset(key, state);
            if (ttl) {
                await this.redis.expire(key, ttl);
            }
        }
        catch (error) {
            console.error(`❌ Error setting user state for ${userId}:`, error);
            throw error;
        }
    }
    async getUserState(userId) {
        const key = this.getUserStateKey(userId);
        try {
            return await this.redis.hgetall(key);
        }
        catch (error) {
            console.error(`❌ Error getting user state for ${userId}:`, error);
            return {};
        }
    }
    async clearUserState(userId) {
        const key = this.getUserStateKey(userId);
        try {
            await this.redis.del(key);
        }
        catch (error) {
            console.error(`❌ Error clearing user state for ${userId}:`, error);
            throw error;
        }
    }
    async incrementKey(key, ttl) {
        try {
            const count = await this.redis.incr(key);
            if (ttl) {
                await this.redis.expire(key, ttl);
            }
            return count;
        }
        catch (error) {
            console.error(`❌ Error incrementing key ${key}:`, error);
            throw error;
        }
    }
    async getKeyValue(key) {
        try {
            const val = await this.redis.get(key);
            return val ? parseInt(val, 10) : 0;
        }
        catch (error) {
            console.error(`❌ Error reading key ${key}:`, error);
            return 0;
        }
    }
    getUserChatKey(userId) {
        return `chat:${userId}`;
    }
    getUserStateKey(userId) {
        return `state:${userId}`;
    }
    generateId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
//# sourceMappingURL=chat-buffer.js.map