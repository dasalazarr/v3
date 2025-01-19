import { ChromaClient, Collection } from 'chromadb';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '~/config';

interface DocumentMetadata {
    type: string;
    userId: string;
    timestamp: string;
    [key: string]: any;
}

class RagService {
    private chromaClient: ChromaClient;
    private embeddings: OpenAIEmbeddings;
    private collection: Collection | null = null;
    private initialized: boolean = false;

    constructor() {
        this.chromaClient = new ChromaClient({
            path: "http://localhost:8000",  // ChromaDB server URL
            fetchOptions: {
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(60000)  // 60 second timeout
            }
        });
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: config.apiKey,
        });
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initializeCollection();
            this.initialized = true;
        }
    }

    private async initializeCollection(): Promise<void> {
        try {
            this.collection = await this.chromaClient.getOrCreateCollection({
                name: "contracts_collection",
                metadata: { "hnsw:space": "cosine" }
            });
        } catch (error) {
            console.error('Error initializing collection:', error);
            throw new Error('Failed to initialize RAG collection');
        }
    }

    async addDocument(content: string, metadata: DocumentMetadata): Promise<boolean> {
        await this.ensureInitialized();
        
        try {
            if (!content.trim()) {
                throw new Error('Empty document content');
            }

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });

            const docs = await splitter.createDocuments([content]);
            const embeddings = await this.embeddings.embedDocuments(
                docs.map(doc => doc.pageContent)
            );

            if (!this.collection) {
                throw new Error('Collection not initialized');
            }

            await this.collection.add({
                ids: docs.map((_, i) => `doc_${Date.now()}_${i}`),
                embeddings,
                documents: docs.map(doc => doc.pageContent),
                metadatas: docs.map((_, index) => ({ ...metadata, chunkIndex: index })),
            });

            return true;
        } catch (error) {
            console.error('Error adding document:', error);
            throw new Error('Failed to add document to RAG system');
        }
    }

    async queryDocuments(query: string, numResults: number = 3): Promise<string[]> {
        await this.ensureInitialized();
        
        try {
            if (!query.trim()) {
                throw new Error('Empty query string');
            }

            if (!this.collection) {
                throw new Error('Collection not initialized');
            }

            const queryEmbedding = await this.embeddings.embedQuery(query);
            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: numResults,
            });

            return results.documents[0] || [];
        } catch (error) {
            console.error('Error querying documents:', error);
            throw new Error('Failed to query RAG system');
        }
    }

    async generateResponse(query: string, context: string[]): Promise<string> {
        if (!context || context.length === 0) {
            return "No hay información relevante disponible.";
        }

        const contextText = context.join('\n\n');
        const prompt = `
Basado en el siguiente contexto, responde la pregunta.

Contexto:
${contextText}

Pregunta:
${query}

Respuesta:`;

        return prompt;
    }
}

export default RagService;
