/**
 * templateEngine.ts
 * 
 * Motor de plantillas basado en Handlebars para renderizar mensajes
 * dinámicos con variables como {domain}, {user}, {nextStep}, etc.
 */

import Handlebars from 'handlebars';
import { TemplateDelegate as HandlebarsTemplateDelegate } from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el equivalente a __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { singleton } from 'tsyringe';
import { Domain } from './promptCore';

// Directorio base de plantillas
// Subimos dos niveles desde /dist/core/ hasta la raíz del proyecto
const TEMPLATES_DIR = path.resolve(process.cwd(), 'src', 'templates', 'flows');

// Interfaz para variables de plantilla
export interface TemplateVars {
  // Variables de sistema
  domain?: Domain;
  user?: {
    name?: string;
    phone?: string;
    [key: string]: any;
  };
  nextStep?: string;
  date?: string | Date;
  time?: string;
  
  // Variables específicas de dominio
  [key: string]: any;
}

@singleton()
export class TemplateEngine {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private helpers: Map<string, Handlebars.HelperDelegate> = new Map();
  
  constructor() {
    this.registerDefaultHelpers();
    console.log("✅ TemplateEngine inicializado");
  }
  
  /**
   * Registra helpers personalizados para Handlebars
   */
  private registerDefaultHelpers(): void {
    // Helper para formatear fechas
    this.registerHelper('formatDate', (date: Date | string, format: string = 'DD/MM/YYYY') => {
      if (!date) return '';
      
      const d = typeof date === 'string' ? new Date(date) : date;
      
      // Opciones básicas de formato
      if (format === 'DD/MM/YYYY') {
        return d.toLocaleDateString('es-ES');
      } else if (format === 'HH:mm') {
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      } else if (format === 'full') {
        return d.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else if (format === 'time') {
        return d.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      
      return d.toLocaleDateString('es-ES');
    });
    
    // Helper para condicionales
    this.registerHelper('when', function(this: any, operand_1: any, operator: string, operand_2: any, options: Handlebars.HelperOptions) {
      const operators: {[key: string]: Function} = {
        'eq': (l: any, r: any) => l === r,
        'noteq': (l: any, r: any) => l !== r,
        'gt': (l: any, r: any) => Number(l) > Number(r),
        'lt': (l: any, r: any) => Number(l) < Number(r),
        'gteq': (l: any, r: any) => Number(l) >= Number(r),
        'lteq': (l: any, r: any) => Number(l) <= Number(r),
        'contains': (l: string, r: string) => l.includes(r)
      };
      
      const result = operators[operator](operand_1, operand_2);
      return result ? options.fn(this) : options.inverse(this);
    });
  }
  
  /**
   * Registra un helper personalizado para Handlebars
   */
  public registerHelper(name: string, fn: Handlebars.HelperDelegate): void {
    this.helpers.set(name, fn);
    Handlebars.registerHelper(name, fn);
  }
  
  /**
   * Carga una plantilla desde el sistema de archivos
   */
  private loadTemplate(name: string): HandlebarsTemplateDelegate {
    if (this.templates.has(name)) {
      return this.templates.get(name)!;
    }
    
    const templatePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
    
    try {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const compiledTemplate = Handlebars.compile(templateContent);
      this.templates.set(name, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      console.error(`Error al cargar la plantilla ${name}:`, error);
      throw new Error(`No se pudo cargar la plantilla: ${name}`);
    }
  }
  
  /**
   * Renderiza una plantilla con las variables proporcionadas
   * 
   * @param name Nombre de la plantilla (sin extensión)
   * @param vars Variables para renderizar la plantilla
   * @returns Texto renderizado
   */
  public render(name: string, vars: TemplateVars = {}): string {
    try {
      const template = this.loadTemplate(name);
      return template(vars);
    } catch (error) {
      console.error(`Error al renderizar la plantilla ${name}:`, error);
      
      // Fallback para casos de error
      if (name === 'error') {
        return "Lo siento, ha ocurrido un error en el sistema. Por favor, intenta más tarde.";
      }
      
      // Intentar renderizar la plantilla de error
      try {
        return this.render('error', { error: error.message });
      } catch {
        return "Lo siento, ha ocurrido un error en el sistema. Por favor, intenta más tarde.";
      }
    }
  }
  
  /**
   * Renderiza una plantilla directamente desde un string
   * 
   * @param template String de plantilla en formato Handlebars
   * @param vars Variables para renderizar la plantilla
   * @returns Texto renderizado
   */
  public renderString(template: string, vars: TemplateVars = {}): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(vars);
    } catch (error) {
      console.error("Error al renderizar plantilla desde string:", error);
      return template; // Devolver el template original en caso de error
    }
  }
}

// Exportar una función auxiliar para facilitar el uso
export function renderTpl(name: string, vars: TemplateVars = {}): string {
  const engine = new TemplateEngine();
  return engine.render(name, vars);
}

export default TemplateEngine;
