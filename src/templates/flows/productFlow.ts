import { addKeyword } from '@builderbot/bot';
import { container } from 'tsyringe';
import { SheetManager } from '../../services/sheetsServices';
import { AIServices } from '../../services/aiservices';

// Get singleton instances
const sheetManager = container.resolve<SheetManager>('SheetManager');
const aiService = container.resolve<AIServices>('AIService');

export const productFlow = addKeyword(['producto', 'precio', 'catálogo'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await sheetManager.getUserConv(phoneNumber);
      
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

      // Enviar sugerencias si hay
      if (aiResponse.sugerencias?.length > 0) {
        await ctx.sendText(`\n🔍 También te pueden interesar:\n${aiResponse.sugerencias.join('\n')}`);
      }

      // Enviar promociones si hay
      if (aiResponse.promocionesRelevantes?.length > 0) {
        await ctx.sendText(`\n🎉 Promociones activas:\n${aiResponse.promocionesRelevantes.join('\n')}`);
      }

      // Hacer preguntas adicionales si hay
      if (aiResponse.preguntasAdicionales?.length > 0) {
        await ctx.sendText(`\n❓ Para ayudarte mejor:\n${aiResponse.preguntasAdicionales[0]}`);
      }

      // Guardar la conversación
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: aiResponse.respuestaPrincipal }
      ]);

    } catch (error) {
      console.error('Error en productFlow:', error);
      await ctx.sendText('Lo siento, tuve un problema procesando tu consulta. ¿Podrías intentarlo de nuevo?');
      
      // Registrar el error
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + (error instanceof Error ? error.message : String(error)) }
      ]);
    }
  });
