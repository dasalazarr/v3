import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface Appointment {
  startTime: Date;
  endTime: Date;
  title: string;
  description: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export class AppointmentService {
  private calendar;
  private sheets;
  private spreadsheetId: string;
  private calendarId: string;

  constructor() {
    // Initialize Google OAuth2 client
    const auth = new google.auth.JWT({
      email: process.env.CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    });

    this.calendar = google.calendar({ version: 'v3', auth });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.SPREADSHEET_ID || '';
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  }

  /**
   * Check if there are any conflicting appointments
   */
  private async checkConflicts(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
      });

      return (response.data.items || []).length > 0;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      throw new Error('Failed to check appointment conflicts');
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
   */
  async scheduleAppointment(appointment: Appointment): Promise<string> {
    // Validate dates
    if (appointment.startTime >= appointment.endTime) {
      throw new Error('End time must be after start time');
    }

    if (appointment.startTime < new Date()) {
      throw new Error('Cannot schedule appointments in the past');
    }

    // Check for conflicts
    const hasConflicts = await this.checkConflicts(
      appointment.startTime,
      appointment.endTime
    );

    if (hasConflicts) {
      throw new Error('Time slot is already booked');
    }

    try {
      // Create Calendar event
      const event = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: appointment.title,
          description: appointment.description,
          start: {
            dateTime: appointment.startTime.toISOString(),
          },
          end: {
            dateTime: appointment.endTime.toISOString(),
          },
        },
      });

      if (!event.data.id) {
        throw new Error('Failed to create calendar event');
      }

      // Add to spreadsheet
      await this.addToSheet(event.data.id, appointment);

      return event.data.id;
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      throw new Error('Failed to schedule appointment');
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
