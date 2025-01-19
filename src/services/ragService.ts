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
        // Inicializar ChromaDB en modo persistente local
        this.chromaClient = new ChromaClient({
            path: "./chroma_db",  // Directorio local para almacenamiento
            fetchOptions: {
                headers: {
                    'Content-Type': 'application/json',
                }
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
                        // Si fallamos después de todos los reintentos, continuamos sin RAG
                        console.warn('Failed to initialize RAG, continuing without context');
                        this.initialized = true; // Evitar más reintentos
                        return;
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    }

    private async initializeCollection(): Promise<void> {
        try {
            const embeddingFunction = {
                generate: async (texts: string[]) => {
                    try {
                        const embeddings = await this.embeddings.embedDocuments(texts);
                        return embeddings;
                    } catch (error) {
                        console.error('Error generating embeddings:', error);
                        return texts.map(() => new Array(1536).fill(0)); // Fallback embeddings
                    }
                },
                dim: 1536
            };

            try {
                console.log("Attempting to get existing collection...");
                this.collection = await this.chromaClient.getCollection({
                    name: "contracts_collection",
                    embeddingFunction
                });
                console.log("Successfully retrieved existing collection");
            } catch (error) {
                console.log("Collection not found, creating new one...");
                this.collection = await this.chromaClient.createCollection({
                    name: "contracts_collection",
                    embeddingFunction,
                    metadata: {
                        "hnsw:space": "cosine",
                        "description": "Collection for storing contract embeddings"
                    }
                });
                console.log("Successfully created new collection");
            }
        } catch (error) {
            console.error('Error in initializeCollection:', error);
            throw new Error('Failed to initialize RAG collection: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    async addDocument(content: string, metadata: DocumentMetadata): Promise<boolean> {
        try {
            await this.ensureInitialized();
            
            if (!this.collection) {
                console.warn('Collection not initialized, skipping document addition');
                return false;
            }

            if (!content.trim()) {
                throw new Error('Empty document content');
            }

            // Dividir el documento en chunks manejables
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200
            });

            const docs = await textSplitter.createDocuments([content]);
            
            // Procesar cada chunk
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                await this.collection.add({
                    ids: [`${metadata.userId}_${Date.now()}_${i}`],
                    metadatas: [{ ...metadata, chunk: i, totalChunks: docs.length }],
                    documents: [doc.pageContent]
                });
            }

            return true;
        } catch (error) {
            console.error('Error adding document:', error);
            return false;
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
