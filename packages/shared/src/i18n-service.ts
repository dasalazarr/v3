import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio de internacionalización para manejar textos en diferentes idiomas
 */
export class I18nService {
  private translations: Record<string, Record<string, Record<string, string>>> = {};
  private supportedLanguages: string[] = ['en', 'es'];
  private defaultLanguage = 'es';

  constructor() {
    this.loadTranslations();
  }

  /**
   * Carga todos los archivos de traducción disponibles
   */
  private loadTranslations(): void {
    for (const lang of this.supportedLanguages) {
      this.translations[lang] = {};
      
      const localesPath = path.join(__dirname, 'locales', lang);
      
      try {
        if (fs.existsSync(localesPath)) {
          const files = fs.readdirSync(localesPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const namespace = file.replace('.json', '');
              const filePath = path.join(localesPath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              
              try {
                this.translations[lang][namespace] = JSON.parse(content);
              } catch (error) {
                console.error(`Error parsing ${filePath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
      }
    }
  }

  /**
   * Obtiene un texto traducido según el idioma y la clave
   * @param key Clave del texto a traducir (formato: namespace:key)
   * @param lang Código de idioma (en, es)
   * @returns Texto traducido o la clave si no se encuentra
   */
  t(key: string, lang: string = this.defaultLanguage): string {
    // Si el idioma no está soportado, usar el idioma por defecto
    if (!this.supportedLanguages.includes(lang)) {
      lang = this.defaultLanguage;
    }

    // Separar namespace y clave
    let namespace = 'common';
    let textKey = key;
    
    if (key.includes(':')) {
      const parts = key.split(':');
      namespace = parts[0];
      textKey = parts[1];
    }

    // Buscar la traducción
    try {
      const translation = this.translations[lang]?.[namespace]?.[textKey];
      if (translation) {
        return translation;
      }
      
      // Si no se encuentra en el idioma solicitado, intentar con el idioma por defecto
      if (lang !== this.defaultLanguage) {
        const defaultTranslation = this.translations[this.defaultLanguage]?.[namespace]?.[textKey];
        if (defaultTranslation) {
          return defaultTranslation;
        }
      }
    } catch (error) {
      console.error(`Error getting translation for ${key} in ${lang}:`, error);
    }

    // Si no se encuentra la traducción, devolver la clave
    return textKey;
  }

  /**
   * Obtiene los idiomas soportados
   * @returns Lista de códigos de idioma soportados
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * Verifica si un idioma está soportado
   * @param lang Código de idioma a verificar
   * @returns true si el idioma está soportado, false en caso contrario
   */
  isSupported(lang: string): boolean {
    return this.supportedLanguages.includes(lang);
  }
}

// Crear una instancia del servicio
export const i18nService = new I18nService();
