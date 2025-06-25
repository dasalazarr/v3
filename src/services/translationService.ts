import { singleton } from 'tsyringe';
import { franc } from 'franc';
import fs from 'fs';
import path from 'path';

@singleton()
export class TranslationService {
    private translations: { [key: string]: any } = {};

    constructor() {
        this.loadTranslations('en');
        this.loadTranslations('es');
    }

    private loadTranslations(lang: string) {
        const filePath = path.join(__dirname, `../i18n/${lang}.json`);
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            this.translations[lang] = JSON.parse(data);
        } catch (error) {
            console.error(`Error loading translation file for ${lang}:`, error);
            this.translations[lang] = {};
        }
    }

    public detectLanguage(text: string): 'en' | 'es' {
        const langCode = franc(text);
        // franc returns ISO 639-3 codes, we need to map to our simple codes
        if (langCode === 'spa') {
            return 'es';
        }
        // Default to English for all other languages
        return 'en';
    }

    public t(lang: 'en' | 'es', key: string, replacements?: { [key: string]: string | number }): string {
        let translation = this.translations[lang]?.[key] || this.translations['en']?.[key] || key;

        if (replacements) {
            for (const placeholder in replacements) {
                translation = translation.replace(`{{${placeholder}}}`, String(replacements[placeholder]));
            }
        }

        return translation;
    }
}
