import { google } from "googleapis";
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
import { config } from "../config";

class SheetManager {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(spreadsheetId: string, privateKey: string, clientEmail: string) {
    if (!spreadsheetId || !privateKey || !clientEmail) {
      throw new Error('Missing required Google Sheets configuration. Check your .env file.');
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: 'whatsai-445316',
          private_key: privateKey,
          client_email: clientEmail,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      this.sheets = google.sheets({ version: "v4", auth });
      this.spreadsheetId = spreadsheetId;
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      throw error;
    }
  }

  // Función para verificar si un usuario existe
  async userExists(number: string): Promise<boolean> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:A", // Asumiendo que los números de teléfono están en la columna A
      });

      const rows = result.data.values;
      if (rows) {
        const numbers = rows.map((row) => row[0]);
        return numbers.includes(number);
      }
      return false;
    } catch (error) {
      console.error("Error al verificar si el usuario existe:", error);
      return false;
    }
  }

  // Función para agregar una conversación al inicio de la pestaña del usuario
  async addConverToUser(
    number: string,
    conversation: { role: string; content: string }[]
  ): Promise<void> {
    try {
      const question = conversation.find((c) => c.role === "user")?.content;
      const answer = conversation.find((c) => c.role === "assistant")?.content;
      const date = new Date().toISOString(); // Fecha en formato UTC

      // Verificar si el usuario existe
      const exists = await this.userExists(number);

      if (!exists) {
        // Si el usuario no existe, crear una nueva pestaña para él
        try {
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: number,
                    },
                  },
                },
              ],
            },
          });
        } catch (error) {
          console.error("Error al crear nueva pestaña:", error);
          throw error;
        }
      }

      // Agregar la conversación al inicio de la pestaña del usuario
      const values = [[date, question, answer]];

      try {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${number}!A:C`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values,
          },
        });
      } catch (error) {
        console.error("Error al agregar conversación:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error en addConverToUser:", error);
      throw error;
    }
  }

  async createUser(number: string, name: string, mail: string): Promise<void> {
    try {
      // Agregar el usuario a la pestaña 'Users'
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:D",
        valueInputOption: "RAW",
        requestBody: {
          values: [[number, name, mail, ""]],
        },
      });

      // Crear una nueva pestaña con el nombre del número de teléfono
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: number,
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error("Error al crear usuario o nueva pestaña:", error);
      throw error;
    }
  }

  async appendToSheet(sheetName: string, row: any[]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row]
        }
      });
    } catch (error) {
      console.error(`Error al agregar datos a ${sheetName}:`, error);
      throw error;
    }
  }

  async getSheetData(sheetName: string): Promise<any[][]> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });

      return result.data.values || [];
    } catch (error) {
      console.error(`Error al obtener datos de ${sheetName}:`, error);
      throw error;
    }
  }

  async getUserThread(number: string): Promise<string | null> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:D",
      });

      const rows = result.data.values || [];
      const userRow = rows.find(row => row[0] === number);
      return userRow?.[3] || null;
    } catch (error) {
      console.error("Error al obtener thread del usuario:", error);
      return null;
    }
  }

  async saveUserThread(number: string, threadId: string): Promise<void> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:D",
      });

      const rows = result.data.values || [];
      const userRowIndex = rows.findIndex(row => row[0] === number);

      const range = userRowIndex !== -1 
        ? `Users!D${userRowIndex + 1}`
        : "Users!A:D";

      const values = userRowIndex !== -1
        ? [[threadId]]
        : [[number, "", "", threadId]];

      await this.sheets.spreadsheets.values[userRowIndex !== -1 ? 'update' : 'append']({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: "RAW",
        ...(userRowIndex === -1 && { insertDataOption: "INSERT_ROWS" }),
        requestBody: { values }
      });
    } catch (error) {
      console.error("Error al guardar thread del usuario:", error);
      throw error;
    }
  }
}

export { SheetManager };

// Log de configuración para debug
console.log('Google Sheets Configuration:');
console.log('SpreadsheetId:', config.spreadsheetId ? 'Set' : 'Not Set');
console.log('Client Email:', config.clientEmail ? config.clientEmail : 'Not Set');
console.log('Private Key:', config.privateKey ? 'Set' : 'Not Set');

const sheetManager = new SheetManager(
    config.spreadsheetId,
    config.privateKey,
    config.clientEmail
);

export default sheetManager;
