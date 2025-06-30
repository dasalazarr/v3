import { i18nService } from './i18n-service.js';

/**
 * Motor de plantillas para procesar textos con variables y soporte para i18n
 */
export class TemplateEngine {
  /**
   * Procesa una plantilla reemplazando variables y traduciendo textos
   * @param template Plantilla a procesar
   * @param variables Variables a reemplazar en la plantilla
   * @param lang Idioma para traducir los textos (en, es)
   * @returns Texto procesado
   */
  process(template: string, variables: Record<string, any> = {}, lang: string = 'es'): string {
    // Paso 1: Reemplazar variables
    let result = this.replaceVariables(template, variables);
    
    // Paso 2: Traducir textos con formato t(key)
    result = this.translateTexts(result, lang);
    
    return result;
  }

  /**
   * Reemplaza las variables en una plantilla
   * @param template Plantilla a procesar
   * @param variables Variables a reemplazar
   * @returns Texto con variables reemplazadas
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return variables[trimmedKey] !== undefined ? String(variables[trimmedKey]) : match;
    });
  }

  /**
   * Traduce los textos con formato t(key) en una plantilla
   * @param template Plantilla a procesar
   * @param lang Idioma para traducir los textos
   * @returns Texto con traducciones
   */
  private translateTexts(template: string, lang: string): string {
    return template.replace(/t\(['"]([^)]+)['"]\)/g, (match, key) => {
      return i18nService.t(key, lang);
    });
  }
}

// Crear una instancia del motor de plantillas
export const templateEngine = new TemplateEngine();
