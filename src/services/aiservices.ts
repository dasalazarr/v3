import { config } from "../config";
import * as fs from 'fs';
import * as path from 'path';
import { singleton, inject } from 'tsyringe';
import { SheetsService } from './sheetsServices';
import { BudgetService } from './budgetService';
import { AlertService } from './alertService';

interface ExpenseCommand {
  type: 'expense';
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

@singleton()
export class AIService {
  private systemPrompt: string;
  private baseURL: string;
  private apiKey: string;

  // Almacenamiento de contexto de conversación por usuario
  private conversationContexts: Map<string, Array<{role: string, content: string}>> = new Map();

  constructor(
    @inject("SheetsService") private sheetsService: SheetsService,
    @inject("BudgetService") private budgetService: BudgetService,
    @inject("AlertService") private alertService: AlertService
  ) {
    this.baseURL = config.baseURL || "https://api.deepseek.com/v1";
    this.apiKey = config.apiKey;

    // Load system prompt
    try {
      const promptPath = path.join(process.cwd(), 'assets', 'prompts', 'prompt_DeepSeek.txt');
      this.systemPrompt = fs.readFileSync(promptPath, 'utf8');
      console.log("✅ Sistema prompt cargado correctamente");
    } catch (error) {
      console.error("❌ Error al cargar el prompt:", error);
      this.systemPrompt = "Eres un asistente amable y profesional de Khipu.";
    }
  }

  private parseExpenseCommand(text: string): ExpenseCommand | null {
    // Patrones comunes de expresión de gastos
    const patterns = [
      // "Gasté 50 en comida"
      /gast[eéó]\s+(\d+)\s+(?:en|por)\s+(.+)/i,
      // "Pagué 30 por transporte"
      /pag[uúü][eéó]\s+(\d+)\s+(?:en|por)\s+(.+)/i,
      // "Compré comida por 25"
      /compr[eéó]\s+(.+)\s+por\s+(\d+)/i,
      // "50 en comida" or "50 pesos en comida"
      /(\d+)(?:\s+(?:pesos|dolares|dólares|soles))?\s+(?:en|por)\s+(.+)/i,
      // "Dos dolares en didi" (palabras numéricas)
      /(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:pesos|dolares|dólares|soles)?\s+(?:en|por)\s+(.+)/i
    ];

    // Mapeo de palabras numéricas a valores
    const wordToNumber: Record<string, number> = {
      'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10
    };

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amount: number;
        let description: string;

        if (pattern.toString().includes('compr[eéó]')) {
          description = match[1];
          amount = parseInt(match[2]);
        } else if (pattern.toString().includes('uno|dos|tres')) {
          // Patrón con palabras numéricas
          amount = wordToNumber[match[1].toLowerCase()];
          description = match[2];
        } else {
          amount = parseInt(match[1]);
          description = match[2];
        }

        // Inferir categoría basada en palabras clave
        const category = this.inferCategory(description.toLowerCase());

        return {
          type: 'expense',
          date: new Date().toLocaleDateString('es-ES'),
          description,
          category,
          amount,
          paymentMethod: 'Efectivo', // Default
          notes: ''
        };
      }
    }

    return null;
  }

  private inferCategory(description: string): string {
    const categoryKeywords: Record<string, string[]> = {
      'Alimentación': ['comida', 'almuerzo', 'cena', 'desayuno', 'restaurante', 'mercado'],
      'Transporte': ['taxi', 'bus', 'metro', 'gasolina', 'uber', 'transporte'],
      'Entretenimiento': ['cine', 'película', 'juego', 'concierto', 'evento'],
      'Salud': ['medicina', 'doctor', 'farmacia', 'médico', 'hospital'],
      'Educación': ['libro', 'curso', 'clase', 'escuela', 'universidad'],
      'Hogar': ['casa', 'alquiler', 'servicios', 'luz', 'agua', 'gas'],
      'Otros': []
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return category;
      }
    }

    return 'Otros';
  }

  private getUserContext(phoneNumber: string): Array<{role: string, content: string}> {
    if (!this.conversationContexts.has(phoneNumber)) {
      this.conversationContexts.set(phoneNumber, []);
    }
    return this.conversationContexts.get(phoneNumber) || [];
  }

  private updateUserContext(phoneNumber: string, userMessage: string, botResponse: string): void {
    const context = this.getUserContext(phoneNumber);
    
    // Agregar los nuevos mensajes
    context.push({ role: 'user', content: userMessage });
    context.push({ role: 'assistant', content: botResponse });
    
    // Mantener solo los últimos 5 pares de mensajes (10 mensajes en total)
    const maxContextLength = 10;
    if (context.length > maxContextLength) {
      const newContext = context.slice(context.length - maxContextLength);
      this.conversationContexts.set(phoneNumber, newContext);
    } else {
      this.conversationContexts.set(phoneNumber, context);
    }
  }

  async loadConversationHistory(phoneNumber: string): Promise<void> {
    try {
      // Si ya tenemos contexto para este usuario, no necesitamos cargarlo de nuevo
      if (this.conversationContexts.has(phoneNumber)) {
        return;
      }

      // Obtener las últimas 5 conversaciones del usuario desde Sheets
      const conversations = await this.sheetsService.getLastUserConversations(phoneNumber, 5);
      
      // Convertir las conversaciones al formato de contexto
      const context: Array<{role: string, content: string}> = [];
      for (const conv of conversations) {
        if (conv.userMessage) context.push({ role: 'user', content: conv.userMessage });
        if (conv.botResponse) context.push({ role: 'assistant', content: conv.botResponse });
      }
      
      // Guardar el contexto
      this.conversationContexts.set(phoneNumber, context);
    } catch (error) {
      console.error('Error al cargar el historial de conversaciones:', error);
      // Si hay un error, inicializamos con un contexto vacío
      this.conversationContexts.set(phoneNumber, []);
    }
  }

  async chat(prompt: string, messages: any[]): Promise<string> {
    try {
      console.log("Making API request to DeepSeek with model:", config.Model);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: config.Model || "deepseek-chat",
          messages: [
            {
              role: "system",
              content: this.systemPrompt
            },
            ...messages,
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error: any) {
      console.error("Error in DeepSeek chat completion:", error);

      // Manejo específico de errores
      if (error.message?.includes('401')) {
        return "Error de autenticación con DeepSeek. Por favor, verifica tu API key.";
      } else if (error.message?.includes('429')) {
        return "Se ha excedido el límite de solicitudes a DeepSeek. Por favor, intenta más tarde.";
      } else if (error.message?.includes('500')) {
        return "Error en el servidor de DeepSeek. Por favor, intenta más tarde.";
      }

      return "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.";
    }
  }

  async processMessage(message: string, phoneNumber: string): Promise<string> {
    try {
      // Cargar el historial de conversaciones
      await this.loadConversationHistory(phoneNumber);
      
      // Obtener el contexto actual
      const context = this.getUserContext(phoneNumber);
      
      // Verificar si es un comando de gasto
      const expenseCommand = this.parseExpenseCommand(message);
      
      if (expenseCommand) {
        await this.sheetsService.addExpense(expenseCommand);
        
        // Verificar límites de presupuesto y generar alertas si es necesario
        await this.alertService.checkBudgetLimitsForExpense(
          phoneNumber, 
          expenseCommand.category, 
          expenseCommand.amount
        );
        
        // Obtener totales por categoría
        const totals = await this.sheetsService.getTotalsByCategory();
        
        // Formatear respuesta
        const response = [
          `✅ Gasto registrado exitosamente:`,
          `📝 Descripción: ${expenseCommand.description}`,
          `💰 Monto: $${expenseCommand.amount}`,
          `🏷️ Categoría: ${expenseCommand.category}`,
          `\nResumen del mes:`,
          ...Object.entries(totals).map(([cat, total]) => 
            `${cat}: $${total.toFixed(2)}`
          )
        ].join('\n');

        // Actualizar el contexto de la conversación
        this.updateUserContext(phoneNumber, message, response);
        
        // Guardar la conversación en Sheets
        await this.sheetsService.addConverToUser(phoneNumber, [
          { role: 'user', content: message },
          { role: 'assistant', content: response }
        ]);

        return response;
      }

      // Si no es un comando de gasto, procesar con DeepSeek
      // Incluir el contexto en la solicitud a DeepSeek
      const systemMessage = {
        role: "system",
        content: `Eres Khipu, un asistente financiero personal que ayuda a los usuarios a gestionar sus gastos y presupuestos. 
                 Responde de manera amigable y concisa. 
                 Si el usuario quiere registrar un gasto, pídele los detalles necesarios.
                 Si el usuario quiere configurar un presupuesto, indícale que puede usar comandos como "presupuesto", "ver presupuesto" o "eliminar presupuesto".
                 Recuerda que puedes registrar gastos con el formato "Gasté X en Y" o "X en Y".`
      };

      const messages = [
        systemMessage,
        ...context,
        { role: "user", content: message }
      ];

      // Enviar a DeepSeek
      const aiResponse = await this.chat(message, messages);
      
      // Actualizar el contexto de la conversación
      this.updateUserContext(phoneNumber, message, aiResponse);
      
      // Guardar la conversación en Sheets
      await this.sheetsService.addConverToUser(phoneNumber, [
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ]);

      return aiResponse;
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      return "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.";
    }
  }
}

// Exportamos la clase, no una instancia
export default AIService;