import { addKeyword, EVENTS } from "@builderbot/bot";
import { AppointmentController } from '../services/appointments.controller';

const appointmentController = new AppointmentController();

// Estado temporal para almacenar los datos de la cita durante el flujo
const appointmentData = new Map<string, any>();

export const appointmentFlow = addKeyword(['cita', 'agendar', 'programar', 'reunion'], {
  sensitive: true
})
  .addAnswer(
    '¡Claro! Te ayudo a agendar una reunion. ¿Para qué fecha te gustaría? (Por favor, usa el formato DD/MM/YYYY)',
    { capture: true },
    async (ctx, { fallBack }) => {
      const date = ctx.body;
      // Validar formato de fecha
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (!dateRegex.test(date)) {
        await fallBack('Por favor, ingresa la fecha en formato DD/MM/YYYY');
        return;
      }
      
      const [, day, month, year] = date.match(dateRegex);
      const appointmentDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      
      if (appointmentDate < new Date()) {
        await fallBack('La fecha no puede ser en el pasado. Por favor, ingresa una fecha futura.');
        return;
      }
      
      appointmentData.set(ctx.from, { date: appointmentDate });
    }
  )
  .addAnswer(
    '¿A qué hora te gustaría la reunion? (Por favor, usa formato 24hrs, ejemplo: 14:30)',
    { capture: true },
    async (ctx, { fallBack }) => {
      const time = ctx.body;
      const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      
      if (!timeRegex.test(time)) {
        await fallBack('Por favor, ingresa la hora en formato válido (ejemplo: 14:30)');
        return;
      }

      const [, hours, minutes] = time.match(timeRegex);
      const data = appointmentData.get(ctx.from);
      const appointmentDate = data.date;
      appointmentDate.setUTCHours(parseInt(hours) + 5, parseInt(minutes));

      // Validar horario de atención (asumiendo 9:00 a 18:00)
      const localHour = parseInt(hours); // Usar la hora ingresada directamente
      if (localHour < 9 || localHour >= 18) {
        await fallBack('El horario de atención es de 9:00 a 18:00. Por favor, elige otro horario.');
        return;
      }

      appointmentData.set(ctx.from, { 
        ...data, 
        startTime: new Date(appointmentDate),
        endTime: new Date(appointmentDate.getTime() + 60 * 60 * 1000) // 1 hora de duración
      });
    }
  )
  .addAnswer(
    '¿Cuál es el motivo de tu reunion',
    { capture: true },
    async (ctx) => {
      const data = appointmentData.get(ctx.from);
      appointmentData.set(ctx.from, { ...data, description: ctx.body });
    }
  )
  .addAnswer(
    'Perfecto, déjame verificar la disponibilidad y agendar tu cita...',
    null,
    async (ctx, { flowDynamic }) => {
      const data = appointmentData.get(ctx.from);
      
      try {
        const result = await appointmentController.createAppointment(
          `Cita con ${ctx.pushName || 'Cliente'}`,
          data.description,
          data.startTime.toISOString(),
          data.endTime.toISOString()
        );

        if (result.success) {
          await flowDynamic([
            {
              body: `✅ ¡Tu cita ha sido agendada exitosamente!\n\n📅 Fecha: ${data.startTime.toLocaleDateString()}\n⏰ Hora: ${data.startTime.toLocaleTimeString()}\n📝 Motivo: ${data.description}\n\nID de tu cita: ${result.eventId}`
            }
          ]);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
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
