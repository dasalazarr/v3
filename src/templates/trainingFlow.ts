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

        if (extractedData) {
            console.log(`[TrainingFlow] Datos extraídos correctamente. Guardando en Sheets...`);
            await sheetsService.saveTrainingLog(ctx.from, trainingDescription, extractedData);
            console.log(`[TrainingFlow] Log estructurado guardado exitosamente para ${ctx.from}.`);
        } else {
            console.warn(`[TrainingFlow] No se pudieron extraer datos estructurados. El log no se guardará en formato estructurado. Revisa el prompt de extracción.`);
            // En el futuro, podríamos implementar un guardado del texto plano como fallback aquí.
        }

        console.log('[TrainingFlow] Solicitando feedback conversacional de la IA...');
        await flowDynamic('¡Recibido! Analizando tu entrenamiento... 🏃‍♂️💨');
        const aiFeedback = await aiService.processMessage(trainingDescription, ctx.from);
        console.log('[TrainingFlow] Feedback de la IA recibido.');

        await flowDynamic(aiFeedback);

    } catch (error) {
        console.error('❌ Error en trainingFlow:', error);
        await flowDynamic('Lo siento, ocurrió un error al procesar tu entrenamiento. Por favor, inténtalo de nuevo más tarde.');
    }
  });

export { trainingFlow };
