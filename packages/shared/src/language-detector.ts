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
      console.log(`🌐 [LANG_DETECT] Text too short (${text?.length || 0} chars), using default: ${this.defaultLanguage}`);
      return this.defaultLanguage;
    }

    const cleanText = text.trim().toLowerCase();

    // Enhanced keyword-based detection for common patterns
    const englishKeywords = ['i', 'ran', 'run', 'today', 'yesterday', 'km', 'miles', 'minutes', 'hours', 'the', 'and', 'in', 'my', 'was', 'is', 'are', 'have', 'had', 'will', 'would', 'could', 'should'];
    const spanishKeywords = ['corrí', 'correr', 'hoy', 'ayer', 'minutos', 'horas', 'el', 'la', 'los', 'las', 'y', 'en', 'mi', 'fue', 'es', 'son', 'tengo', 'tuve', 'voy', 'podría', 'debería'];

    const englishMatches = englishKeywords.filter(keyword => cleanText.includes(keyword)).length;
    const spanishMatches = spanishKeywords.filter(keyword => cleanText.includes(keyword)).length;

    console.log(`🌐 [LANG_DETECT] Text: "${text.substring(0, 50)}..."`);
    console.log(`🌐 [LANG_DETECT] English matches: ${englishMatches}, Spanish matches: ${spanishMatches}`);

    // If keyword-based detection is conclusive, use it
    if (englishMatches > spanishMatches && englishMatches >= 1) {
      console.log(`🌐 [LANG_DETECT] Keyword-based detection: English (${englishMatches} matches)`);
      return 'en';
    }
    if (spanishMatches > englishMatches && spanishMatches >= 1) {
      console.log(`🌐 [LANG_DETECT] Keyword-based detection: Spanish (${spanishMatches} matches)`);
      return 'es';
    }

    // Fallback to franc for longer texts
    const detected = franc(cleanText);
    const langCode = this.convertToISO6391(detected);

    console.log(`🌐 [LANG_DETECT] Franc detected: ${detected} -> ${langCode}`);

    // Si el idioma detectado está soportado, usarlo; sino, usar por defecto
    const finalLang = this.isSupported(langCode) ? langCode : this.defaultLanguage;
    console.log(`🌐 [LANG_DETECT] Final language: ${finalLang}`);

    return finalLang;
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
