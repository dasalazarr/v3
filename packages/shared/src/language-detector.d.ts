export interface LanguageDetector {
    detect(text: string): string;
    isSupported(langCode: string): boolean;
    getSupportedLanguages(): string[];
}
export declare class FrancLanguageDetector implements LanguageDetector {
    private readonly supportedLanguages;
    private readonly defaultLanguage;
    private readonly minTextLength;
    detect(text: string): string;
    isSupported(langCode: string): boolean;
    getSupportedLanguages(): string[];
    private convertToISO6391;
    getLanguageInfo(langCode: string): {
        code: string;
        name: string;
        supported: boolean;
    };
}
export declare const languageDetector: FrancLanguageDetector;
//# sourceMappingURL=language-detector.d.ts.map