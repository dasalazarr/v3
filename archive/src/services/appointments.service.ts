import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { singleton } from 'tsyringe';
import { config } from '../config';

interface Appointment {
  startTime: Date;
  endTime: Date;
  title: string;
  description: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

@singleton()
export class AppointmentService {
  private calendar;
  private sheets;
  private spreadsheetId: string;
  private calendarId: string;

  constructor() {
    try {
      // Initialize Google OAuth2 client
      console.log('Initializing Google OAuth2 client...');
      // Validar que las credenciales de Google existan
      if (!config.clientEmail || !config.privateKey) {
        throw new Error('Credenciales de Google no configuradas correctamente. Verifica clientEmail y privateKey.');
      }
      
      console.log('Client Email:', config.clientEmail);
      console.log('Calendar ID:', process.env.GOOGLE_CALENDAR_ID || 'primary');
      
      // Crear el cliente JWT con las credenciales
      const auth = new google.auth.JWT({
        email: config.clientEmail,
        key: config.privateKey.replace(/\\n/g, '\n'), // Asegurar que los saltos de línea estén correctamente formateados
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/spreadsheets'
        ]
      });

      // Inicializar los servicios de Google
      this.calendar = google.calendar({ version: 'v3', auth });
      this.sheets = google.sheets({ version: 'v4', auth });
      
      // Configurar IDs
      this.spreadsheetId = config.spreadsheetId || '';
      this.calendarId = config.calendarId || 'primary';
      
      console.log('Google services initialized successfully');
    } catch (error) {
      console.error('Error initializing Google services:', error);
      throw error;
    }
  }

  /**
   * Check if there are any conflicting appointments
   * @param startTime Inicio de la cita a verificar
   * @param endTime Fin de la cita a verificar
   * @returns true si hay conflictos, false si está disponible
   */
  private async checkConflicts(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      console.log(`Checking conflicts for time slot: ${startTime.toISOString()} - ${endTime.toISOString()}`);
      console.log(`Using calendar ID: ${this.calendarId}`);
      
      // Ajustamos el rango de búsqueda para incluir citas que se superpongan
      // No solo las que están completamente dentro del rango
      const timeMin = new Date(startTime.getTime() - (60 * 60 * 1000)); // 1 hora antes
      const timeMax = new Date(endTime.getTime() + (60 * 60 * 1000));   // 1 hora después
      
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        maxResults: 10,
      });
      
      // Si no hay eventos, no hay conflictos
      if (!response.data.items || response.data.items.length === 0) {
        console.log('No events found in this time range');
        return false;
      }
      
      // Verificar si alguno de los eventos se superpone con nuestro horario
      const conflicts = response.data.items.filter(event => {
        if (!event.start?.dateTime || !event.end?.dateTime) {
          return false; // Ignorar eventos sin hora definida
        }
        
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        
        // Hay conflicto si:
        // 1. El inicio del evento está dentro de nuestro rango, o
        // 2. El fin del evento está dentro de nuestro rango, o
        // 3. Nuestro rango está completamente dentro del evento
        const conflict = 
          (eventStart >= startTime && eventStart < endTime) || // Inicio del evento dentro de nuestro rango
          (eventEnd > startTime && eventEnd <= endTime) ||     // Fin del evento dentro de nuestro rango
          (eventStart <= startTime && eventEnd >= endTime);    // Nuestro rango dentro del evento
        
        if (conflict) {
          console.log(`Conflict found with event: ${event.summary} (${eventStart.toISOString()} - ${eventEnd.toISOString()})`);
        }
        
        return conflict;
      });
      
      console.log(`Found ${conflicts.length} conflicting events`);
      return conflicts.length > 0;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      // Proporcionar un mensaje de error más detallado
      if (error instanceof Error) {
        throw new Error(`Failed to check appointment conflicts: ${error.message}`);
      } else {
        throw new Error('Failed to check appointment conflicts: Unknown error');
      }
    }
  }

  /**
   * Add appointment to Google Sheets
   */
  private async addToSheet(
    eventId: string,
    appointment: Appointment
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Citas!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            appointment.startTime.toISOString(),
            appointment.endTime.toISOString(),
            appointment.title,
            appointment.description,
            eventId,
            appointment.status,
            new Date().toISOString() // Created at
          ]]
        }
      });
    } catch (error) {
      console.error('Error adding to sheet:', error);
      throw new Error('Failed to record appointment in spreadsheet');
    }
  }

  /**
   * Schedule a new appointment
   * @param appointment Datos de la cita a agendar
   * @returns ID del evento creado en Google Calendar
   */
  async scheduleAppointment(appointment: Appointment): Promise<string> {
    console.log('Starting appointment scheduling...');
    console.log('Appointment details:', {
      title: appointment.title,
      startTime: appointment.startTime,
      endTime: appointment.endTime
    });

    // Validar fechas
    if (appointment.startTime >= appointment.endTime) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }

    const now = new Date();
    if (appointment.startTime < now) {
      const diffMs = now.getTime() - appointment.startTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      throw new Error(`No se pueden agendar citas en el pasado. La hora seleccionada es ${diffMins} minutos antes de la hora actual.`);
    }

    // Validar horario de atención (9:00 a 18:00)
    const hours = appointment.startTime.getHours();
    if (hours < 9 || hours >= 18) {
      throw new Error(`La hora seleccionada (${hours}:${appointment.startTime.getMinutes()}) está fuera del horario de atención (9:00 a 18:00).`);
    }

    // Verificar conflictos
    console.log('Checking for conflicts...');
    try {
      const hasConflicts = await this.checkConflicts(
        appointment.startTime,
        appointment.endTime
      );

      if (hasConflicts) {
        throw new Error(`El horario seleccionado (${appointment.startTime.toLocaleTimeString('es-ES')} - ${appointment.endTime.toLocaleTimeString('es-ES')}) ya está reservado. Por favor, elige otro horario.`);
      }
    } catch (error) {
      // Capturar errores específicos de la verificación de conflictos
      if (error instanceof Error) {
        throw error; // Reenviar el error con el mensaje detallado
      } else {
        throw new Error('No se pudo verificar la disponibilidad del horario');
      }
    }

    try {
      console.log('Creating calendar event...');
      // Crear evento en Google Calendar
      const event = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: appointment.title,
          description: appointment.description,
          start: {
            dateTime: appointment.startTime.toISOString(),
            timeZone: 'America/Guayaquil'  // UTC-5 para Ecuador
          },
          end: {
            dateTime: appointment.endTime.toISOString(),
            timeZone: 'America/Guayaquil'  // UTC-5 para Ecuador
          },
          // Añadir recordatorios por defecto
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 día antes
              { method: 'popup', minutes: 60 }        // 1 hora antes
            ]
          },
          // Color del evento (opcional)
          colorId: '1' // Azul
        },
      });

      if (!event.data.id) {
        throw new Error('No se pudo crear el evento en el calendario: No se recibió ID del evento');
      }

      console.log('Calendar event created successfully:', event.data.id);
      console.log('Event details:', event.data);

      // Agregar a Google Sheets
      console.log('Adding to spreadsheet...');
      await this.addToSheet(event.data.id, appointment);
      console.log('Added to spreadsheet successfully');

      return event.data.id;
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      // Proporcionar información detallada del error
      if (error.response) {
        console.error('Google API Error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      // Mensaje de error más amigable en español
      throw new Error(`Error al agendar la cita: ${error.message}`);
    }
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(
    eventId: string,
    appointment: Partial<Appointment>
  ): Promise<void> {
    try {
      // Update Calendar event
      await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId: eventId,
        requestBody: {
          summary: appointment.title,
          description: appointment.description,
          start: appointment.startTime ? {
            dateTime: appointment.startTime.toISOString(),
          } : undefined,
          end: appointment.endTime ? {
            dateTime: appointment.endTime.toISOString(),
          } : undefined,
        },
      });

      // Update spreadsheet
      // Find and update the row with matching eventId
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Citas!A:G',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[4] === eventId);

      if (rowIndex !== -1) {
        const updatedRow = [...rows[rowIndex]];
        if (appointment.startTime) updatedRow[0] = appointment.startTime.toISOString();
        if (appointment.endTime) updatedRow[1] = appointment.endTime.toISOString();
        if (appointment.title) updatedRow[2] = appointment.title;
        if (appointment.description) updatedRow[3] = appointment.description;
        if (appointment.status) updatedRow[5] = appointment.status;

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Citas!A${rowIndex + 1}:G${rowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [updatedRow]
          }
        });
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw new Error('Failed to update appointment');
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(eventId: string): Promise<void> {
    try {
      // Delete from Calendar
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      // Update status in spreadsheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Citas!A:G',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[4] === eventId);

      if (rowIndex !== -1) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Citas!F${rowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['cancelled']]
          }
        });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw new Error('Failed to cancel appointment');
    }
  }
}
