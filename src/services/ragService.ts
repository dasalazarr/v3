import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { config } from '~/config';

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

class RagService {
    private embeddings: OpenAIEmbeddings;
    private documents: DocumentEntry[] = [];
    private initialized: boolean = false;

    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: config.apiKey,
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
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                const docId = `${metadata.userId}_${Date.now()}_${i}`;
                
                try {
                    // Generar embedding
                    const embedding = await this.embeddings.embedQuery(doc.pageContent);
                    
                    // Almacenar documento
                    this.documents.push({
                        id: docId,
                        content: doc.pageContent,
                        metadata: { ...metadata, chunk: i, totalChunks: docs.length },
                        embedding
                    });
                } catch (error) {
                    console.error('Error generating embedding:', error);
                    // Almacenar sin embedding en caso de error
                    this.documents.push({
                        id: docId,
                        content: doc.pageContent,
                        metadata: { ...metadata, chunk: i, totalChunks: docs.length }
                    });
                }
            }

            console.log(`Added ${docs.length} chunks to in-memory storage`);
            return true;
        } catch (error) {
            console.error('Error adding document:', error);
            return false;
        }
    }

    async queryDocuments(query: string, numResults: number = 3): Promise<string[]> {
        try {
            await this.ensureInitialized();

            if (this.documents.length === 0) {
                return ['No hay documentos almacenados para consultar.'];
            }

            // Generar embedding para la consulta
            const queryEmbedding = await this.embeddings.embedQuery(query);

            // Filtrar documentos que tienen embeddings
            const docsWithEmbeddings = this.documents.filter(doc => doc.embedding);

            if (docsWithEmbeddings.length === 0) {
                // Si no hay documentos con embeddings, devolver los más recientes
                return this.documents
                    .slice(-numResults)
                    .map(doc => doc.content);
            }

            // Calcular similitud coseno
            const similarities = docsWithEmbeddings.map(doc => ({
                content: doc.content,
                score: this.cosineSimilarity(queryEmbedding, doc.embedding!)
            }));

            // Ordenar por similitud y obtener los top N resultados
            return similarities
                .sort((a, b) => b.score - a.score)
                .slice(0, numResults)
                .map(result => result.content);

        } catch (error) {
            console.error('Error querying documents:', error);
            // En caso de error, devolver los documentos más recientes
            return this.documents
                .slice(-numResults)
                .map(doc => doc.content);
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return dotProduct / (magnitudeA * magnitudeB);
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
