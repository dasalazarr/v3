import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { config } from '../config';
import { singleton } from 'tsyringe';

interface PatientData { name: string; phone: string; email?: string; notes?: string; }

@singleton()
export class PatientsService {
  private sheets;
  private sheetId = config.PATIENTS_SPREADSHEET_ID;

  constructor() {
    try {
      // Crear el cliente JWT con las credenciales
      const auth = new google.auth.JWT({
        email: config.clientEmail,
        key: config.privateKey?.replace(/\\n/g, '\n'), // Asegurar que los saltos de línea estén correctamente formateados
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Inicializar el servicio de hojas de cálculo
      this.sheets = google.sheets({ version: 'v4', auth });
      
      console.log('Patients service initialized successfully');
    } catch (error) {
      console.error('Error initializing Patients service:', error);
      throw error;
    }
  }

  async createPatient(data: PatientData): Promise<{ patientId: string }> {
    const patientId = `P-${Date.now()}`;
    const values = [[
      new Date().toISOString(),
      data.name,
      data.phone,
      data.email || '',
      data.notes || '',
      patientId
    ]];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: 'Patients!A:F',
      valueInputOption: 'RAW',
      requestBody: { values }
    });
    return { patientId };
  }

  async listPatients() {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: 'Patients!A:F'
    });
    return res.data.values || [];
  }
}
