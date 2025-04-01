import { addKeyword, EVENTS } from "@builderbot/bot";
import container from "../di/container";
import { AppointmentController } from '../services/appointments.controller';
import * as chrono from 'chrono-node';

// Obtenemos la instancia del controlador del contenedor
const appointmentController = container.resolve<AppointmentController>("AppointmentController");

// Estado temporal para almacenar los datos de la cita durante el flujo
const appointmentData = new Map<string, any>();

// Función para parsear fechas en lenguaje natural
function parseNaturalDate(text: string): Date | null {
  try {
    // Configuración para español
    const parsedDate = chrono.es.parse(text, new Date(), { forwardDate: true });
    if (parsedDate.length > 0) {
      return parsedDate[0].start.date();
    }
    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

// Función para validar que la fecha sea en el futuro
function isValidFutureDate(date: Date): boolean {
  const now = new Date();
  return date > now;
}

// Función para validar horario de atención (9:00 a 18:00)
function isWithinBusinessHours(date: Date): boolean {
  const hours = date.getHours();
  return hours >= 9 && hours < 18;
}

export const appointmentFlow = addKeyword(['cita', 'agendar', 'programar', 'reservar'], {
  sensitive: true
})
  .addAnswer(
    '¡Claro! Te ayudo a agendar una cita. ¿Para qué fecha te gustaría? Puedes decirlo en lenguaje natural, por ejemplo: "mañana", "el próximo lunes", "15 de mayo", etc.',
    { capture: true },
    async (ctx, { fallBack, flowDynamic }) => {
      const dateText = ctx.body;
      const parsedDate = parseNaturalDate(dateText);
      
      if (!parsedDate) {
        await fallBack('No pude entender esa fecha. Por favor intenta con otro formato, por ejemplo: "mañana", "el próximo lunes", "15 de mayo", etc.');
        return;
      }
      
      if (!isValidFutureDate(parsedDate)) {
        await fallBack('La fecha debe ser en el futuro. Por favor, elige una fecha a partir de mañana.');
        return;
      }
      
      // Guardar la fecha en el estado
      appointmentData.set(ctx.from, { date: parsedDate });
      
      // Confirmar la fecha entendida
      await flowDynamic([{
        body: `Entendido, tu cita será para el ${parsedDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}.`
      }]);
    }
  )
  .addAnswer(
    '¿A qué hora te gustaría la cita? Puedes decirlo naturalmente, por ejemplo: "10 de la mañana", "3:30 pm", "15:45", etc.',
    { capture: true },
    async (ctx, { fallBack, flowDynamic }) => {
      const timeText = ctx.body;
      const data = appointmentData.get(ctx.from);
      
      if (!data || !data.date) {
        await fallBack('Hubo un problema con tu fecha. Vamos a empezar de nuevo.');
        return;
      }
      
      // Intentar parsear la hora usando chrono
      const baseDate = new Date(data.date);
      const parsedTime = chrono.es.parse(timeText, baseDate, { forwardDate: true });
      
      if (parsedTime.length === 0) {
        await fallBack('No pude entender esa hora. Por favor intenta con otro formato, por ejemplo: "10 de la mañana", "3:30 pm", etc.');
        return;
      }
      
      const appointmentDateTime = parsedTime[0].start.date();
      
      // Validar horario de atención
      if (!isWithinBusinessHours(appointmentDateTime)) {
        await fallBack('El horario de atención es de 9:00 a 18:00. Por favor, elige otro horario.');
        return;
      }
      
      // Guardar la fecha y hora completa
      const startTime = new Date(appointmentDateTime);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora de duración
      
      appointmentData.set(ctx.from, { 
        ...data, 
        startTime,
        endTime
      });
      
      // Confirmar la hora entendida
      await flowDynamic([{
        body: `Entendido, tu cita será a las ${startTime.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}.`
      }]);
    }
  )
  .addAnswer(
    '¿Cuál es el motivo de tu cita?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      const data = appointmentData.get(ctx.from);
      if (!data) {
        await flowDynamic([{
          body: 'Hubo un problema con tu cita. Por favor, intenta agendar nuevamente.'
        }]);
        return;
      }
      
      appointmentData.set(ctx.from, { ...data, description: ctx.body });
      
      // Mostrar resumen de la cita antes de confirmar
      await flowDynamic([{
        body: `📝 Resumen de tu cita:\n\n📅 Fecha: ${data.startTime.toLocaleDateString('es-ES')}\n⏰ Hora: ${data.startTime.toLocaleTimeString('es-ES')}\n📋 Motivo: ${ctx.body}\n\n¿Es correcta esta información?`
      }]);
    }
  )
  .addAnswer(
    'Perfecto, déjame verificar la disponibilidad y agendar tu cita...',
    null,
    async (ctx, { flowDynamic }) => {
      const data = appointmentData.get(ctx.from);
      if (!data) {
        await flowDynamic([{
          body: 'Hubo un problema con tu cita. Por favor, intenta agendar nuevamente.'
        }]);
        return;
      }
      
      try {
        console.log('Scheduling appointment with data:', {
          title: `Cita con ${ctx.pushName || 'Cliente'}`,
          description: data.description,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString()
        });
        
        const result = await appointmentController.createAppointment(
          `Cita con ${ctx.pushName || 'Cliente'}`,
          data.description,
          data.startTime.toISOString(),
          data.endTime.toISOString()
        );

        if (result.success) {
          await flowDynamic([
            {
              body: `✅ ¡Tu cita ha sido agendada exitosamente!\n\n📅 Fecha: ${data.startTime.toLocaleDateString('es-ES')}\n⏰ Hora: ${data.startTime.toLocaleTimeString('es-ES')}\n📝 Motivo: ${data.description}\n\nID de tu cita: ${result.eventId}`
            }
          ]);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error scheduling appointment:', error);
        await flowDynamic([
          {
            body: `❌ Lo siento, no pude agendar tu cita: ${error.message}\nPor favor, intenta con otra fecha u hora.`
          }
        ]);
      } finally {
        // Limpiar datos temporales
        appointmentData.delete(ctx.from);
      }
    }
  );

// Flujo para cancelar citas
export const cancelAppointmentFlow = addKeyword(['cancelar cita'])
  .addAnswer(
    'Por favor, proporciona el ID de la cita que deseas cancelar:',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      try {
        const result = await appointmentController.cancelAppointment(ctx.body.trim());
        if (result.success) {
          await flowDynamic([
            {
              body: '✅ Tu cita ha sido cancelada exitosamente.'
            }
          ]);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        await flowDynamic([
          {
            body: `❌ No pude cancelar la cita: ${error.message}`
          }
        ]);
      }
    }
  );
