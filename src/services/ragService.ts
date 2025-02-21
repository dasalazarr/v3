import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { config } from '~/config';
import { injectable, inject, container } from 'tsyringe';

interface DocumentMetadata {
    type: string;
    userId: string;
    timestamp: string;
    [key: string]: any;
}

interface DocumentEntry {
    id: string;
    content: string;
    metadata: DocumentMetadata;
    embedding?: number[];
}

@injectable()
export class RagService {
    private embeddings: OpenAIEmbeddings;
    private documents: DocumentEntry[] = [];
    private initialized: boolean = false;

    constructor(
        @inject('Config') private readonly config: { apiKey: string }
    ) {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: this.config.apiKey,
        });
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            this.initialized = true;
            console.log("In-memory storage initialized");
        }
    }

    async addDocument(content: string, metadata: DocumentMetadata): Promise<boolean> {
        try {
            await this.ensureInitialized();

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
            for (const doc of docs) {
                const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const embedding = await this.embeddings.embedQuery(doc.pageContent);

                this.documents.push({
                    id: docId,
                    content: doc.pageContent,
                    metadata: metadata,
                    embedding: embedding
                });
            }

            return true;
        } catch (error) {
            console.error('Error adding document:', error);
            return false;
        }
    }

    async queryDocuments(query: string, limit: number = 5): Promise<string[]> {
        try {
            await this.ensureInitialized();

            if (this.documents.length === 0) {
                return [];
            }

            const queryEmbedding = await this.embeddings.embedQuery(query);

            // Calcular similitud coseno con todos los documentos
            const similarities = this.documents.map(doc => ({
                doc,
                similarity: this.cosineSimilarity(queryEmbedding, doc.embedding || [])
            }));

            // Ordenar por similitud y obtener los top N resultados
            similarities.sort((a, b) => b.similarity - a.similarity);
            return similarities.slice(0, limit).map(item => item.doc.content);

        } catch (error) {
            console.error('Error querying documents:', error);
            return [];
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async searchSimilarQuestions(question: string): Promise<string[]> {
        return this.queryDocuments(question, 3);
    }
}

// Register dependencies
container.register('Config', { useValue: { apiKey: config.apiKey } });
container.registerSingleton('RagService', RagService);

// Export singleton instance
export default container.resolve(RagService);
