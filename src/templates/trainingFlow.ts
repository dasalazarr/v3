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
    const trainingDescription = ctx.body;

    if (!trainingDescription || trainingDescription.length < 10) {
        await flowDynamic('Por favor, describe tu entrenamiento con un poco más de detalle para que pueda ayudarte.');
        return endFlow();
    }

    try {
        // 1. Guardar el entrenamiento en Google Sheets de forma estructurada
        // (La implementación de este método se hará en el siguiente paso)
        await sheetsService.saveTrainingLog(ctx.from, trainingDescription);

        // 2. Enviar la descripción a la IA para obtener feedback
        await flowDynamic('¡Recibido! Analizando tu entrenamiento... 🏃‍♂️💨');
        const aiFeedback = await aiService.processMessage(trainingDescription, ctx.from);

        // 3. Enviar el feedback al usuario
        await flowDynamic(aiFeedback);

    } catch (error) {
        console.error('Error en trainingFlow:', error);
        await flowDynamic('Lo siento, ocurrió un error al registrar tu entrenamiento. Por favor, inténtalo de nuevo más tarde.');
    }
  });

export { trainingFlow };
