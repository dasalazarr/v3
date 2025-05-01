import { DOMAIN, detectDomain } from './domain';
import promptCore from './promptCore';
import { AIService } from '../services/aiservices';

// Tipos de intención detectados en los mensajes
export enum INTENT {
  GREETING = 'greeting',
  SCHEDULE_VISIT = 'scheduleVisit',
  PROJECT_STATUS = 'projectStatus',
  BENEFITS = 'benefits',
  OTHER = 'other'
}

// Estructura para el contexto de la conversación
interface ConversationContext {
  domain: DOMAIN;
  intent: INTENT;
  metadata?: any;
}

// Estructura para la respuesta del asistente
interface AssistantResponse {
  message: string;
  context: ConversationContext;
}

/**
 * Controlador que maneja el flujo de la conversación,
 * detectando dominios e intenciones para enrutar adecuadamente
 */
export class ConversacionController {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  /**
   * Detecta la intención basada en el contenido del mensaje
   */
  private detectIntent(message: string): INTENT {
    message = message.toLowerCase();
    
    // Saludos
    if (/^(hola|buenos días|buenas tardes|buenas noches|saludos|hey|hi|hello)/i.test(message)) {
      return INTENT.GREETING;
    }
    
    // Agendar visita
    if (message.includes('agendar') || 
        message.includes('cita') || 
        message.includes('visita') || 
        message.includes('reunión')) {
      return INTENT.SCHEDULE_VISIT;
    }
    
    // Estado de proyecto
    if ((message.includes('estado') || message.includes('avance') || message.includes('progreso')) && 
        (message.includes('proyecto') || /\d{4,}/.test(message))) {
      return INTENT.PROJECT_STATUS;
    }
    
    // Beneficios
    if (message.includes('beneficio') || 
        message.includes('ventaja') || 
        message.includes('qué ofrece') || 
        message.includes('por qué usar')) {
      return INTENT.BENEFITS;
    }
    
    return INTENT.OTHER;
  }

  /**
   * Extrae metadatos relevantes del mensaje según la intención
   */
  private extractMetadata(message: string, intent: INTENT): any {
    const metadata: any = {};
    
    // Para estado de proyecto, extraer ID del proyecto
    if (intent === INTENT.PROJECT_STATUS) {
      const projectIdMatch = message.match(/proyecto\s+(\d+)|(\d{4,})/i);
      if (projectIdMatch) {
        metadata.projectId = projectIdMatch[1] || projectIdMatch[2];
      }
    }
    
    // Para agendar visita, extraer posibles fechas mencionadas
    if (intent === INTENT.SCHEDULE_VISIT) {
      // Implementación simplificada - en un sistema real se integraría con un extractor de fechas
      const dateMatch = message.match(/(\d{1,2}[\/-]\d{1,2})([\/-]\d{2,4})?/);
      if (dateMatch) {
        metadata.suggestedDate = dateMatch[0];
      }
    }
    
    return metadata;
  }

  /**
   * Genera una respuesta basada en el dominio y la intención
   */
  private async generateResponse(
    message: string, 
    domain: DOMAIN, 
    intent: INTENT, 
    metadata: any
  ): Promise<string> {
    // Para intenciones específicas, usar plantillas del dominio
    switch(intent) {
      case INTENT.GREETING:
        return promptCore.getWelcomePrompt(domain);
        
      case INTENT.SCHEDULE_VISIT:
        // Aquí se podrían obtener slots disponibles de un servicio de calendario
        const availableSlots = [
          'Lunes 6-May 10:00',
          'Martes 7-May 15:00',
          'Jueves 9-May 11:30'
        ];
        return promptCore.getScheduleVisitPrompt(domain, { availableSlots });
        
      case INTENT.PROJECT_STATUS:
        // Aquí se podría consultar una base de datos para obtener el estado real
        const projectData = {
          projectId: metadata.projectId || '1234',
          phase: 'diseño preliminar',
          progress: 35,
          nextDelivery: '15-Mayo-2025',
          notes: 'Pendiente aprobación de planos'
        };
        return promptCore.getProjectStatusPrompt(domain, projectData);
        
      case INTENT.BENEFITS:
        return promptCore.getBenefitsPrompt(domain);
        
      default:
        // Para otras intenciones, usar el servicio de IA con el prompt del dominio
        const basePrompt = promptCore.getBasePrompt(domain);
        // Usamos el número de teléfono como un ID genérico para la conversación
        // En un sistema real, se usaría un ID específico del usuario o la conversación
        const phoneNumber = "default-user";
        const aiResponse = await this.aiService.processMessage(message, phoneNumber);
        return aiResponse;
    }
  }

  /**
   * Procesa un mensaje y genera una respuesta con contexto
   */
  public async processMessage(message: string, forceDomain?: DOMAIN): Promise<AssistantResponse> {
    // Detectar dominio e intención
    const domain = forceDomain || detectDomain(message);
    const intent = this.detectIntent(message);
    const metadata = this.extractMetadata(message, intent);
    
    // Generar respuesta
    const responseText = await this.generateResponse(message, domain, intent, metadata);
    
    // Devolver respuesta con contexto
    return {
      message: responseText,
      context: {
        domain,
        intent,
        metadata
      }
    };
  }

  /**
   * Inicia una nueva conversación con un saludo personalizado
   */
  public async startConversation(domain: DOMAIN = DOMAIN.DEFAULT): Promise<AssistantResponse> {
    const message = promptCore.getWelcomePrompt(domain);
    
    return {
      message,
      context: {
        domain,
        intent: INTENT.GREETING
      }
    };
  }

  /**
   * Cambia explícitamente el dominio de la conversación
   */
  public async changeDomain(newDomain: DOMAIN): Promise<AssistantResponse> {
    return this.startConversation(newDomain);
  }
}
