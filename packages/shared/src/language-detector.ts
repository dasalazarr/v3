import { franc } from 'franc-min';
import ISO6391 from 'iso-639-1';

export interface LanguageDetector {
  detect(text: string): string;
  isSupported(langCode: string): boolean;
  getSupportedLanguages(): string[];
}

export class FrancLanguageDetector implements LanguageDetector {
  private readonly supportedLanguages = ['es', 'en'];
  private readonly defaultLanguage = 'es';
  private readonly minTextLength = 3;

  detect(text: string): string {
    // Si el texto es muy corto, usar idioma por defecto
    if (!text || text.trim().length < this.minTextLength) {
      return this.defaultLanguage;
    }

    // Detectar idioma con franc
    const detected = franc(text.trim());
    
    // Convertir código ISO 639-3 a ISO 639-1
    const langCode = this.convertToISO6391(detected);
    
    // Si el idioma detectado está soportado, usarlo; sino, usar por defecto
    return this.isSupported(langCode) ? langCode : this.defaultLanguage;
  }

  isSupported(langCode: string): boolean {
    return this.supportedLanguages.includes(langCode);
  }

  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  private convertToISO6391(iso639_3: string): string {
    // Mapeo manual para los idiomas más comunes que franc devuelve
    const mapping: Record<string, string> = {
      'spa': 'es', // Spanish
      'eng': 'en', // English
      'und': 'es', // Undetermined -> default to Spanish
    };

    return mapping[iso639_3] || 'es';
  }

  /**
   * Obtiene información adicional sobre el idioma detectado
   */
  getLanguageInfo(langCode: string): { code: string; name: string; supported: boolean } {
    return {
      code: langCode,
      name: ISO6391.getName(langCode) || 'Unknown',
      supported: this.isSupported(langCode)
    };
  }
}

// Singleton instance
export const languageDetector = new FrancLanguageDetector();
