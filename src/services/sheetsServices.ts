import { google } from "googleapis";
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
import { calendar_v3 } from "googleapis/build/src/apis/calendar";
import { config } from "../config";
import { CitaResponse, UserData } from "../types";

class SheetManager {
  private sheets: sheets_v4.Sheets;
  private calendar: calendar_v3.Calendar;
  private spreadsheetId: string;

  constructor(spreadsheetId: string, privateKey: string, clientEmail: string) {
    if (!spreadsheetId || !privateKey || !clientEmail) {
      throw new Error('Se requieren credenciales válidas para Google Sheets y Calendar');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/calendar",
      ],
    });

    this.sheets = google.sheets({ version: "v4", auth });
    this.calendar = google.calendar({ version: "v3", auth });
    this.spreadsheetId = spreadsheetId;
  }

  private validateDate(fecha: string, hora: string): Date {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    
    if (!dateRegex.test(fecha)) {
      throw new Error('Formato de fecha inválido. Use DD/MM/YYYY');
    }
    
    if (!timeRegex.test(hora)) {
      throw new Error('Formato de hora inválido. Use HH:MM (24 horas)');
    }

    const [, day, month, year] = dateRegex.exec(fecha)!;
    const fechaHora = new Date(`${year}-${month}-${day}T${hora}`);
    
    if (isNaN(fechaHora.getTime())) {
      throw new Error('Fecha u hora inválida');
    }

    return fechaHora;
  }

  async userExists(number: string): Promise<boolean> {
    try {
      if (!number) throw new Error('Se requiere un número de teléfono');

      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:A",
      });

      const rows = result.data.values;
      return rows ? rows.some(row => row[0] === number) : false;
    } catch (error) {
      console.error("Error al verificar si el usuario existe:", error);
      throw new Error('Error al verificar el usuario');
    }
  }

  async createUser(number: string, name: string, mail: string): Promise<void> {
    try {
      if (!number || !name || !mail) {
        throw new Error('Se requieren todos los datos del usuario');
      }

      const userData: UserData = { number, name, mail };

      // Agregar el usuario a la pestaña 'Users'
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:C",
        valueInputOption: "RAW",
        requestBody: {
          values: [[userData.number, userData.name, userData.mail]],
        },
      });

      // Crear una nueva pestaña para el usuario
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: userData.number,
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error("Error al crear usuario:", error);
      throw new Error('Error al crear el usuario');
    }
  }

  async reservarCita(fecha: string, hora: string, paciente: string): Promise<CitaResponse> {
    try {
      const fechaHora = this.validateDate(fecha, hora);

      // Validar que la fecha no sea en el pasado
      if (fechaHora < new Date()) {
        throw new Error('No se pueden agendar citas en fechas pasadas');
      }

      // Validar horario de atención (9:00 AM a 6:00 PM)
      const horaDelDia = fechaHora.getHours();
      if (horaDelDia < 9 || horaDelDia >= 18) {
        throw new Error('Las citas solo están disponibles de 9:00 AM a 6:00 PM');
      }

      // Verificar disponibilidad
      const estaDisponible = await this.verificarDisponibilidad(fechaHora);
      if (!estaDisponible) {
        throw new Error('El horario seleccionado no está disponible');
      }

      // Agregar la cita a Google Sheets
      await this.agregarCitaAGoogleSheets(fechaHora, paciente);

      // Crear un evento en Google Calendar
      const eventoCreado = await this.crearEventoEnGoogleCalendar(fechaHora, paciente);

      return {
        mensaje: 'Cita reservada con éxito',
        fechaHora: fechaHora.toLocaleString('es-ES', {
          dateStyle: 'full',
          timeStyle: 'short'
        }),
        linkCalendario: eventoCreado.data.htmlLink || ''
      };
    } catch (error) {
      console.error("Error al reservar cita:", error);
      throw error instanceof Error ? error : new Error('Error al reservar la cita');
    }
  }

  private async verificarDisponibilidad(fechaHora: Date): Promise<boolean> {
    try {
      const timeMin = fechaHora.toISOString();
      const timeMax = new Date(fechaHora.getTime() + 60 * 60 * 1000).toISOString();

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
      });

      return !response.data.items?.length;
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      throw new Error('Error al verificar disponibilidad del horario');
    }
  }

  private async agregarCitaAGoogleSheets(fechaHora: Date, paciente: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Citas!A:B',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[fechaHora.toISOString(), paciente]],
        },
      });
    } catch (error) {
      console.error('Error al agregar cita a Google Sheets:', error);
      throw new Error('Error al registrar la cita en el sistema');
    }
  }

  private async crearEventoEnGoogleCalendar(fechaHora: Date, paciente: string) {
    try {
      const evento = {
        summary: `Cita con ${paciente}`,
        description: `Cita médica agendada para ${paciente}`,
        start: {
          dateTime: fechaHora.toISOString(),
          timeZone: 'America/Lima',
        },
        end: {
          dateTime: new Date(fechaHora.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Lima',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      return await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: evento,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('Error al crear evento en Google Calendar:', error);
      throw new Error('Error al crear el evento en el calendario');
    }
  }

  async getUserConv(number: string): Promise<any[]> {
    try {
      if (!number) {
        throw new Error('Se requiere un número de teléfono');
      }

      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:B`,
      });

      const rows = result.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // Tomar las últimas preguntas/respuestas (hasta un máximo de 3) y revertir el orden
      const lastConversations = rows.slice(-3).reverse();

      // Formatear las respuestas en el formato solicitado
      return lastConversations.flatMap(([userQuestion, assistantAnswer]) => [
        { role: "user", content: userQuestion },
        { role: "assistant", content: assistantAnswer }
      ]);
    } catch (error) {
      console.error("Error al obtener la conversación del usuario:", error);
      throw new Error('Error al obtener el historial de conversación');
    }
  }

  async addConverToUser(
    number: string,
    conversation: { role: string; content: string }[]
  ): Promise<void> {
    try {
      if (!number) {
        throw new Error('Se requiere un número de teléfono');
      }

      const question = conversation.find((c) => c.role === "user")?.content;
      const answer = conversation.find((c) => c.role === "assistant")?.content;

      if (!question || !answer) {
        throw new Error("La conversación debe contener tanto una pregunta como una respuesta");
      }

      // Leer las filas actuales
      const sheetData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:C`,
      });

      const rows = sheetData.data.values || [];
      const date = new Date().toISOString();

      // Agregar la nueva conversación en la primera fila
      rows.unshift([question, answer, date]);

      // Escribir las filas de nuevo en la hoja
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:C`,
        valueInputOption: "RAW",
        requestBody: {
          values: rows,
        },
      });
    } catch (error) {
      console.error("Error al agregar la conversación:", error);
      throw new Error('Error al guardar la conversación');
    }
  }
}

export default new SheetManager(
  config.spreadsheetId,
  config.privateKey,
  config.clientEmail
);
