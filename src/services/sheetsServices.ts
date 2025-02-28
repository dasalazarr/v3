import { google, sheets_v4 } from 'googleapis';
import { config } from '../config';
import { injectable } from 'tsyringe';

interface Expense {
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

@injectable()
export class SheetsService {
  private sheets: sheets_v4.Sheets;
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

  private sheetCache: Map<string, boolean> = new Map(); // Cache for sheet existence
  private sheetDataCache: Map<string, any[][]> = new Map(); // Cache for sheet data
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes TTL for cache
  private cacheTimestamps: Map<string, number> = new Map(); // Timestamps for cache invalidation

  constructor() {
    try {
      const auth = new google.auth.JWT({
        email: config.clientEmail,
        key: config.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Error initializing SheetsService:', error);
      throw new Error('Failed to initialize Google Sheets API client');
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.sheetCache.clear();
    this.sheetDataCache.clear();
    this.cacheTimestamps.clear();
    console.log('Sheet caches cleared');
  }

  /**
   * Check if a cache entry is still valid
   * @param key The cache key
   * @returns True if the cache entry is valid, false otherwise
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    
    const now = Date.now();
    return (now - timestamp) < this.cacheTTL;
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
      if (this.sheetCache.has(sheetName) && this.isCacheValid(sheetName)) {
        return sheetName;
      }

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

      this.sheetCache.set(sheetName, true);
      this.cacheTimestamps.set(sheetName, Date.now());

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
      
      if (this.sheetDataCache.has(currentSheet) && this.isCacheValid(currentSheet)) {
        const data = this.sheetDataCache.get(currentSheet);
        if (data) {
          const totals: Record<string, number> = {};
          data.forEach(row => {
            const category = row[2];
            const amount = parseFloat(row[3]) || 0;
            
            if (category) {
              totals[category] = (totals[category] || 0) + amount;
            }
          });
          return totals;
        }
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${currentSheet}!C2:D`
      });

      if (!response.data.values) {
        return {};
      }

      const totals: Record<string, number> = {};
      
      response.data.values.forEach(row => {
        const category = row[0];
        const amount = parseFloat(row[1]) || 0;
        
        if (category) {
          totals[category] = (totals[category] || 0) + amount;
        }
      });

      this.sheetDataCache.set(currentSheet, response.data.values);
      this.cacheTimestamps.set(currentSheet, Date.now());

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
      const sheetName = 'Conversations';
      
      // Check if the Conversations sheet exists
      if (this.sheetCache.has(sheetName) && this.isCacheValid(sheetName)) {
        // Do nothing
      } else {
        const sheets = await this.sheets.spreadsheets.get({
          spreadsheetId: config.spreadsheetId
        });

        const existingSheet = sheets.data.sheets?.find(
          sheet => sheet.properties?.title === sheetName
        );

        if (!existingSheet) {
          // Create the Conversations sheet if it doesn't exist
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

          // Set up headers
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: config.spreadsheetId,
            range: `${sheetName}!A1:D1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                'PhoneNumber', 
                'Timestamp', 
                'UserMessage', 
                'BotResponse'
              ]]
            }
          });
        }

        this.sheetCache.set(sheetName, true);
        this.cacheTimestamps.set(sheetName, Date.now());
      }

      // Get the next available row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A:A`
      });

      const nextRow = (response.data.values?.length || 0) + 1;
      const currentDate = new Date().toISOString();

      // Extract user message and bot response from messages array
      const userMessage = messages.find(msg => msg.role === 'user')?.content || '';
      const botResponse = messages.find(msg => msg.role === 'assistant')?.content || '';

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A${nextRow}:D${nextRow}`,
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

  async getLastUserConversations(phoneNumber: string, limit: number = 5): Promise<Array<{timestamp: string, userMessage: string, botResponse: string}>> {
    try {
      // Verificar si existe la hoja de conversaciones
      const sheetName = 'Conversations';
      if (this.sheetCache.has(sheetName) && this.isCacheValid(sheetName)) {
        // Do nothing
      } else {
        const sheets = await this.sheets.spreadsheets.get({
          spreadsheetId: config.spreadsheetId
        });

        const existingSheet = sheets.data.sheets?.find(
          sheet => sheet.properties?.title === sheetName
        );

        if (!existingSheet) {
          console.log('La hoja de conversaciones no existe');
          return [];
        }

        this.sheetCache.set(sheetName, true);
        this.cacheTimestamps.set(sheetName, Date.now());
      }

      // Obtener todas las conversaciones del usuario
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A:D`
      });

      if (!response.data.values || response.data.values.length <= 1) {
        return [];
      }

      // Filtrar por número de teléfono y ordenar por timestamp (más reciente primero)
      const headers = response.data.values[0];
      const phoneIndex = headers.findIndex((h: string) => h.toLowerCase().includes('phone') || h.toLowerCase().includes('teléfono'));
      const timestampIndex = headers.findIndex((h: string) => h.toLowerCase().includes('timestamp') || h.toLowerCase().includes('fecha'));
      const userMessageIndex = headers.findIndex((h: string) => h.toLowerCase().includes('user') || h.toLowerCase().includes('usuario'));
      const botResponseIndex = headers.findIndex((h: string) => h.toLowerCase().includes('bot') || h.toLowerCase().includes('asistente'));

      if (phoneIndex === -1 || timestampIndex === -1 || userMessageIndex === -1 || botResponseIndex === -1) {
        console.error('Estructura de columnas incorrecta en la hoja de conversaciones');
        return [];
      }

      const userConversations = response.data.values
        .slice(1) // Omitir encabezados
        .filter((row: string[]) => row[phoneIndex] === phoneNumber)
        .sort((a: string[], b: string[]) => {
          // Ordenar por timestamp descendente (más reciente primero)
          const dateA = new Date(a[timestampIndex]).getTime();
          const dateB = new Date(b[timestampIndex]).getTime();
          return dateB - dateA;
        })
        .slice(0, limit) // Limitar al número solicitado
        .map((row: string[]) => ({
          timestamp: row[timestampIndex],
          userMessage: row[userMessageIndex],
          botResponse: row[botResponseIndex]
        }));

      return userConversations;
    } catch (error) {
      console.error('Error al obtener conversaciones del usuario:', error);
      return [];
    }
  }

  /**
   * Appends a row of data to a specified sheet
   * @param sheetName The name of the sheet to append data to
   * @param rowData The array of values to append as a new row
   */
  async appendToSheet(sheetName: string, rowData: any[]): Promise<void> {
    try {
      // If sheetName is "Expenses", use the current month's expense sheet
      const targetSheet = sheetName === "Expenses" 
        ? await this.initializeExpenseSheet()
        : sheetName;
      
      // Get the next available row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${targetSheet}!A:A`
      });

      const nextRow = (response.data.values?.length || 1) + 1;
      
      // Calculate the range based on the number of columns in rowData
      const lastColumn = String.fromCharCode(65 + rowData.length - 1); // A + number of columns - 1
      
      // Append the data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${targetSheet}!A${nextRow}:${lastColumn}${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData]
        }
      });

      console.log(`✅ Data appended to ${targetSheet}`);
    } catch (error) {
      console.error(`Error appending to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves all data from a specified sheet
   * @param sheetName The name of the sheet to get data from
   * @returns An array of rows, where each row is an array of cell values
   */
  async getSheetData(sheetName: string): Promise<string[][]> {
    try {
      // If sheetName is "Expenses", use the current month's expense sheet
      const targetSheet = sheetName === "Expenses" 
        ? await this.initializeExpenseSheet()
        : sheetName;
      
      if (this.sheetDataCache.has(targetSheet) && this.isCacheValid(targetSheet)) {
        const data = this.sheetDataCache.get(targetSheet);
        if (data) {
          return data;
        }
      }

      // Get all data from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${targetSheet}!A:Z` // Get all columns
      });

      // Return the values or an empty array if no data
      const data = response.data.values || [];
      this.sheetDataCache.set(targetSheet, data);
      this.cacheTimestamps.set(targetSheet, Date.now());
      return data;
    } catch (error) {
      console.error(`Error getting data from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async sheetExists(sheetName: string): Promise<boolean> {
    try {
      if (this.sheetCache.has(sheetName) && this.isCacheValid(sheetName)) {
        return this.sheetCache.get(sheetName) || false;
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: config.spreadsheetId
      });

      const sheet = response.data.sheets?.find(
        s => s.properties?.title === sheetName
      );

      const exists = sheet !== undefined;
      this.sheetCache.set(sheetName, exists);
      this.cacheTimestamps.set(sheetName, Date.now());
      return exists;
    } catch (error) {
      console.error('Error al verificar si la hoja existe:', error);
      return false;
    }
  }

  /**
   * Creates a new sheet with the given name and optional headers
   * @param sheetName The name of the sheet to create
   * @param headers Optional array of header column names
   */
  async createSheet(sheetName: string, headers?: string[]): Promise<void> {
    try {
      // Add the sheet to the spreadsheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }
          ]
        }
      });

      // If headers are provided, add them as the first row
      if (headers && headers.length > 0) {
        await this.appendToSheet(sheetName, headers);
      }

      console.log(`Sheet "${sheetName}" created successfully`);
    } catch (error) {
      console.error(`Error creating sheet "${sheetName}":`, error);
      throw error;
    }
  }

  /**
   * Updates a specific row in a sheet
   * @param sheetName The name of the sheet
   * @param rowIndex The row index to update (1-based)
   * @param values The values to set in the row
   */
  async updateSheetRow(sheetName: string, rowIndex: number, values: any[]): Promise<void> {
    try {
      // Get the number of columns in the row
      const columnCount = values.length;
      const lastColumn = String.fromCharCode(65 + columnCount - 1); // A + number of columns - 1
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${sheetName}!A${rowIndex}:${lastColumn}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values]
        }
      });
      
      console.log(`Row ${rowIndex} in sheet "${sheetName}" updated successfully`);
    } catch (error) {
      console.error(`Error updating row ${rowIndex} in sheet "${sheetName}":`, error);
      throw error;
    }
  }
  
  /**
   * Converts a column index to a letter (e.g., 1 -> A, 2 -> B, 27 -> AA)
   * @param index The column index (1-based)
   * @returns The column letter
   */
  private columnIndexToLetter(index: number): string {
    let temp: number;
    let letter = '';
    
    while (index > 0) {
      temp = (index - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      index = (index - temp - 1) / 26;
    }
    
    return letter;
  }
}

export default new SheetsService();
