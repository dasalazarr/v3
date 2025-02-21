import { google } from "googleapis";
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
import { config } from "../config";
import { injectable, inject, container } from "tsyringe";

interface ConfigType {
  privateKey: string;
  clientEmail: string;
  spreadsheetId: string;
}

@injectable()
export class SheetManager {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(
    @inject('Config') private readonly config: ConfigType
  ) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: this.config.privateKey,
        client_email: this.config.clientEmail,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = this.config.spreadsheetId;
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
    conversation: { role: string, content: string }[]
  ): Promise<void> {
    try {
      // Verificar si el usuario existe
      const exists = await this.userExists(number);

      if (!exists) {
        // Si el usuario no existe, crear una nueva pestaña para él
        await this.createUserSheet(number);
      }

      // Obtener las conversaciones existentes
      const existingConvs = await this.getUserConv(number);

      // Agregar la nueva conversación al inicio
      const newConvs = [...conversation, ...existingConvs];

      // Actualizar la pestaña del usuario
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: newConvs.map((conv) => [conv.role, conv.content]),
        },
      });
    } catch (error) {
      console.error("Error al agregar conversación:", error);
      throw error;
    }
  }

  // Función para obtener las conversaciones de un usuario
  async getUserConv(number: string): Promise<{ role: string, content: string }[]> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:B`,
      });

      const rows = result.data.values;
      if (rows) {
        return rows.map((row) => ({
          role: row[0],
          content: row[1],
        }));
      }
      return [];
    } catch (error) {
      console.error("Error al obtener conversaciones:", error);
      return [];
    }
  }

  // Función para crear una nueva pestaña para un usuario
  private async createUserSheet(number: string): Promise<void> {
    try {
      // Agregar el número a la lista de usuarios
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:A",
        valueInputOption: "RAW",
        requestBody: {
          values: [[number]],
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
                  title: number,
                },
              },
            },
          ],
        },
      });

      // Configurar los encabezados de la pestaña
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A1:B1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["Role", "Content"]],
        },
      });
    } catch (error) {
      console.error("Error al crear pestaña de usuario:", error);
      throw error;
    }
  }

  // Función para obtener las preguntas/respuestas invertidas
  async getUserConvInvert(number: string): Promise<any[]> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:B`, // Asumiendo que las preguntas están en A y respuestas en B
      });

      const rows = result.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // Tomar las últimas preguntas/respuestas (hasta un máximo de 3) y revertir el orden
      const lastConversations = rows.slice(-3).reverse();

      // Formatear las respuestas en el formato solicitado
      const formattedConversations = [];
      for (let i = 0; i < lastConversations.length; i++) {
        const [userQuestion, assistantAnswer] = lastConversations[i];
        formattedConversations.push(
          { role: "user", content: userQuestion },
          { role: "assistant", content: assistantAnswer }
        );
      }

      return formattedConversations;
    } catch (error) {
      console.error("Error al obtener la conversación del usuario:", error);
      return [];
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
    }
  }

  async createUser(number: string, name: string, mail:string): Promise<void> {
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
      }
    }
  }  

}

// Register dependencies
container.register<ConfigType>('Config', {
  useValue: {
    privateKey: config.privateKey,
    clientEmail: config.clientEmail,
    spreadsheetId: config.spreadsheetId
  }
});
