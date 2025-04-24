import { addKeyword, EVENTS } from "@builderbot/bot";
import container from "../di/container";
import { AppointmentController } from '../services/appointments.controller';
import * as chrono from 'chrono-node';
import { TemplateEngine } from '../core/templateEngine';

// Obtenemos las instancias de los servicios del contenedor
const appointmentController = container.resolve<AppointmentController>("AppointmentController");
const templateEngine = container.resolve<TemplateEngine>(TemplateEngine);

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
    "", // Mensaje vacío ya que usamos flowDynamic
    {}, // Opciones vacías
    async (ctx, { flowDynamic }) => {
      const message = templateEngine.render('appointment_request');
      await flowDynamic([{ body: message }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
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
      const confirmMessage = templateEngine.render('appointment_date_confirm', {
        date: parsedDate.toISOString() // Convertir a string
      });
      await flowDynamic([{ body: confirmMessage }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
    {}, // Opciones vacías
    async (ctx, { flowDynamic }) => {
      const message = templateEngine.render('appointment_time_request');
      await flowDynamic([{ body: message }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
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
      const confirmMessage = templateEngine.render('appointment_time_confirm', {
        time: startTime.toISOString() // Convertir a string
      });
      await flowDynamic([{ body: confirmMessage }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
    {}, // Opciones vacías
    async (ctx, { flowDynamic }) => {
      const message = templateEngine.render('appointment_reason_request');
      await flowDynamic([{ body: message }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
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
      const summaryMessage = templateEngine.render('appointment_summary', {
        date: data.startTime.toISOString(), // Convertir a string
        time: data.startTime.toISOString(), // Convertir a string
        reason: ctx.body
      });
      await flowDynamic([{ body: summaryMessage }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
    {}, // Opciones vacías
    async (ctx, { flowDynamic }) => {
      const message = templateEngine.render('appointment_processing');
      await flowDynamic([{ body: message }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
    {}, // Opciones vacías
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
          const successMessage = templateEngine.render('appointment_success', {
            date: data.startTime.toISOString(), // Convertir a string
            time: data.startTime.toISOString(), // Convertir a string
            reason: data.description,
            eventId: result.eventId
          });
          await flowDynamic([{ body: successMessage }]);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error scheduling appointment:', error);
        const errorMessage = templateEngine.render('appointment_error', {
          error: error.message
        });
        await flowDynamic([{ body: errorMessage }]);
      } finally {
        // Limpiar datos temporales
        appointmentData.delete(ctx.from);
      }
    }
  );

// Flujo para cancelar citas
export const cancelAppointmentFlow = addKeyword(['cancelar cita'])
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
    {}, // Opciones vacías
    async (ctx, { flowDynamic }) => {
      const message = templateEngine.render('cancel_appointment_request');
      await flowDynamic([{ body: message }]);
    }
  )
  .addAnswer(
    "", // Mensaje vacío ya que usamos flowDynamic
    { capture: true },
    async (ctx, { flowDynamic }) => {
      try {
        const result = await appointmentController.cancelAppointment(ctx.body.trim());
        if (result.success) {
          const successMessage = templateEngine.render('cancel_appointment_success', {
            eventId: ctx.body.trim()
          });
          await flowDynamic([{ body: successMessage }]);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        const errorMessage = templateEngine.render('cancel_appointment_error', {
          error: error.message
        });
        await flowDynamic([{ body: errorMessage }]);
      }
    }
  );
