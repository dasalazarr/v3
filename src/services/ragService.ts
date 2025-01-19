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
        // Inicializar ChromaDB con configuración persistente
        this.chromaClient = new ChromaClient({
            path: "http://localhost:8000",
            fetchOptions: {
                headers: {
                    'Content-Type': 'application/json',
                },
                // Aumentar el timeout y añadir retry
                signal: AbortSignal.timeout(120000), // 2 minutos de timeout
            }
        });
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: config.apiKey,
        });
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            let retries = 3;
            while (retries > 0) {
                try {
                    await this.initializeCollection();
                    this.initialized = true;
                    break;
                } catch (error) {
                    console.error(`Error initializing collection (${retries} retries left):`, error);
                    retries--;
                    if (retries === 0) {
                        throw new Error('Failed to initialize RAG collection after multiple attempts');
                    }
                    // Esperar antes de reintentar
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
    }

    private async initializeCollection(): Promise<void> {
        try {
            const embeddingFunction = {
                generate: async (texts: string[]) => {
                    const embeddings = await this.embeddings.embedDocuments(texts);
                    return embeddings;
                },
                dim: 1536 // Dimensión de los embeddings de OpenAI
            };

            // Intentar obtener la colección existente primero
            try {
                this.collection = await this.chromaClient.getCollection({
                    name: "contracts_collection",
                    embeddingFunction
                });
                console.log("Collection retrieved successfully");
            } catch (error) {
                // Si la colección no existe, crearla
                console.log("Creating new collection...");
                this.collection = await this.chromaClient.createCollection({
                    name: "contracts_collection",
                    embeddingFunction,
                    metadata: { 
                        "hnsw:space": "cosine",
                        "description": "Collection for storing contract embeddings"
                    }
                });
                console.log("New collection created successfully");
            }
        } catch (error) {
            console.error('Error in initializeCollection:', error);
            throw new Error('Failed to initialize RAG collection: ' + (error as Error).message);
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
