import { addKeyword } from '@builderbot/bot';
import { container } from 'tsyringe';
import { SheetManager } from '../../services/sheetsServices';
import { AIServices } from '../../services/aiservices';

// Get singleton instances
const sheetManager = container.resolve<SheetManager>('SheetManager');
const aiService = container.resolve<AIServices>('AIService');

export const appointmentFlow = addKeyword(['cita', 'agendar', 'reservar'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await sheetManager.getUserConv(phoneNumber);
      
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

      // Si faltan datos, solicitar la información faltante
      if (!aiResponse.datosCompletos && aiResponse.datosFaltantes?.length > 0) {
        await ctx.sendText(`\n❗ Necesito algunos datos adicionales:\n${aiResponse.datosFaltantes.join('\n')}`);
      }

      // Si hay sugerencias de horarios, mostrarlas
      if (aiResponse.sugerenciasHorario?.length > 0) {
        await ctx.sendText(`\n⏰ Horarios disponibles:\n${aiResponse.sugerenciasHorario.join('\n')}`);
      }

      // Mostrar recordatorios importantes
      if (aiResponse.recordatorios?.length > 0) {
        await ctx.sendText(`\n📝 Recordatorios importantes:\n${aiResponse.recordatorios.join('\n')}`);
      }

      // Guardar la conversación
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: aiResponse.respuesta }
      ]);

    } catch (error) {
      console.error('Error en appointmentFlow:', error);
      await ctx.sendText('Lo siento, tuve un problema procesando tu solicitud de cita. ¿Podrías intentarlo de nuevo?');
      
      // Registrar el error
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + (error instanceof Error ? error.message : String(error)) }
      ]);
    }
  });

export const appointmentStatusFlow = addKeyword(['estado', 'verificar', 'confirmar'])
  .addAction(async (ctx) => {
    const { from: phoneNumber } = ctx;
    
    try {
      // Obtener historial de conversaciones para contexto
      const conversations = await sheetManager.getUserConv(phoneNumber);
      
      // Crear el prompt con el contexto del historial
      const systemPrompt = `Eres un asistente especializado en gestión de citas. 
      Verifica y proporciona información sobre el estado de las citas del cliente.
      
      Historial reciente de conversación:
      ${conversations.map(conv => `${conv.role}: ${conv.content}`).join('\n')}
      
      Estructura tu respuesta en formato JSON:
      {
        "respuesta": "Respuesta principal sobre el estado de la cita",
        "estadoCita": {
          "fecha": "Fecha de la cita",
          "hora": "Hora de la cita",
          "servicio": "Tipo de servicio",
          "estado": "Confirmada | Pendiente | Cancelada",
          "observaciones": "Observaciones importantes"
        },
        "recordatorios": ["recordatorio1", "recordatorio2"],
        "accionesDisponibles": ["accion1", "accion2"]
      }`;

      // Obtener respuesta de GPT-4
      const result = await aiService.chat(systemPrompt, [
        { role: 'user', content: ctx.body }
      ]);

      // Procesar la respuesta
      const aiResponse = JSON.parse(result.resumenEjecutivo);
      
      // Enviar la respuesta principal
      await ctx.sendText(aiResponse.respuesta);

      // Mostrar detalles de la cita si están disponibles
      if (aiResponse.estadoCita) {
        const cita = aiResponse.estadoCita;
        await ctx.sendText(`📅 Detalles de tu cita:\n\nFecha: ${cita.fecha}\nHora: ${cita.hora}\nServicio: ${cita.servicio}\nEstado: ${cita.estado}\n\n📝 ${cita.observaciones}`);
      }

      // Mostrar recordatorios importantes
      if (aiResponse.recordatorios?.length > 0) {
        await ctx.sendText(`\n⚠️ Recordatorios importantes:\n${aiResponse.recordatorios.join('\n')}`);
      }

      // Mostrar acciones disponibles
      if (aiResponse.accionesDisponibles?.length > 0) {
        await ctx.sendText(`\n✨ Acciones disponibles:\n${aiResponse.accionesDisponibles.join('\n')}`);
      }

      // Guardar la conversación
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: aiResponse.respuesta }
      ]);

    } catch (error) {
      console.error('Error en appointmentStatusFlow:', error);
      await ctx.sendText('Lo siento, tuve un problema verificando el estado de tu cita. ¿Podrías intentarlo de nuevo?');
      
      // Registrar el error
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'user', content: ctx.body },
        { role: 'assistant', content: 'Error: ' + (error instanceof Error ? error.message : String(error)) }
      ]);
    }
  });
