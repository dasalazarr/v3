import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { VECTOR_DIMENSION } from '@running-coach/shared';
export class VectorMemory {
    static instance;
    qdrant;
    openai;
    embeddingsClient;
    collectionName;
    embeddingsModel;
    model;
    constructor(qdrantConfig, openaiConfig, embeddingsConfig) {
        this.qdrant = new QdrantClient({
            url: qdrantConfig.url,
            apiKey: qdrantConfig.apiKey,
        });
        this.openai = new OpenAI({
            apiKey: openaiConfig.apiKey,
            baseURL: openaiConfig.baseURL,
        });
        this.model = openaiConfig.model || 'gpt-3.5-turbo';
        if (embeddingsConfig) {
            this.embeddingsClient = new OpenAI({
                apiKey: embeddingsConfig.apiKey,
                baseURL: embeddingsConfig.baseURL,
            });
            this.embeddingsModel = embeddingsConfig.model || 'text-embedding-ada-002';
        }
        else {
            this.embeddingsClient = this.openai;
            this.embeddingsModel = 'text-embedding-ada-002';
        }
        this.collectionName = qdrantConfig.collectionName;
    }
    static getInstance(qdrantConfig, openaiConfig, embeddingsConfig) {
        if (!VectorMemory.instance) {
            if (!qdrantConfig || !openaiConfig) {
                throw new Error('Both Qdrant and OpenAI configs required for first initialization');
            }
            VectorMemory.instance = new VectorMemory(qdrantConfig, openaiConfig, embeddingsConfig);
        }
        return VectorMemory.instance;
    }
    async initialize() {
        try {
            const collections = await this.qdrant.getCollections();
            const collectionExists = collections.collections.some(c => c.name === this.collectionName);
            if (!collectionExists) {
                await this.qdrant.createCollection(this.collectionName, {
                    vectors: {
                        size: VECTOR_DIMENSION,
                        distance: 'Cosine',
                    },
                });
                console.log(`✅ Created Qdrant collection: ${this.collectionName}`);
            }
            else {
                console.log(`✅ Qdrant collection already exists: ${this.collectionName}`);
            }
            try {
                await this.qdrant.createPayloadIndex(this.collectionName, {
                    field_name: 'userId',
                    field_schema: 'uuid',
                    wait: true,
                });
                console.log('✅ Created userId payload index');
            }
            catch (indexError) {
                if (indexError?.message?.includes('already exists') ||
                    indexError?.response?.status === 409) {
                    console.log('ℹ️ userId payload index already exists');
                }
                else {
                    console.error('❌ Error creating userId payload index:', indexError);
                }
            }
        }
        catch (error) {
            console.error('❌ Error initializing vector memory:', error);
            throw error;
        }
    }
    async storeMemory(entry) {
        try {
            const embedding = await this.generateEmbedding(entry.content);
            const vectorId = randomUUID();
            await this.qdrant.upsert(this.collectionName, {
                wait: true,
                points: [
                    {
                        id: vectorId,
                        vector: embedding,
                        payload: {
                            userId: entry.userId,
                            content: entry.content,
                            type: entry.type,
                            timestamp: entry.timestamp.toISOString(),
                            metadata: entry.metadata || {},
                        },
                    },
                ],
            });
            console.log(`🧠 Stored memory for user ${entry.userId}: ${entry.type}`);
            return vectorId;
        }
        catch (error) {
            console.error(`❌ Error storing memory for ${entry.userId}:`, error);
            throw error;
        }
    }
    async retrieveContext(userId, query, limit = 5) {
        try {
            const queryEmbedding = await this.generateEmbedding(query);
            const searchResult = await this.qdrant.search(this.collectionName, {
                vector: queryEmbedding,
                limit,
                filter: {
                    must: [
                        {
                            key: 'userId',
                            match: { value: userId },
                        },
                    ],
                },
                with_payload: true,
            });
            const relevantMemories = searchResult.map(result => ({
                content: result.payload?.content,
                timestamp: new Date(result.payload?.timestamp),
                relevanceScore: result.score || 0,
                type: result.payload?.type,
            }));
            let summary;
            if (relevantMemories.length > 0) {
                summary = await this.generateMemorySummary(query, relevantMemories);
            }
            return {
                userId,
                query,
                relevantMemories,
                summary,
            };
        }
        catch (error) {
            console.error(`❌ Error retrieving context for ${userId}:`, error);
            return {
                userId,
                query,
                relevantMemories: [],
            };
        }
    }
    async storeConversation(userId, role, content) {
        await this.storeMemory({
            id: this.generateId(),
            userId,
            content: `${role}: ${content}`,
            type: 'conversation',
            timestamp: new Date(),
            metadata: { role },
        });
    }
    async storeRunData(userId, runSummary, details) {
        await this.storeMemory({
            id: this.generateId(),
            userId,
            content: runSummary,
            type: 'run_data',
            timestamp: new Date(),
            metadata: details,
        });
    }
    async storeAchievement(userId, achievement, details) {
        await this.storeMemory({
            id: this.generateId(),
            userId,
            content: achievement,
            type: 'achievement',
            timestamp: new Date(),
            metadata: details,
        });
    }
    async storeGoal(userId, goal, details) {
        await this.storeMemory({
            id: this.generateId(),
            userId,
            content: goal,
            type: 'goal',
            timestamp: new Date(),
            metadata: details,
        });
    }
    async deleteUserMemories(userId) {
        try {
            await this.qdrant.delete(this.collectionName, {
                filter: {
                    must: [
                        {
                            key: 'userId',
                            match: { value: userId },
                        },
                    ],
                },
            });
            console.log(`🗑️ Deleted all memories for user ${userId}`);
        }
        catch (error) {
            console.error(`❌ Error deleting memories for ${userId}:`, error);
            throw error;
        }
    }
    async healthCheck() {
        try {
            const collections = await this.qdrant.getCollections();
            return collections.collections.some(c => c.name === this.collectionName);
        }
        catch (error) {
            console.error('Vector memory health check failed:', error);
            return false;
        }
    }
    async generateEmbedding(text) {
        try {
            const response = await this.embeddingsClient.embeddings.create({
                model: this.embeddingsModel,
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('❌ Error generating embedding:', error);
            throw error;
        }
    }
    async generateMemorySummary(query, memories) {
        try {
            const memoryText = memories
                .map(m => `[${m.type}, score: ${m.relevanceScore.toFixed(2)}] ${m.content}`)
                .join('\n');
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that summarizes relevant memories for a running coach AI. Create a concise summary of the most relevant information from the user\'s history that relates to their current query.',
                    },
                    {
                        role: 'user',
                        content: `Query: "${query}"\n\nRelevant memories:\n${memoryText}\n\nSummarize the most relevant information:`,
                    },
                ],
                max_tokens: 200,
                temperature: 0.3,
            });
            return response.choices[0].message.content || '';
        }
        catch (error) {
            console.error('❌ Error generating memory summary:', error);
            return '';
        }
    }
    generateId() {
        return randomUUID();
    }
}
//# sourceMappingURL=vector-memory.js.map