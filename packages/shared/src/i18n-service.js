import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class I18nService {
    translations = {};
    supportedLanguages = ['en', 'es'];
    defaultLanguage = 'es';
    constructor() {
        this.loadTranslations();
    }
    loadTranslations() {
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
                            }
                            catch (error) {
                                console.error(`Error parsing ${filePath}:`, error);
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error loading translations for ${lang}:`, error);
            }
        }
    }
    t(key, lang = this.defaultLanguage) {
        if (!this.supportedLanguages.includes(lang)) {
            lang = this.defaultLanguage;
        }
        let namespace = 'common';
        let textKey = key;
        if (key.includes(':')) {
            const parts = key.split(':');
            namespace = parts[0];
            textKey = parts[1];
        }
        try {
            const translation = this.translations[lang]?.[namespace]?.[textKey];
            if (translation) {
                return translation;
            }
            if (lang !== this.defaultLanguage) {
                const defaultTranslation = this.translations[this.defaultLanguage]?.[namespace]?.[textKey];
                if (defaultTranslation) {
                    return defaultTranslation;
                }
            }
        }
        catch (error) {
            console.error(`Error getting translation for ${key} in ${lang}:`, error);
        }
        return textKey;
    }
    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }
    isSupported(lang) {
        return this.supportedLanguages.includes(lang);
    }
}
export const i18nService = new I18nService();
//# sourceMappingURL=i18n-service.js.map