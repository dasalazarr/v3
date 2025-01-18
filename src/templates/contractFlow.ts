import { addKeyword } from "@builderbot/bot";
import aiServices from "~/services/aiservices";
import RagService from '../services/ragService';

const aiService = new aiServices();
const ragService = new RagService();

export const contractFlow = addKeyword(['contrato', 'documento'])
    .addAnswer(
        '¡Hola! ¿Qué te gustaría hacer con el contrato?\n1. Analizar un contrato\n2. Hacer preguntas sobre contratos existentes\n3. Crear un nuevo contrato',
        { capture: true },
        async (ctx, { flowDynamic, fallBack }) => {
            const option = ctx.body;

            switch (option) {
                case '1':
                    return flowDynamic('Por favor, envía el contrato que deseas analizar.');
                case '2':
                    return flowDynamic('¿Qué te gustaría saber sobre los contratos?');
                case '3':
                    return flowDynamic('¿Qué tipo de contrato necesitas crear?');
                default:
                    return fallBack('Por favor, selecciona una opción válida (1, 2 o 3)');
            }
        }
    )
    .addAction(async (ctx, { flowDynamic }) => {
        // Manejar documentos adjuntos
        if (ctx.message?.hasMedia) {
            try {
                const media = await ctx.downloadMedia();
                if (media) {
                    // Procesar el documento con RAG
                    await ragService.addDocument(media.data, {
                        type: 'contract',
                        userId: ctx.from,
                        timestamp: new Date().toISOString()
                    });
                    
                    return flowDynamic('¡Documento procesado! Ahora puedes hacerme preguntas sobre él.');
                }
            } catch (error) {
                console.error('Error processing document:', error);
                return flowDynamic('Hubo un error al procesar el documento. Por favor, intenta nuevamente.');
            }
        }

        // Manejar consultas de texto
        if (ctx.body && typeof ctx.body === 'string') {
            try {
                const response = await aiService.chat(ctx.body, [], true);
                return flowDynamic(response.resumenEjecutivo);
            } catch (error) {
                console.error('Error processing query:', error);
                return flowDynamic('Hubo un error al procesar tu consulta. Por favor, intenta nuevamente.');
            }
        }
    });
