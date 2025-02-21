import { addKeyword } from '@builderbot/bot';
import SheetManager from '../../services/sheetsServices';
import aiServices from '../../services/aiservices';

export const appointmentFlow = addKeyword(['cita', 'agendar', 'reservar'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    const aiService = new aiServices();
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await SheetManager.getUserConv(phoneNumber);
      
      // Crear el prompt con el contexto del historial
      const systemPrompt = `Eres un asistente especializado en gestión de citas. 
      Analiza la solicitud del cliente y ayuda a programar o gestionar su cita.
      
      Historial reciente de conversación:
      ${conversations.map(conv => `${conv.role}: ${conv.content}`).join('\n')}
      
      Estructura tu respuesta en formato JSON:
      {
        "tipo": "NUEVA_CITA | MODIFICACION | CANCELACION",
        "respuesta": "Respuesta principal al cliente",
        "datosCita": {
          "fecha": "Fecha solicitada o sugerida",
          "hora": "Hora solicitada o sugerida",
          "servicio": "Tipo de servicio solicitado",
          "duracion": "Duración estimada"
        },
        "datosCompletos": boolean,
        "datosFaltantes": ["dato1", "dato2"],
        "sugerenciasHorario": ["horario1", "horario2"],
        "recordatorios": ["recordatorio1", "recordatorio2"]
      }`;

      // Obtener respuesta de GPT-4
      const result = await aiService.chat(systemPrompt, [
        { role: 'user', content: ctx.body }
      ]);

      // Procesar la respuesta
      const aiResponse = JSON.parse(result.resumenEjecutivo);
      
      // Enviar la respuesta principal
      await ctx.sendText(aiResponse.respuesta);

      // Si los datos están completos, mostrar resumen de la cita
      if (aiResponse.datosCompletos && aiResponse.datosCita) {
        const cita = aiResponse.datosCita;
        await ctx.sendText(`📅 Resumen de tu cita:\n\nFecha: ${cita.fecha}\nHora: ${cita.hora}\nServicio: ${cita.servicio}\nDuración estimada: ${cita.duracion}`);
      }

      // Si faltan datos, solicitar la información necesaria
      if (!aiResponse.datosCompletos && aiResponse.datosFaltantes) {
        await ctx.sendText('Para completar tu cita, necesito los siguientes datos:');
        await ctx.sendText(aiResponse.datosFaltantes.join('\n'));
      }

      // Si hay sugerencias de horarios disponibles
      if (aiResponse.sugerenciasHorario && aiResponse.sugerenciasHorario.length > 0) {
        await ctx.sendText('Horarios disponibles sugeridos:');
        await ctx.sendText(aiResponse.sugerenciasHorario.join('\n'));
      }

      // Enviar recordatorios importantes
      if (aiResponse.recordatorios && aiResponse.recordatorios.length > 0) {
        await ctx.sendText('⚠️ Recordatorios importantes:');
        await ctx.sendText(aiResponse.recordatorios.join('\n'));
      }

      // Registrar la interacción
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: JSON.stringify(aiResponse) }
      ]);
      
    } catch (error) {
      console.error('Error en appointment flow:', error);
      await ctx.sendText('Lo siento, hubo un error al procesar tu solicitud de cita. ¿Podrías intentarlo nuevamente?');
      
      // Registrar el error
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + error.message }
      ]);
    }
  });

export const appointmentStatusFlow = addKeyword(['estado', 'verificar', 'confirmar'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    const aiService = new aiServices();
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await SheetManager.getUserConv(phoneNumber);
      
      // Crear el prompt con el contexto del historial
      const systemPrompt = `Eres un asistente especializado en gestión de citas. 
      Revisa el historial de conversaciones y proporciona información sobre el estado de las citas del cliente.
      
      Historial reciente de conversación:
      ${conversations.map(conv => `${conv.role}: ${conv.content}`).join('\n')}
      
      Estructura tu respuesta en formato JSON:
      {
        "respuesta": "Información principal sobre el estado de la cita",
        "citaEncontrada": boolean,
        "detallesCita": {
          "fecha": "Fecha de la cita",
          "hora": "Hora de la cita",
          "servicio": "Tipo de servicio",
          "estado": "Confirmada | Pendiente | Cancelada"
        },
        "accionesPosibles": ["acción1", "acción2"],
        "recordatorios": ["recordatorio1", "recordatorio2"]
      }`;

      // Obtener respuesta de GPT-4
      const result = await aiService.chat(systemPrompt, [
        { role: 'user', content: ctx.body }
      ]);

      // Procesar la respuesta
      const aiResponse = JSON.parse(result.resumenEjecutivo);
      
      // Enviar la respuesta principal
      await ctx.sendText(aiResponse.respuesta);

      // Si se encontró una cita, mostrar los detalles
      if (aiResponse.citaEncontrada && aiResponse.detallesCita) {
        const cita = aiResponse.detallesCita;
        await ctx.sendText(`📅 Detalles de tu cita:\n\nFecha: ${cita.fecha}\nHora: ${cita.hora}\nServicio: ${cita.servicio}\nEstado: ${cita.estado}`);
      }

      // Mostrar acciones posibles
      if (aiResponse.accionesPosibles && aiResponse.accionesPosibles.length > 0) {
        await ctx.sendText('Acciones disponibles:');
        await ctx.sendText(aiResponse.accionesPosibles.join('\n'));
      }

      // Enviar recordatorios importantes
      if (aiResponse.recordatorios && aiResponse.recordatorios.length > 0) {
        await ctx.sendText('⚠️ Recordatorios importantes:');
        await ctx.sendText(aiResponse.recordatorios.join('\n'));
      }

      // Registrar la interacción
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: JSON.stringify(aiResponse) }
      ]);
      
    } catch (error) {
      console.error('Error en appointment status flow:', error);
      await ctx.sendText('Lo siento, hubo un error al verificar el estado de tu cita. ¿Podrías intentarlo nuevamente?');
      
      // Registrar el error
      await SheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + error.message }
      ]);
    }
  });
