/**
 * promptCore.ts
 * 
 * Módulo central que contiene la lógica común de prompts para todos los dominios.
 * Implementa patrones reutilizables como saludos, mensajes de fallback, confirmaciones
 * y estructura base que todos los dominios pueden extender.
 */

import * as fs from 'fs';
import * as path from 'path';
import { singleton } from 'tsyringe';

export type Domain = 'dental' | 'dermatologia' | 'municipal' | 'educacion' | 'eventos' | 'proyectos';

export interface PromptConfig {
  organizationName: string;
  assistantName: string;
  foundationYear?: string;
  location?: string;
  maxEmojisPerMessage?: number;
  domainSpecificConfig?: Record<string, any>;
}

@singleton()
export class PromptCore {
  private basePrompts: Map<Domain, string> = new Map();
  private fallbackPrompts: Map<string, string> = new Map();
  private config: PromptConfig;

  constructor() {
    // Configuración por defecto
    this.config = {
      organizationName: 'Organización',
      assistantName: 'Asistente',
      maxEmojisPerMessage: 2
    };

    // Inicializar fallbacks comunes
    this.initializeFallbacks();
  }

  /**
   * Configura los parámetros del prompt core
   */
  setConfig(config: Partial<PromptConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Carga un prompt de dominio específico
   */
  async loadDomainPrompt(domain: Domain): Promise<string> {
    try {
      if (this.basePrompts.has(domain)) {
        return this.basePrompts.get(domain) as string;
      }

      const promptPath = path.join(process.cwd(), 'assets', 'prompts', `prompt_${domain}.txt`);
      
      if (fs.existsSync(promptPath)) {
        const domainPrompt = fs.readFileSync(promptPath, 'utf8');
        this.basePrompts.set(domain, domainPrompt);
        console.log(`✅ Prompt de dominio '${domain}' cargado correctamente`);
        return domainPrompt;
      } else {
        // Si no existe el prompt específico, usar el DeepSeek como fallback
        const defaultPromptPath = path.join(process.cwd(), 'assets', 'prompts', 'prompt_DeepSeek.txt');
        const defaultPrompt = fs.readFileSync(defaultPromptPath, 'utf8');
        this.basePrompts.set(domain, defaultPrompt);
        console.log(`⚠️ Usando prompt DeepSeek por defecto para dominio '${domain}'`);
        return defaultPrompt;
      }
    } catch (error) {
      console.error(`❌ Error al cargar el prompt para el dominio '${domain}':`, error);
      return this.getFallbackPrompt(domain);
    }
  }

  /**
   * Obtiene un saludo genérico personalizable por dominio
   */
  getGreeting(userName?: string): string {
    const { assistantName } = this.config;
    const timeBasedGreeting = this.getTimeBasedGreeting();
    
    if (userName) {
      return `${timeBasedGreeting}, ${userName}! Soy ${assistantName}, ¿en qué puedo ayudarte hoy?`;
    }
    
    return `${timeBasedGreeting}! Soy ${assistantName}, ¿en qué puedo ayudarte hoy?`;
  }

  /**
   * Obtiene un saludo basado en la hora del día
   */
  private getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return "Buenos días";
    } else if (hour >= 12 && hour < 19) {
      return "Buenas tardes";
    } else {
      return "Buenas noches";
    }
  }

  /**
   * Obtiene un mensaje de fallback para cuando no se encuentra un prompt específico
   */
  getFallbackPrompt(domain: Domain): string {
    const { organizationName, assistantName } = this.config;
    
    return `Eres ${assistantName}, un asistente virtual de ${organizationName}. 
Tu misión es brindar soporte preciso y amigable a nuestros usuarios, ayudándoles con información, 
agendamiento de citas y respuesta a preguntas frecuentes.

Formato de respuestas:
- Tono cercano y personalizado: saluda por nombre cuando sea posible.
- Uso controlado de emojis (máx. ${this.config.maxEmojisPerMessage} por mensaje).
- Respuestas precisas y breves (1-2 líneas).
- Ofrece siempre opciones claras y pasos siguientes.`;
  }

  /**
   * Inicializa mensajes de fallback comunes para diferentes escenarios
   */
  private initializeFallbacks(): void {
    this.fallbackPrompts.set('error_general', 
      "Lo siento, ha ocurrido un error inesperado. Por favor, intenta nuevamente en unos minutos.");
    
    this.fallbackPrompts.set('no_entiendo', 
      "Disculpa, no he entendido tu solicitud. ¿Podrías reformularla de otra manera?");
    
    this.fallbackPrompts.set('fuera_de_horario', 
      "Gracias por tu mensaje. En este momento estamos fuera de horario de atención. Te responderemos tan pronto como sea posible.");
    
    this.fallbackPrompts.set('confirmacion', 
      "¡Perfecto! Tu solicitud ha sido procesada correctamente. ¿Hay algo más en lo que pueda ayudarte?");
  }

  /**
   * Obtiene un mensaje de fallback específico
   */
  getFallbackMessage(type: string): string {
    return this.fallbackPrompts.get(type) || 
      "Lo siento, no puedo procesar tu solicitud en este momento. Por favor, intenta más tarde.";
  }

  /**
   * Genera un mensaje de confirmación para citas
   */
  getAppointmentConfirmation(
    service: string, 
    date: string, 
    time: string, 
    provider?: string
  ): string {
    const { assistantName } = this.config;
    
    let confirmation = `¡Perfecto! He agendado tu ${service} para el ${date} a las ${time}`;
    
    if (provider) {
      confirmation += ` con ${provider}`;
    }
    
    confirmation += ` 😁. ¿Te envío un recordatorio un día antes?`;
    
    return confirmation;
  }

  /**
   * Compone un prompt completo para un dominio específico
   */
  async getFullPrompt(domain: Domain, context?: Record<string, any>): Promise<string> {
    const basePrompt = await this.loadDomainPrompt(domain);
    
    // Si hay contexto, podríamos hacer sustituciones en el prompt base
    if (context) {
      // Ejemplo simple de sustitución
      let enhancedPrompt = basePrompt;
      
      Object.entries(context).forEach(([key, value]) => {
        enhancedPrompt = enhancedPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
      });
      
      return enhancedPrompt;
    }
    
    return basePrompt;
  }
}

export default PromptCore;
