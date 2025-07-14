import { franc } from 'franc-min';
import ISO6391 from 'iso-639-1';
export class FrancLanguageDetector {
    supportedLanguages = ['es', 'en'];
    defaultLanguage = 'es';
    minTextLength = 3;
    detect(text) {
        if (!text || text.trim().length < this.minTextLength) {
            return this.defaultLanguage;
        }
        const detected = franc(text.trim());
        const langCode = this.convertToISO6391(detected);
        return this.isSupported(langCode) ? langCode : this.defaultLanguage;
    }
    isSupported(langCode) {
        return this.supportedLanguages.includes(langCode);
    }
    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }
    convertToISO6391(iso639_3) {
        const mapping = {
            'spa': 'es',
            'eng': 'en',
            'und': 'es',
        };
        return mapping[iso639_3] || 'es';
    }
    getLanguageInfo(langCode) {
        return {
            code: langCode,
            name: ISO6391.getName(langCode) || 'Unknown',
            supported: this.isSupported(langCode)
        };
    }
}
export const languageDetector = new FrancLanguageDetector();
//# sourceMappingURL=language-detector.js.map