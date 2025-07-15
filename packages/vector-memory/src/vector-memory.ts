import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { MemoryContext, VECTOR_DIMENSION } from '@running-coach/shared';

interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
}

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

interface EmbeddingsConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

interface MemoryEntry {
  id: string;
  userId: string;
  content: string;
  type: 'conversation' | 'run_data' | 'achievement' | 'goal';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class VectorMemory {
  private static instance: VectorMemory;
  private qdrant: QdrantClient;
  private openai: OpenAI;
  private embeddingsClient: OpenAI;
  private collectionName: string;
  private embeddingsModel: string;
  private model: string;

  private constructor(qdrantConfig: QdrantConfig, openaiConfig: OpenAIConfig, embeddingsConfig?: EmbeddingsConfig) {
    this.qdrant = new QdrantClient({
      url: qdrantConfig.url,
      apiKey: qdrantConfig.apiKey,
    });

    this.openai = new OpenAI({
      apiKey: openaiConfig.apiKey,
      baseURL: openaiConfig.baseURL,
    });
    this.model = openaiConfig.model || 'gpt-3.5-turbo';
    
    // Use separate embeddings client if provided, otherwise use the same client
    if (embeddingsConfig) {
      this.embeddingsClient = new OpenAI({
        apiKey: embeddingsConfig.apiKey,
        baseURL: embeddingsConfig.baseURL,
      });
      this.embeddingsModel = embeddingsConfig.model || 'text-embedding-ada-002';
    } else {
      this.embeddingsClient = this.openai;
      this.embeddingsModel = 'text-embedding-ada-002';
    }

    this.collectionName = qdrantConfig.collectionName;
  }

  public static getInstance(qdrantConfig?: QdrantConfig, openaiConfig?: OpenAIConfig, embeddingsConfig?: EmbeddingsConfig): VectorMemory {
    if (!VectorMemory.instance) {
      if (!qdrantConfig || !openaiConfig) {
        throw new Error('Both Qdrant and OpenAI configs required for first initialization');
      }
      VectorMemory.instance = new VectorMemory(qdrantConfig, openaiConfig, embeddingsConfig);
    }
    return VectorMemory.instance;
  }

  /**
   * Initialize the vector collection
   */
  public async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.qdrant.getCollections();
      const collectionExists = collections.collections.some(
        c => c.name === this.collectionName
      );

      if (!collectionExists) {
        // Create collection
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_DIMENSION,
            distance: 'Cosine',
          },
        });
        console.log(`✅ Created Qdrant collection: ${this.collectionName}`);
      } else {
        console.log(`✅ Qdrant collection already exists: ${this.collectionName}`);
      }

      // Ensure payload index on userId exists
      try {
        await this.qdrant.createPayloadIndex(this.collectionName, {
          field_name: 'userId',
          field_schema: 'uuid',
          wait: true,
        });
        console.log('✅ Created userId payload index');
      } catch (indexError: any) {
        if (
          indexError?.message?.includes('already exists') ||
          indexError?.response?.status === 409
        ) {
          console.log('ℹ️ userId payload index already exists');
        } else {
          console.error('❌ Error creating userId payload index:', indexError);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing vector memory:', error);
      throw error;
    }
  }

  /**
   * Store a memory entry
   */
  public async storeMemory(entry: MemoryEntry): Promise<string> {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(entry.content);

      // Store in Qdrant using a UUID as point ID
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
    } catch (error) {
      console.error(`❌ Error storing memory for ${entry.userId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve relevant memories for a query
   */
  public async retrieveContext(userId: string, query: string, limit: number = 5): Promise<MemoryContext> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search for similar memories
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
        content: result.payload?.content as string,
        timestamp: new Date(result.payload?.timestamp as string),
        relevanceScore: result.score || 0,
        type: result.payload?.type as 'conversation' | 'run_data' | 'achievement' | 'goal',
      }));

      // Generate summary if we have relevant memories
      let summary: string | undefined;
      if (relevantMemories.length > 0) {
        summary = await this.generateMemorySummary(query, relevantMemories);
      }

      return {
        userId,
        query,
        relevantMemories,
        summary,
      };
    } catch (error) {
      console.error(`❌ Error retrieving context for ${userId}:`, error);
      return {
        userId,
        query,
        relevantMemories: [],
      };
    }
  }

  /**
   * Store conversation message as memory
   */
  public async storeConversation(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await this.storeMemory({
      id: this.generateId(),
      userId,
      content: `${role}: ${content}`,
      type: 'conversation',
      timestamp: new Date(),
      metadata: { role },
    });
  }

  /**
   * Store run data as memory
   */
  public async storeRunData(userId: string, runSummary: string, details: Record<string, any>): Promise<void> {
    await this.storeMemory({
      id: this.generateId(),
      userId,
      content: runSummary,
      type: 'run_data',
      timestamp: new Date(),
      metadata: details,
    });
  }

  /**
   * Store achievement as memory
   */
  public async storeAchievement(userId: string, achievement: string, details?: Record<string, any>): Promise<void> {
    await this.storeMemory({
      id: this.generateId(),
      userId,
      content: achievement,
      type: 'achievement',
      timestamp: new Date(),
      metadata: details,
    });
  }

  /**
   * Store goal as memory
   */
  public async storeGoal(userId: string, goal: string, details?: Record<string, any>): Promise<void> {
    await this.storeMemory({
      id: this.generateId(),
      userId,
      content: goal,
      type: 'goal',
      timestamp: new Date(),
      metadata: details,
    });
  }

  /**
   * Delete memories for a user
   */
  public async deleteUserMemories(userId: string): Promise<void> {
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
    } catch (error) {
      console.error(`❌ Error deleting memories for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for vector memory system
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const collections = await this.qdrant.getCollections();
      return collections.collections.some(c => c.name === this.collectionName);
    } catch (error) {
      console.error('Vector memory health check failed:', error);
      return false;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.embeddingsClient.embeddings.create({
        model: this.embeddingsModel,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generating embedding:', error);
      throw error;
    }
  }

  private async generateMemorySummary(
    query: string, 
    memories: Array<{content: string, relevanceScore: number, type: string}>
  ): Promise<string> {
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
    } catch (error) {
      console.error('❌ Error generating memory summary:', error);
      return '';
    }
  }

  private generateId(): string {
    return randomUUID();
  }
}