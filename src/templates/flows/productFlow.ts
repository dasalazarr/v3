import { addKeyword } from '@builderbot/bot';
import SheetManager from '../../services/sheetsServices';
import aiServices from '../../services/aiservices';

export const productFlow = addKeyword(['producto', 'precio', 'catálogo'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    const aiService = new aiServices();
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await SheetManager.getUserConv(phoneNumber);
      
      // Crear el prompt con el contexto del historial
      const systemPrompt = `Eres un experto asesor de ventas. 
      Analiza la consulta del cliente sobre productos y proporciona información detallada y relevante.
      
      Historial reciente de conversación:
      ${conversations.map(conv => `${conv.role}: ${conv.content}`).join('\n')}
      
      Estructura tu respuesta en formato JSON:
      {
        "respuestaPrincipal": "Descripción principal del producto o respuesta a la consulta",
        "detallesProducto": {
          "nombre": "Nombre del producto consultado",
          "precio": "Precio o rango de precios",
          "características": ["característica1", "característica2"],
          "disponibilidad": "Estado de disponibilidad"
        },
        "sugerencias": ["Producto relacionado 1", "Producto relacionado 2"],
        "preguntasAdicionales": ["Pregunta para entender mejor la necesidad del cliente"],
        "promocionesRelevantes": ["Promoción 1", "Promoción 2"]
      }`;

      // Obtener respuesta de GPT-4
      const result = await aiService.chat(systemPrompt, [
        { role: 'user', content: ctx.body }
      ]);

      // Procesar la respuesta
      const aiResponse = JSON.parse(result.resumenEjecutivo);
      
      // Enviar la respuesta principal
      await ctx.sendText(aiResponse.respuestaPrincipal);

      // Enviar detalles del producto si están disponibles
      if (aiResponse.detallesProducto) {
        const detalles = aiResponse.detallesProducto;
        await ctx.sendText(`📦 ${detalles.nombre}\n💰 ${detalles.precio}\n\n✨ Características principales:\n${detalles.características.join('\n')}\n\n📍 ${detalles.disponibilidad}`);
      }

      // Enviar sugerencias de productos relacionados
      if (aiResponse.sugerencias && aiResponse.sugerencias.length > 0) {
        await ctx.sendText('También te podrían interesar:');
        await ctx.sendText(aiResponse.sugerencias.join('\n'));
      }

      // Enviar promociones relevantes
      if (aiResponse.promocionesRelevantes && aiResponse.promocionesRelevantes.length > 0) {
        await ctx.sendText('🎉 Promociones actuales:');
        await ctx.sendText(aiResponse.promocionesRelevantes.join('\n'));
      }

      // Hacer preguntas adicionales si es necesario
      if (aiResponse.preguntasAdicionales && aiResponse.preguntasAdicionales.length > 0) {
        await ctx.sendText('Para ayudarte mejor, ¿podrías responder estas preguntas?');
        await ctx.sendText(aiResponse.preguntasAdicionales.join('\n'));
      }

      // Registrar la interacción
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: JSON.stringify(aiResponse) }
      ]);
      
    } catch (error) {
      console.error('Error en product flow:', error);
      await ctx.sendText('Lo siento, hubo un error al procesar tu consulta sobre productos. ¿Podrías intentarlo nuevamente?');
      
      // Registrar el error
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + error.message }
      ]);
    }
  });
