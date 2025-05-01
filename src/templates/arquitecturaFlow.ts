import promptCore from '../core/promptCore';
import { DOMAIN } from '../core/domain';
import { INTENT } from '../core/ConversacionController';

/**
 * Clase que implementa el flujo de conversación específico para el dominio de arquitectura
 */
export class ArquitecturaFlow {
  /**
   * Maneja un mensaje según la intención detectada para el dominio de arquitectura
   */
  public async handleMessage(intent: INTENT, message: string, metadata: any = {}): Promise<string> {
    switch (intent) {
      case INTENT.GREETING:
        return this.handleGreeting();
      
      case INTENT.SCHEDULE_VISIT:
        return this.handleScheduleVisit(metadata);
      
      case INTENT.PROJECT_STATUS:
        return this.handleProjectStatus(metadata);
      
      case INTENT.BENEFITS:
        return this.handleBenefits();
      
      default:
        // Para intenciones no manejadas específicamente, usar respuesta genérica
        return "Entiendo tu consulta sobre arquitectura. Por favor, ¿podrías darme más detalles para ayudarte mejor?";
    }
  }

  /**
   * Maneja saludos en el dominio de arquitectura
   */
  private handleGreeting(): string {
    return promptCore.getWelcomePrompt(DOMAIN.ARQUITECTURA);
  }

  /**
   * Maneja solicitudes de agenda de visita
   */
  private handleScheduleVisit(metadata: any): string {
    // En un sistema real, aquí consultaríamos un servicio de calendario
    // para obtener slots disponibles
    const availableSlots = [
      'Lunes 6-May 10:00',
      'Martes 7-May 15:00',
      'Jueves 9-May 11:30'
    ];
    
    return promptCore.getScheduleVisitPrompt(DOMAIN.ARQUITECTURA, { 
      availableSlots,
      suggestedDate: metadata.suggestedDate 
    });
  }

  /**
   * Maneja consultas sobre estado de proyectos
   */
  private handleProjectStatus(metadata: any): string {
    // En un sistema real, aquí consultaríamos una base de datos
    // para obtener el estado real del proyecto
    
    // Mock de datos de proyecto
    const projectData = {
      projectId: metadata.projectId || '1234',
      phase: 'diseño preliminar',
      progress: 35,
      nextDelivery: '15-Mayo-2025',
      notes: 'Pendiente aprobación de planos'
    };
    
    return promptCore.getProjectStatusPrompt(DOMAIN.ARQUITECTURA, projectData);
  }

  /**
   * Maneja consultas sobre beneficios del sistema
   */
  private handleBenefits(): string {
    return promptCore.getBenefitsPrompt(DOMAIN.ARQUITECTURA);
  }
}
