import { google, sheets_v4 } from 'googleapis';
import { config } from '../config';
import { singleton } from 'tsyringe';
import { TrainingData } from './aiservices';

@singleton()
export class SheetsService {
  private sheets: sheets_v4.Sheets;
  private sheetCache: Map<string, boolean> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

  private readonly TRAINING_LOGS_SHEET_NAME = 'Training Logs';
  private readonly TRAINING_LOGS_HEADERS = [
    'Timestamp',
    'PhoneNumber',
    'OriginalDescription',
    'Distance',
    'DistanceUnit',
    'Time',
    'TimeUnit',
    'Pace',
    'PaceUnit',
    'Perception',
    'Notes'
  ];

  constructor() {
    try {
      const auth = new google.auth.JWT({
        email: config.clientEmail,
        key: config.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✅ Google Sheets Service Initialized Successfully.');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets Service:', error);
      throw new Error('Could not initialize Google Sheets API client. Check credentials.');
    }
  }

  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    return timestamp ? (Date.now() - timestamp) < this.CACHE_TTL_MS : false;
  }

  private async ensureSheetExists(spreadsheetId: string, sheetName: string, headers: string[]): Promise<void> {
    const cacheKey = `${spreadsheetId}-${sheetName}`;
    if (this.sheetCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return;
    }

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

      if (!sheet) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: sheetName } } }],
          },
        });
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] },
        });
        console.log(`✅ Sheet '${sheetName}' created with headers.`);
      } else {
        const headerResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!1:1`,
        });
        const existingHeaders = headerResponse.data.values?.[0] || [];
        if (JSON.stringify(existingHeaders) !== JSON.stringify(headers)) {
          console.error(`Estructura de columnas incorrecta en la hoja '${sheetName}'.`);
          console.error(`  Esperado: ${JSON.stringify(headers)}`);
          console.error(`  Encontrado: ${JSON.stringify(existingHeaders)}`);
          // Consider throwing an error here to stop execution if headers are critical
          // throw new Error(`Incorrect column structure in sheet '${sheetName}'.`);
        }
      }

      this.sheetCache.set(cacheKey, true);
      this.cacheTimestamps.set(cacheKey, Date.now());

    } catch (error: any) {
      console.error(`❌ Error ensuring sheet '${sheetName}' exists:`, error.message);
      if (error.code === 403) {
        console.error(`   Permission denied. Make sure the service account has editor access to spreadsheet ID: ${spreadsheetId}`);
      }
      throw error;
    }
  }

  public async saveTrainingLog(phoneNumber: string, originalDescription: string, trainingData: TrainingData | null): Promise<void> {
    if (!config.trainingSpreadsheetId) {
      console.error('❌ TRAINING_SPREADSHEET_ID is not configured.');
      throw new Error('Training log functionality is not configured.');
    }

    try {
      await this.ensureSheetExists(
        config.trainingSpreadsheetId,
        this.TRAINING_LOGS_SHEET_NAME,
        this.TRAINING_LOGS_HEADERS
      );

      const timestamp = new Date().toISOString();
      const row = trainingData ? [
        timestamp, phoneNumber, originalDescription,
        trainingData.distance.value ?? 'N/A', trainingData.distance.unit ?? 'N/A',
        trainingData.time.value ?? 'N/A', trainingData.time.unit ?? 'N/A',
        trainingData.pace.value ?? 'N/A', trainingData.pace.unit ?? 'N/A',
        trainingData.perception ?? 'N/A', trainingData.notes ?? 'N/A',
      ] : [
        timestamp, phoneNumber, originalDescription, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.trainingSpreadsheetId,
        range: `${this.TRAINING_LOGS_SHEET_NAME}!A:K`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });

      console.log(`✅ Training log for ${phoneNumber} saved successfully.`);
      const auditOk = await this.auditLastTrainingLog(phoneNumber, timestamp);
      console.log(auditOk ? '🔎 Audit OK: Row confirmed in Sheets.' : '⚠️ Audit FAILED: Row not found after insert.');

    } catch (error) {
      console.error(`❌ Error saving training log for ${phoneNumber}:`, error);
      throw error;
    }
  }

  private async auditLastTrainingLog(phoneNumber: string, timestamp: string): Promise<boolean> {
    if (!config.trainingSpreadsheetId) return false;
    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.trainingSpreadsheetId,
        range: `${this.TRAINING_LOGS_SHEET_NAME}!A:K`,
      });
      const rows = res.data.values as string[][] | undefined;
      return rows?.some(r => r[0] === timestamp && r[1] === phoneNumber) ?? false;
    } catch (error) {
      console.error('❌ Error in auditLastTrainingLog:', error);
      return false;
    }
  }

  public async addConverToUser(phoneNumber: string, messages: Array<{role: string, content: string}>) {
    if (!config.spreadsheetId) {
      console.error('❌ SPREADSHEET_ID is not configured for conversations.');
      return;
    }

    try {
      const sheetName = 'Conversations';
      await this.ensureSheetExists(config.spreadsheetId, sheetName, ['PhoneNumber', 'Timestamp', 'UserMessage', 'BotResponse']);

      // We call registerOrUpdateUser first to ensure the user exists before logging the conversation.
      await this.registerOrUpdateUser(phoneNumber);

      const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
      const botResponse = messages.find(msg => msg.role === 'assistant')?.content || '';
      const newRow = [phoneNumber, new Date().toISOString(), userMessage, botResponse];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow]
        }
      });

      console.log(`✅ Conversation for ${phoneNumber} registered.`);
    } catch (error) {
      console.error('❌ Error registering conversation:', error);
      throw error;
    }
  }

  public async registerOrUpdateUser(phoneNumber: string, userName?: string): Promise<{ userExists: boolean; userData?: any[] }> {
    if (!config.spreadsheetId) {
      console.error('❌ SPREADSHEET_ID is not configured for user management.');
      throw new Error('SPREADSHEET_ID not configured.');
    }

    const sheetName = 'Users';
    const headers = ['PhoneNumber', 'UserName', 'JoinDate', 'LastActive'];
    await this.ensureSheetExists(config.spreadsheetId, sheetName, headers);

    try {
      const response = await this.sheets.spreadsheets.values.get({ spreadsheetId: config.spreadsheetId, range: `${sheetName}!A:D` });
      const rows = response.data.values || [];
      const userRowIndex = rows.findIndex(row => row[0] === phoneNumber);
      const currentDate = new Date().toISOString();

      if (userRowIndex !== -1) {
        const rowNumber = userRowIndex + 1;
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: config.spreadsheetId,
          range: `${sheetName}!D${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[currentDate]] },
        });
        console.log(`[Sheets] User ${phoneNumber} updated.`);
        return { userExists: true, userData: rows[userRowIndex] };
      } else {
        const newUserRow = [phoneNumber, userName || 'N/A', currentDate, currentDate];
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: config.spreadsheetId,
          range: sheetName,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [newUserRow] },
        });
        console.log(`[Sheets] New user ${phoneNumber} registered.`);
        return { userExists: false, userData: newUserRow };
      }
    } catch (error) {
      console.error(`❌ Error in registerOrUpdateUser for ${phoneNumber}:`, error);
      throw error;
    }
  }

  public async getLastUserConversations(phoneNumber: string, limit: number = 5): Promise<Array<{timestamp: string, userMessage: string, botResponse: string}>> {
    if (!config.spreadsheetId) return [];

    try {
      const sheetName = 'Conversations';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: sheetName,
      });

      const data = (response.data.values as any[][]) || [];
      // Skip header row by slicing from index 1
      const userConversations = data
        .slice(1)
        .filter(row => row[0] === phoneNumber)
        .map(row => ({ timestamp: row[1], userMessage: row[2], botResponse: row[3] }));

      return userConversations
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error: any) {
      if (error.message.includes('Unable to parse range')) {
        // This can happen if the 'Conversations' sheet doesn't exist yet.
        console.log(`[Sheets] 'Conversations' sheet not found for ${phoneNumber}. Returning empty history.`);
        return [];
      }
      console.error('❌ Error getting last conversations:', error);
      return [];
    }
  }
}

export default SheetsService;
