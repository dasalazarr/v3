import { addKeyword } from "@builderbot/bot";
import container from "../di/container";
import { AppointmentController } from '../services/appointments.controller';
import { PatientsController } from '../services/patients.controller';
import * as chrono from 'chrono-node';

// Obtenemos las instancias de los controladores
const appointmentController = container.resolve<AppointmentController>("AppointmentController");
const patientsController = container.resolve<PatientsController>("PatientsController");

// Estado temporal para almacenar los datos durante el flujo
const patientData = new Map<string, any>();

// Función para parsear fechas en lenguaje natural
function parseNaturalDate(text: string): Date | null {
  try {
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

// Mapeo de tipos de procedimientos dentales
const dentalProcedures = {
  '1': 'Consulta',
  '2': 'Limpieza',
  '3': 'Endodoncia',
  '4': 'Extracción',
  '5': 'Ortodoncia',
  '6': 'Otro'
};

export const dentalFlow = addKeyword(['cita dental', 'dentista', 'odontólogo', 'odontología', 'diente', 'muela'], {
  sensitive: false
})
  .addAnswer(
    'Bienvenido a nuestra Clínica Dental. Para agendar una cita, necesitamos registrarte primero. ¿Cuál es tu nombre completo?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      // Almacenar nombre del paciente
      const patientName = ctx.body;
      // Guardar en estado temporal
      patientData.set(ctx.from, { name: patientName });
      await flowDynamic(`Gracias ${patientName}. Registrando tu información...`);
    }
  )
  .addAnswer(
    '¿Cuál es tu número de teléfono para contactarte?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      // Almacenar teléfono del paciente
      const phone = ctx.body;
      const data = patientData.get(ctx.from) || {};
      // Actualizar estado temporal
      patientData.set(ctx.from, { ...data, phone });
      
      try {
        // Registrar paciente en la base de datos
        console.log('Registrando paciente:', {
          name: data.name,
          phone: phone
        });
        
        const result = await patientsController.createPatient(
          data.name,
          phone
        );
        
        if (result.success) {
          // Guardar ID del paciente
          patientData.set(ctx.from, { ...data, phone, patientId: result.patientId });
          await flowDynamic(`Perfecto, te hemos registrado con éxito.`);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error registrando paciente:', error);
        await flowDynamic('Lo siento, hubo un problema al registrar tus datos. Por favor, intenta nuevamente.');
      }
    }
  )
  .addAnswer(
    '¿Qué tipo de servicio dental necesitas?\n\n1. Consulta/Revisión\n2. Limpieza dental\n3. Tratamiento de conducto (Endodoncia)\n4. Extracción\n5. Ortodoncia\n6. Otro',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      const typeInput = ctx.body;
      const type = dentalProcedures[typeInput] || 'Consulta';
      
      const data = patientData.get(ctx.from) || {};
      patientData.set(ctx.from, { ...data, type });
      
      await flowDynamic(`Has seleccionado: ${type}`);
    }
  )
  .addAnswer(
    '¿Para qué fecha deseas tu cita dental? Puedes decirlo en lenguaje natural, por ejemplo: "mañana", "el próximo lunes", "15 de mayo", etc.',
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
      const data = patientData.get(ctx.from) || {};
      patientData.set(ctx.from, { ...data, date: parsedDate });
      
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
      const data = patientData.get(ctx.from);
      
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
      
      patientData.set(ctx.from, { 
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
    '¿Alguna nota o síntoma que quieras mencionar para tu cita?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      const data = patientData.get(ctx.from);
      if (!data) {
        await flowDynamic([{
          body: 'Hubo un problema con tu cita. Por favor, intenta agendar nuevamente.'
        }]);
        return;
      }
      
      patientData.set(ctx.from, { ...data, description: ctx.body });
      
      // Mostrar resumen de la cita antes de confirmar
      await flowDynamic([{
        body: `📝 Resumen de tu cita dental:\n\n📅 Fecha: ${data.startTime.toLocaleDateString('es-ES')}\n⏰ Hora: ${data.startTime.toLocaleTimeString('es-ES')}\n🦷 Tipo: ${data.type}\n📋 Notas: ${ctx.body}\n\n¿Es correcta esta información?`
      }]);
    }
  )
  .addAnswer(
    'Perfecto, déjame verificar la disponibilidad y agendar tu cita...',
    null,
    async (ctx, { flowDynamic }) => {
      const data = patientData.get(ctx.from);
      if (!data) {
        await flowDynamic([{
          body: 'Hubo un problema con tu cita. Por favor, intenta agendar nuevamente.'
        }]);
        return;
      }
      
      try {
        console.log('Scheduling dental appointment with data:', {
          title: `Cita dental con ${ctx.pushName || data.name}`,
          description: data.description,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString(),
          patientId: data.patientId,
          type: data.type
        });
        
        // Crear la cita con solo los 4 parámetros requeridos
        const result = await appointmentController.createAppointment(
          `Cita dental con ${ctx.pushName || data.name}`,
          `${data.description}\nPaciente ID: ${data.patientId}\nTipo: ${data.type}`,
          data.startTime.toISOString(),
          data.endTime.toISOString()
        );

        if (result.success) {
          await flowDynamic([
            {
              body: `✅ ¡Tu cita dental ha sido agendada exitosamente!\n\n📅 Fecha: ${data.startTime.toLocaleDateString('es-ES')}\n⏰ Hora: ${data.startTime.toLocaleTimeString('es-ES')}\n🦷 Tipo: ${data.type}\n📝 Notas: ${data.description}\n\nID de tu cita: ${result.eventId}\n\nRecuerda llegar 10 minutos antes de tu cita. ¡Te esperamos!`
            }
          ]);
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error scheduling dental appointment:', error);
        await flowDynamic([
          {
            body: `❌ Lo siento, no pude agendar tu cita dental: ${error.message}\nPor favor, intenta con otra fecha u hora.`
          }
        ]);
      } finally {
        // Limpiar datos temporales
        patientData.delete(ctx.from);
      }
    }
  );
