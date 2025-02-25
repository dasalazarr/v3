import { config } from "../config";
import * as fs from 'fs';
import * as path from 'path';
import sheetsService from './sheetsServices';

interface ExpenseCommand {
  type: 'expense';
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

class aiServices {
  private systemPrompt: string;
  private baseURL: string;
  private apiKey: string;

  constructor() {
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
      /compr[eéó]\s+(.+)\s+por\s+(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amount: number;
        let description: string;

        if (pattern.toString().includes('compr[eéó]')) {
          description = match[1];
          amount = parseInt(match[2]);
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

  async chat(prompt: string, messages: any[]): Promise<string> {
    try {
      console.log("Making API request to DeepSeek with model:", config.Model);

      // Verificar si es un comando de gasto
      const expenseCommand = this.parseExpenseCommand(prompt);
      
      if (expenseCommand) {
        await sheetsService.addExpense(expenseCommand);
        
        // Obtener totales por categoría
        const totals = await sheetsService.getTotalsByCategory();
        
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

        return response;
      }

      // Llamada a la API de DeepSeek
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
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

  async processMessage(message: string): Promise<string> {
    try {
      // Verificar si es un comando de gasto
      const expenseCommand = this.parseExpenseCommand(message);
      
      if (expenseCommand) {
        await sheetsService.addExpense(expenseCommand);
        
        // Obtener totales por categoría
        const totals = await sheetsService.getTotalsByCategory();
        
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

        return response;
      }

      // Si no es un comando de gasto, procesar con DeepSeek
      const messages = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: message }
      ];

      return await this.chat(message, messages);

    } catch (error) {
      console.error('Error processing message:', error);
      return 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.';
    }
  }
}

export default new aiServices();