import { addKeyword } from '@builderbot/bot';
import SheetManager from '../../services/sheetsServices';
import aiServices from '../../services/aiservices';
import { MessageIntent } from '../../services/messageClassifier';

export const faqFlow = addKeyword(['ayuda', 'pregunta', 'cómo', 'qué'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    const aiService = new aiServices();
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await SheetManager.getUserConv(phoneNumber);
      
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

      // Obtener respuesta de GPT-4
      const result = await aiService.chat(systemPrompt, [
        { role: 'user', content: ctx.body }
      ]);

      // Procesar la respuesta
      const aiResponse = JSON.parse(result.resumenEjecutivo);
      
      // Enviar la respuesta principal
      await ctx.sendText(aiResponse.respuesta);

      // Si hay sugerencias, enviarlas
      if (aiResponse.sugerencias && aiResponse.sugerencias.length > 0) {
        await ctx.sendText('Algunas sugerencias relacionadas:');
        await ctx.sendText(aiResponse.sugerencias.join('\n'));
      }

      // Si se necesita más información
      if (aiResponse.requiereMasInfo) {
        await ctx.sendText('Para ayudarte mejor, necesito algunos detalles adicionales:');
        await ctx.sendText(aiResponse.infoAdicionalNecesaria.join('\n'));
      }

      // Registrar la interacción
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: JSON.stringify(aiResponse) }
      ]);
      
    } catch (error) {
      console.error('Error en FAQ flow:', error);
      await ctx.sendText('Lo siento, hubo un error al procesar tu pregunta. ¿Podrías reformularla?');
      
      // Registrar el error
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + error.message }
      ]);
    }
  });
