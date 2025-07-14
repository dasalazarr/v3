export declare class I18nService {
    private translations;
    private supportedLanguages;
    private defaultLanguage;
    constructor();
    private loadTranslations;
    t(key: string, lang?: string): string;
    getSupportedLanguages(): string[];
    isSupported(lang: string): boolean;
}
export declare const i18nService: I18nService;
//# sourceMappingURL=i18n-service.d.ts.map