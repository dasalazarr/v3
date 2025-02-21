import { addKeyword } from '@builderbot/bot';
import { container } from 'tsyringe';
import { SheetManager } from '../../services/sheetsServices';
import { AIServices } from '../../services/aiservices';
import { MessageIntent } from '../../services/messageClassifier';

// Get singleton instances
const sheetManager = container.resolve<SheetManager>('SheetManager');
const aiService = container.resolve<AIServices>('AIService');

export const faqFlow = addKeyword(['ayuda', 'pregunta', 'cómo', 'qué'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await sheetManager.getUserConv(phoneNumber);
      
      // Crear el prompt con el contexto del historial
      const systemPrompt = `Eres un asistente virtual experto en atención al cliente. 
      Analiza la pregunta del usuario y proporciona una respuesta clara, precisa y útil.
      
      Historial reciente de conversación:
      ${conversations.map(conv => `${conv.role}: ${conv.content}`).join('\n')}
      
      Responde de manera natural y empática, manteniendo un tono profesional.
      Si no tienes suficiente información, solicita amablemente los detalles necesarios.
      
      Estructura tu respuesta en formato JSON:
      {
        "respuesta": "Tu respuesta principal aquí",
        "sugerencias": ["Sugerencia 1", "Sugerencia 2"],
        "requiereMasInfo": boolean,
        "infoAdicionalNecesaria": ["dato1", "dato2"] // si requiereMasInfo es true
      }`;

      // Buscar preguntas similares
      const similarQuestions = await aiService.searchSimilarQuestions(ctx.body);
      if (similarQuestions.length > 0) {
        systemPrompt += `\n\nPreguntas similares encontradas:\n${similarQuestions.join('\n')}`;
      }

      // Obtener respuesta de GPT-4
      const result = await aiService.chat(systemPrompt, [
        { role: 'user', content: ctx.body }
      ]);

      // Procesar la respuesta
      const aiResponse = JSON.parse(result.resumenEjecutivo);
      
      // Enviar la respuesta principal
      await ctx.sendText(aiResponse.respuesta);

      // Si hay sugerencias, enviarlas
      if (aiResponse.sugerencias?.length > 0) {
        await ctx.sendText(`\n💡 También podrías estar interesado en:\n${aiResponse.sugerencias.join('\n')}`);
      }

      // Si se necesita más información
      if (aiResponse.requiereMasInfo && aiResponse.infoAdicionalNecesaria?.length > 0) {
        await ctx.sendText(`\n❓ Para ayudarte mejor, necesito saber:\n${aiResponse.infoAdicionalNecesaria.join('\n')}`);
      }

      // Guardar la conversación
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: aiResponse.respuesta }
      ]);

    } catch (error) {
      console.error('Error en faqFlow:', error);
      await ctx.sendText('Lo siento, tuve un problema procesando tu pregunta. ¿Podrías intentarlo de nuevo?');
      
      // Registrar el error
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + (error instanceof Error ? error.message : String(error)) }
      ]);
    }
  });
