import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DOMAIN } from './domain';
import templateEngine from './templateEngine';

interface PromptCache {
  [key: string]: string;
}

/**
 * Clase que gestiona los prompts del sistema para diferentes dominios
 */
// Obtenemos la ruta del directorio actual para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PromptCore {
  private prompts: PromptCache = {};
  private basePath: string;

  constructor(basePath: string = path.join(__dirname, '../../assets/prompts')) {
    this.basePath = basePath;
    this.loadPrompts();
  }

  /**
   * Carga los prompts de todos los dominios disponibles
   */
  private loadPrompts(): void {
    const domains = Object.values(DOMAIN);
    
    for (const domain of domains) {
      const promptPath = path.join(this.basePath, domain, 'prompt_DeepSeek.txt');
      
      if (fs.existsSync(promptPath)) {
        const promptContent = fs.readFileSync(promptPath, 'utf-8');
        this.prompts[domain] = promptContent;
        console.log(`Loaded prompt for domain: ${domain}`);
      }
    }
  }

  /**
   * Obtiene el prompt base para un dominio específico
   */
  public getBasePrompt(domain: DOMAIN = DOMAIN.DEFAULT): string {
    // Si no existe el prompt para el dominio específico, usar el default
    if (!this.prompts[domain]) {
      console.warn(`No prompt found for domain: ${domain}, using default`);
      domain = DOMAIN.DEFAULT;
    }
    
    return this.prompts[domain] || '';
  }

  /**
   * Genera un saludo personalizado para el dominio
   */
  public getWelcomePrompt(domain: DOMAIN = DOMAIN.DEFAULT, context: any = {}): string {
    try {
      return templateEngine.render(`${domain}.welcome`, context);
    } catch (error) {
      console.error(`Error rendering welcome prompt for ${domain}:`, error);
      return 'Hola, ¿en qué puedo ayudarte hoy?';
    }
  }

  /**
   * Genera una respuesta para agendar visita
   */
  public getScheduleVisitPrompt(domain: DOMAIN = DOMAIN.DEFAULT, context: any = {}): string {
    try {
      return templateEngine.render(`${domain}.scheduleVisit`, context);
    } catch (error) {
      console.error(`Error rendering scheduleVisit prompt for ${domain}:`, error);
      return '¿Qué días y horarios te funcionan para una visita?';
    }
  }

  /**
   * Genera una respuesta con el estado del proyecto
   */
  public getProjectStatusPrompt(domain: DOMAIN = DOMAIN.DEFAULT, context: any = {}): string {
    try {
      return templateEngine.render(`${domain}.projectStatus`, context);
    } catch (error) {
      console.error(`Error rendering projectStatus prompt for ${domain}:`, error);
      return `Proyecto ${context.projectId || 'N/A'} está en progreso.`;
    }
  }

  /**
   * Genera una respuesta con los beneficios del sistema
   */
  public getBenefitsPrompt(domain: DOMAIN = DOMAIN.DEFAULT, context: any = {}): string {
    try {
      return templateEngine.render(`${domain}.benefits`, context);
    } catch (error) {
      console.error(`Error rendering benefits prompt for ${domain}:`, error);
      return 'Nuestro sistema ofrece múltiples beneficios adaptados a tus necesidades.';
    }
  }
}

// Singleton instance
const promptCore = new PromptCore();
export default promptCore;
