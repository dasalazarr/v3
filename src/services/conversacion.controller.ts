/**
 * conversacion.controller.ts
 * 
 * Controlador para gestionar el flujo de conversación con integración
 * del router de dominios y los módulos específicos por dominio.
 */

import { singleton, inject } from 'tsyringe';
import { AIService } from './aiservices';
import { detectDomain, detectIntent } from '../router';
import { Domain } from '../core/promptCore';

// Interfaz para respuestas del controlador
interface ConversationResponse {
  success: boolean;
  message: string;
  domain?: Domain;
  intent?: string;
  params?: Record<string, string>;
  metadata?: Record<string, any>;
}

@singleton()
export class ConversacionController {
  constructor(
    @inject(AIService) private aiService: AIService
  ) {}

  /**
   * Procesa un mensaje de usuario e integra el router de dominios
   * para determinar el contexto y dirigir la conversación al módulo adecuado
   * 
   * @param message - Mensaje del usuario
   * @param phoneNumber - Número de teléfono o identificador del usuario
   * @param sessionId - Identificador opcional de la sesión
   * @returns Respuesta estructurada con el mensaje del asistente y metadatos
   */
  async processMessage(
    message: string, 
    phoneNumber: string,
    sessionId?: string
  ): Promise<ConversationResponse> {
    try {
      console.log(`[ConversacionController] Procesando mensaje: "${message.substring(0, 50)}..."`);
      
      // 1. Detectar el dominio del mensaje
      const detectedDomain = detectDomain(message);
      console.log(`[ConversacionController] Dominio detectado: ${detectedDomain}`);
      
      // 2. Detectar la intención dentro del dominio
      const { intent, params } = detectIntent(message, detectedDomain);
      console.log(`[ConversacionController] Intención detectada: ${intent}`, params);
      
      // 3. Actualizar el dominio en el servicio AI si es necesario
      const currentDomain = this.aiService.getDomain();
      if (detectedDomain !== currentDomain) {
        console.log(`[ConversacionController] Cambiando dominio de ${currentDomain} a ${detectedDomain}`);
        this.aiService.setDomain(detectedDomain);
      }
      
      // 4. Procesar el mensaje con el servicio AI
      const aiResponse = await this.aiService.processMessage(message, phoneNumber);
      
      // 5. Preparar y devolver la respuesta estructurada
      return {
        success: true,
        message: aiResponse,
        domain: detectedDomain,
        intent,
        params,
        metadata: {
          sessionId,
          timestamp: new Date().toISOString(),
          domainChanged: detectedDomain !== currentDomain
        }
      };
    } catch (error) {
      console.error('[ConversacionController] Error al procesar mensaje:', error);
      
      return {
        success: false,
        message: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Error desconocido al procesar el mensaje',
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Inicia una nueva conversación con el usuario
   * 
   * @param phoneNumber - Número de teléfono o identificador del usuario
   * @param initialDomain - Dominio inicial opcional
   * @returns Mensaje de bienvenida y metadatos de la conversación
   */
  async startConversation(
    phoneNumber: string,
    initialDomain?: Domain
  ): Promise<ConversationResponse> {
    try {
      // Si se proporciona un dominio inicial, establecerlo
      if (initialDomain) {
        this.aiService.setDomain(initialDomain);
      }
      
      const domain = this.aiService.getDomain();
      console.log(`[ConversacionController] Iniciando conversación en dominio: ${domain}`);
      
      // Generar mensaje de bienvenida basado en el dominio
      const welcomeMessage = await this.getWelcomeMessage(domain);
      
      return {
        success: true,
        message: welcomeMessage,
        domain,
        intent: 'welcome',
        metadata: {
          timestamp: new Date().toISOString(),
          isNewConversation: true
        }
      };
    } catch (error) {
      console.error('[ConversacionController] Error al iniciar conversación:', error);
      
      return {
        success: false,
        message: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Error desconocido al iniciar la conversación',
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Cambia explícitamente el dominio de la conversación
   * 
   * @param phoneNumber - Número de teléfono o identificador del usuario
   * @param newDomain - Nuevo dominio a establecer
   * @returns Confirmación del cambio de dominio
   */
  async changeDomain(
    phoneNumber: string,
    newDomain: Domain
  ): Promise<ConversationResponse> {
    try {
      const previousDomain = this.aiService.getDomain();
      
      // Cambiar el dominio
      this.aiService.setDomain(newDomain);
      console.log(`[ConversacionController] Dominio cambiado manualmente de ${previousDomain} a ${newDomain}`);
      
      // Generar mensaje de confirmación
      const confirmationMessage = `He cambiado al asistente de ${this.getDomainDisplayName(newDomain)}. ¿En qué puedo ayudarte?`;
      
      return {
        success: true,
        message: confirmationMessage,
        domain: newDomain,
        intent: 'domain_change',
        metadata: {
          timestamp: new Date().toISOString(),
          previousDomain,
          manualChange: true
        }
      };
    } catch (error) {
      console.error('[ConversacionController] Error al cambiar dominio:', error);
      
      return {
        success: false,
        message: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Error desconocido al cambiar de dominio',
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.name : 'Unknown'
        }
      };
    }
  }

  /**
   * Genera un mensaje de bienvenida basado en el dominio
   * 
   * @param domain - Dominio para el mensaje de bienvenida
   * @returns Mensaje de bienvenida personalizado
   */
  private async getWelcomeMessage(domain: Domain): Promise<string> {
    const domainDisplayName = this.getDomainDisplayName(domain);
    
    const welcomeMessages: Record<Domain, string> = {
      dental: `¡Hola! Soy el asistente virtual de la Clínica Dental. ¿En qué puedo ayudarte hoy? Puedo darte información sobre nuestros servicios, agendar citas o responder preguntas frecuentes.`,
      dermatologia: `¡Bienvenido/a a la Clínica Dermatológica! Soy tu asistente virtual. Puedo ayudarte con información sobre tratamientos, agendamiento de citas o resolver tus dudas sobre el cuidado de la piel.`,
      municipal: `Bienvenido/a al servicio de asistencia municipal. Estoy aquí para ayudarte con información sobre trámites, servicios municipales, pagos o cualquier consulta relacionada con el municipio.`,
      educacion: `¡Hola! Soy el asistente virtual de nuestra institución educativa. Puedo ayudarte con información sobre programas académicos, procesos de matrícula, becas o cualquier consulta relacionada con tus estudios.`,
      eventos: `¡Bienvenido/a a nuestro servicio de organización de eventos! Puedo ayudarte a planificar tu evento, reservar espacios, coordinar servicios o responder cualquier duda sobre nuestras opciones disponibles.`,
      proyectos: `Bienvenido/a al asistente de gestión de proyectos. Estoy aquí para ayudarte con el seguimiento de tus proyectos, asignación de tareas, cronogramas o cualquier consulta relacionada con la gestión de tu proyecto.`
    };
    
    return welcomeMessages[domain];
  }

  /**
   * Obtiene el nombre de visualización de un dominio
   * 
   * @param domain - Dominio a convertir
   * @returns Nombre amigable del dominio
   */
  private getDomainDisplayName(domain: Domain): string {
    const displayNames: Record<Domain, string> = {
      dental: 'Clínica Dental',
      dermatologia: 'Clínica Dermatológica',
      municipal: 'Servicios Municipales',
      educacion: 'Institución Educativa',
      eventos: 'Organización de Eventos',
      proyectos: 'Gestión de Proyectos'
    };
    
    return displayNames[domain];
  }
}

export default ConversacionController;
