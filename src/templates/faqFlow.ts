import { addKeyword, EVENTS } from "@builderbot/bot";
import container from "../di/container";
import { AIService } from "../services/aiservices";

/**
 * Flujo para manejar preguntas frecuentes (FAQ) y conversaciones generales.
 * Se activa con cualquier mensaje que no coincida con otros flujos de palabras clave.
 */
export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
    
    // Ignora mensajes vacíos para evitar procesamientos innecesarios
    if (!ctx.body || ctx.body.trim().length === 0) {
      console.log("[FaqFlow] Mensaje vacío ignorado.");
      return; // No finaliza el flujo, solo ignora este evento
    }

    // Permite al usuario salir del flujo de preguntas
    if (ctx.body.toLowerCase().includes('terminar')) {
      return endFlow('¡Claro! Si tienes más preguntas, no dudes en consultarme. ¡A seguir corriendo! 🏃‍♂️💨');
    }

    try {
      const aiService = container.resolve(AIService);
      const userName = ctx.pushName || 'atleta'; // Fallback por si no viene el nombre
      console.log(`[FaqFlow] Procesando pregunta general de ${userName} (${ctx.from}): \"${ctx.body}\"`);
      
      // Llama al método de IA para respuestas generales, pasando el nombre del usuario
      const aiResponse = await aiService.getGeneralResponse(ctx.body, ctx.from, userName);

      if (aiResponse) {
        // Guarda la respuesta en el estado para posible referencia futura
        await state.update({ lastFaqAnswer: aiResponse });
        // Envía la respuesta al usuario
        await flowDynamic(aiResponse);
      } else {
        // Maneja el caso en que la IA no devuelva una respuesta
        await flowDynamic('Lo siento, no pude procesar tu pregunta en este momento. Inténtalo de nuevo más tarde.');
      }
    } catch (error) {
      console.error('❌ Error crítico en faqFlow:', error);
      // Informa al usuario del error de una manera amigable
      await flowDynamic('Uhm, algo no salió como esperaba. Mi equipo técnico ya fue notificado del problema.');
    }
    // El flujo no termina con endFlow() para permitir que la conversación continúe si el usuario responde.
    // El bot simplemente esperará el siguiente mensaje.
  });
