import { google } from 'googleapis';
import { config } from '../config';

interface Expense {
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

class SheetsService {
  private sheets;
  private readonly CATEGORIES = [
    "Alimentación",
    "Transporte",
    "Entretenimiento",
    "Salud",
    "Educación",
    "Hogar",
    "Otros"
  ];

  private readonly PAYMENT_METHODS = [
    "Efectivo",
    "Tarjeta de Crédito",
    "Tarjeta de Débito",
    "Transferencia"
  ];

  constructor() {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  private getMonthSheetName(): string {
    const date = new Date();
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `Gastos_${months[date.getMonth()]}_${date.getFullYear()}`;
  }

  async initializeExpenseSheet(): Promise<string> {
    try {
      const sheetName = this.getMonthSheetName();
      
      // Verificar si la hoja ya existe
      const sheets = await this.sheets.spreadsheets.get({
        spreadsheetId: config.spreadsheetId
      });

      const existingSheet = sheets.data.sheets?.find(
        sheet => sheet.properties?.title === sheetName
      );

      if (!existingSheet) {
        // Crear nueva hoja
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: config.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });

        // Configurar encabezados y formato
        await this.setupSheetFormat(sheetName);
      }

      return sheetName;
    } catch (error) {
      console.error('Error al inicializar hoja de gastos:', error);
      throw error;
    }
  }

  private async setupSheetFormat(sheetName: string) {
    try {
      // Configurar encabezados
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A1:F1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Fecha',
            'Descripción',
            'Categoría',
            'Monto',
            'Método de Pago',
            'Notas'
          ]]
        }
      });

      // Configurar validación de datos y formato
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.spreadsheetId,
        requestBody: {
          requests: [
            // Formato de fecha
            {
              repeatCell: {
                range: {
                  sheetId: await this.getSheetId(sheetName),
                  startColumnIndex: 0,
                  endColumnIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: 'DATE',
                      pattern: 'dd/mm/yyyy'
                    }
                  }
                },
                fields: 'userEnteredFormat.numberFormat'
              }
            },
            // Formato de moneda
            {
              repeatCell: {
                range: {
                  sheetId: await this.getSheetId(sheetName),
                  startColumnIndex: 3,
                  endColumnIndex: 4
                },
                cell: {
                  userEnteredFormat: {
                    numberFormat: {
                      type: 'CURRENCY',
                      pattern: '"$"#,##0.00'
                    }
                  }
                },
                fields: 'userEnteredFormat.numberFormat'
              }
            },
            // Validación de categorías
            {
              setDataValidation: {
                range: {
                  sheetId: await this.getSheetId(sheetName),
                  startColumnIndex: 2,
                  endColumnIndex: 3,
                  startRowIndex: 1
                },
                rule: {
                  condition: {
                    type: 'ONE_OF_LIST',
                    values: this.CATEGORIES.map(cat => ({ userEnteredValue: cat }))
                  },
                  strict: true,
                  showCustomUi: true
                }
              }
            },
            // Validación de métodos de pago
            {
              setDataValidation: {
                range: {
                  sheetId: await this.getSheetId(sheetName),
                  startColumnIndex: 4,
                  endColumnIndex: 5,
                  startRowIndex: 1
                },
                rule: {
                  condition: {
                    type: 'ONE_OF_LIST',
                    values: this.PAYMENT_METHODS.map(method => ({ userEnteredValue: method }))
                  },
                  strict: true,
                  showCustomUi: true
                }
              }
            }
          ]
        }
      });

      // Configurar formato condicional para montos altos
      await this.setupConditionalFormatting(sheetName);

    } catch (error) {
      console.error('Error al configurar formato de hoja:', error);
      throw error;
    }
  }

  private async getSheetId(sheetName: string): Promise<number> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId
    });

    const sheet = response.data.sheets?.find(
      s => s.properties?.title === sheetName
    );

    if (!sheet?.properties?.sheetId) {
      throw new Error(`No se encontró la hoja ${sheetName}`);
    }

    return sheet.properties.sheetId;
  }

  private async setupConditionalFormatting(sheetName: string) {
    const sheetId = await this.getSheetId(sheetName);
    
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.spreadsheetId,
      requestBody: {
        requests: [{
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startColumnIndex: 3,
                endColumnIndex: 4
              }],
              booleanRule: {
                condition: {
                  type: 'NUMBER_GREATER',
                  values: [{ userEnteredValue: '100' }]
                },
                format: {
                  backgroundColor: {
                    red: 0.9,
                    green: 0.8,
                    blue: 0.8
                  }
                }
              }
            }
          }
        }]
      }
    });
  }

  async addExpense(expense: Expense): Promise<void> {
    try {
      const sheetName = await this.initializeExpenseSheet();
      
      // Obtener la siguiente fila disponible
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A:A`
      });

      const nextRow = (response.data.values?.length || 1) + 1;

      // Agregar el gasto
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A${nextRow}:F${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            expense.date,
            expense.description,
            expense.category,
            expense.amount,
            expense.paymentMethod,
            expense.notes || ''
          ]]
        }
      });

      console.log(`✅ Gasto registrado en ${sheetName}`);
    } catch (error) {
      console.error('Error al agregar gasto:', error);
      throw error;
    }
  }

  async getTotalsByCategory(sheetName?: string): Promise<Record<string, number>> {
    try {
      const currentSheet = sheetName || await this.getMonthSheetName();
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${currentSheet}!C2:D`
      });

      const totals: Record<string, number> = {};
      
      if (response.data.values) {
        response.data.values.forEach(row => {
          const category = row[0];
          const amount = parseFloat(row[1]) || 0;
          
          if (category) {
            totals[category] = (totals[category] || 0) + amount;
          }
        });
      }

      return totals;
    } catch (error) {
      console.error('Error al obtener totales por categoría:', error);
      throw error;
    }
  }

  async userExists(phoneNumber: string): Promise<boolean> {
    try {
      // Assuming there's a 'Users' sheet with phone numbers in column A
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: 'Users!A:A'
      });

      if (!response.data.values) {
        return false;
      }

      // Check if the phone number exists in the list
      return response.data.values.some(row => row[0] === phoneNumber);
    } catch (error) {
      console.error('Error al verificar si el usuario existe:', error);
      return false;
    }
  }

  async createUser(phoneNumber: string, name: string, email: string): Promise<void> {
    try {
      // Assuming there's a 'Users' sheet with columns: PhoneNumber, Name, Email, RegisterDate, LastActive
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: 'Users!A:A'
      });

      const nextRow = (response.data.values?.length || 0) + 1;
      const currentDate = new Date().toISOString();

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `Users!A${nextRow}:E${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            phoneNumber,
            name,
            email,
            currentDate,
            currentDate
          ]]
        }
      });

      console.log(`✅ Usuario registrado: ${name} (${phoneNumber})`);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  async addConverToUser(phoneNumber: string, messages: Array<{role: string, content: string}>): Promise<void> {
    try {
      // Assuming there's a 'Conversations' sheet with columns: PhoneNumber, Timestamp, UserMessage, BotResponse
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: 'Conversations!A:A'
      });

      const nextRow = (response.data.values?.length || 0) + 1;
      const currentDate = new Date().toISOString();

      // Extract user message and bot response from messages array
      const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
      const botResponse = messages.find(msg => msg.role === 'assistant')?.content || '';

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `Conversations!A${nextRow}:D${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            phoneNumber,
            currentDate,
            userMessage,
            botResponse
          ]]
        }
      });

      // Update user's LastActive timestamp
      await this.updateUserLastActive(phoneNumber);

      console.log(`✅ Conversación registrada para: ${phoneNumber}`);
    } catch (error) {
      console.error('Error al registrar conversación:', error);
      throw error;
    }
  }

  private async updateUserLastActive(phoneNumber: string): Promise<void> {
    try {
      // Find the user's row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: 'Users!A:A'
      });

      if (!response.data.values) {
        console.error('No se encontraron usuarios');
        return;
      }

      const userRowIndex = response.data.values.findIndex(row => row[0] === phoneNumber);
      
      if (userRowIndex === -1) {
        console.error(`Usuario no encontrado: ${phoneNumber}`);
        return;
      }

      const rowNumber = userRowIndex + 1; // Sheets is 1-indexed
      const currentDate = new Date().toISOString();

      // Update LastActive timestamp (column E)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `Users!E${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[currentDate]]
        }
      });
    } catch (error) {
      console.error('Error al actualizar LastActive del usuario:', error);
    }
  }
}

export default new SheetsService();
