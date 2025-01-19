import { addKeyword } from "@builderbot/bot";
import aiServices from "~/services/aiservices";
import RagService from '../services/ragService';

const aiService = new aiServices();
const ragService = new RagService();

export const contractFlow = addKeyword(['contrato', 'documento'])
    .addAnswer(
        ['¡Bienvenido al Sistema de Gestión de Contratos! 📄\n',
         'Por favor, selecciona una opción:\n',
         '1️⃣ Analizar un contrato (envía un documento)\n',
         '2️⃣ Consultar contratos existentes\n',
         '3️⃣ Crear un nuevo contrato\n',
         '4️⃣ Firmar un contrato\n',
         '5️⃣ Ver estado de contratos'].join(''),
        { capture: true },
        async (ctx, { flowDynamic, fallBack }) => {
            const option = ctx.body;

            switch (option) {
                case '1':
                    return flowDynamic([
                        'Por favor, envía el contrato que deseas analizar. 📎',
                        'Puedo procesar documentos en formato PDF, DOC, DOCX o TXT.',
                        'Analizaré el contenido y te proporcionaré un resumen detallado.'
                    ]);
                case '2':
                    return flowDynamic([
                        '¿Qué información necesitas sobre los contratos? 🔍',
                        'Puedes preguntar sobre:\n',
                        '- Términos y condiciones específicos\n',
                        '- Fechas y plazos\n',
                        '- Obligaciones y responsabilidades\n',
                        '- Estado actual del contrato'
                    ]);
                case '3':
                    return flowDynamic([
                        '¿Qué tipo de contrato necesitas crear? ✍️\n',
                        'Disponible:\n',
                        '- Contrato de servicios\n',
                        '- Acuerdo de confidencialidad\n',
                        '- Contrato laboral\n',
                        '- Contrato de arrendamiento\n',
                        'Especifica el tipo y te guiaré en el proceso.'
                    ]);
                case '4':
                    return flowDynamic([
                        'Para firmar un contrato necesito:\n',
                        '1. ID del contrato a firmar\n',
                        '2. Tu identificación\n',
                        'Por favor, proporciona esta información.'
                    ]);
                case '5':
                    return flowDynamic([
                        'Consultando estado de contratos... 📊\n',
                        'Te mostraré:\n',
                        '- Contratos pendientes de firma\n',
                        '- Contratos activos\n',
                        '- Contratos próximos a vencer'
                    ]);
                default:
                    return fallBack('Por favor, selecciona una opción válida (1-5)');
            }
        }
    )
    .addAction(async (ctx, { flowDynamic }) => {
        // Manejar documentos adjuntos
        if (ctx.message?.hasMedia) {
            try {
                const media = await ctx.downloadMedia();
                if (media) {
                    await flowDynamic('Procesando documento... ⏳');
                    
                    // Procesar el documento con RAG
                    await ragService.addDocument(media.data, {
                        type: 'contract',
                        userId: ctx.from,
                        timestamp: new Date().toISOString(),
                        filename: media.filename || 'unknown',
                        mimetype: media.mimetype || 'unknown'
                    });
                    
                    // Analizar el contenido del documento
                    const analysis = await aiService.chat(
                        'Analiza este contrato y proporciona un resumen estructurado incluyendo: ' +
                        '1. Partes involucradas ' +
                        '2. Objeto del contrato ' +
                        '3. Términos principales ' +
                        '4. Obligaciones clave ' +
                        '5. Fechas importantes ' +
                        '6. Cláusulas especiales',
                        [], true
                    );
                    
                    return flowDynamic([
                        '✅ Documento procesado y analizado:\n\n',
                        analysis.resumenEjecutivo,
                        '\n\nPuedes hacerme preguntas específicas sobre el contenido del contrato.'
                    ]);
                }
            } catch (error) {
                console.error('Error processing document:', error);
                return flowDynamic([
                    '❌ Hubo un error al procesar el documento.',
                    'Por favor, verifica que:',
                    '1. El formato sea compatible (PDF, DOC, DOCX, TXT)',
                    '2. El archivo no esté dañado',
                    '3. El tamaño sea menor a 10MB',
                    'Intenta nuevamente o contacta soporte si el problema persiste.'
                ]);
            }
        }

        // Manejar consultas de texto
        if (ctx.body && typeof ctx.body === 'string') {
            try {
                const response = await aiService.chat(ctx.body, [], true);
                return flowDynamic(response.resumenEjecutivo);
            } catch (error) {
                console.error('Error processing query:', error);
                return flowDynamic('Lo siento, hubo un error al procesar tu consulta. ¿Podrías reformularla?');
            }
        }
    });
