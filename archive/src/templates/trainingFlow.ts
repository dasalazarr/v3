import { addKeyword, EVENTS } from "@builderbot/bot";
import container from "../di/container";
import { SheetsService } from "../services/sheetsServices";
import { AIService } from "../services/aiservices";

// Inyectar dependencias
const sheetsService = container.resolve<SheetsService>("SheetsService");
const aiService = container.resolve<AIService>("AIService");

/**
 * Flujo para registrar un entrenamiento y obtener feedback.
 * Se activa con palabras clave como 'entrenar', 'corrí', 'entrenamiento'.
 */
const trainingFlow = addKeyword(['entrenar', 'corrí', 'entrenamiento', 'entreno'])
  .addAction(async (ctx, { flowDynamic, endFlow }) => {
    console.log('[TrainingFlow] Flujo de entrenamiento activado.');
    const trainingDescription = ctx.body;

    if (!trainingDescription || trainingDescription.length < 10) {
        console.log('[TrainingFlow] Descripción de entrenamiento muy corta. Finalizando flujo.');
        await flowDynamic('Por favor, describe tu entrenamiento con un poco más de detalle para que pueda ayudarte.');
        return endFlow();
    }

    try {
        console.log(`[TrainingFlow] Extrayendo datos estructurados del texto...`);
        const extractedData = await aiService.extractTrainingData(trainingDescription);

        console.log(`[TrainingFlow] Guardando log de entrenamiento...`);
        await sheetsService.saveTrainingLog(ctx.from, trainingDescription, extractedData);
        console.log(`[TrainingFlow] Log guardado exitosamente para ${ctx.from}.`);

        console.log('[TrainingFlow] Solicitando feedback conversacional de la IA...');
        await flowDynamic('¡Recibido! Analizando tu entrenamiento... 🏃‍♂️💨');
        
        const userName = ctx.pushName || 'campeón'; // Fallback por si no se obtiene el nombre
        const aiFeedback = await aiService.processMessage(trainingDescription, ctx.from, userName);
        
        if (aiFeedback) {
            console.log('[TrainingFlow] Enviando feedback estructurado...');
            await flowDynamic([{ body: aiFeedback.reaction, delay: 500 }]);
            await flowDynamic([{ body: aiFeedback.analysis, delay: 1200 }]);
            await flowDynamic([{ body: aiFeedback.tips, delay: 1500 }]);
            await flowDynamic([{ body: aiFeedback.question, delay: 1000 }]);
            console.log('✅ [TrainingFlow] Feedback enviado.');
        } else {
            console.error('[TrainingFlow] No se recibió feedback estructurado de la IA.');
            await flowDynamic('No pude generar un análisis detallado esta vez, pero ¡sigue así! Tu esfuerzo ha sido registrado.');
        }

    } catch (error) {
        console.error('❌ Error en trainingFlow:', error);
        await flowDynamic('Lo siento, ocurrió un error al procesar tu entrenamiento. Por favor, inténtalo de nuevo más tarde.');
    }
  });

export { trainingFlow };
