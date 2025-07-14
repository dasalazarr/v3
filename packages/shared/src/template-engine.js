import { i18nService } from './i18n-service.js';
export class TemplateEngine {
    process(template, variables = {}, lang = 'es') {
        let result = this.replaceVariables(template, variables);
        result = this.translateTexts(result, lang);
        return result;
    }
    replaceVariables(template, variables) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const trimmedKey = key.trim();
            return variables[trimmedKey] !== undefined ? String(variables[trimmedKey]) : match;
        });
    }
    translateTexts(template, lang) {
        return template.replace(/t\(['"]([^)]+)['"]\)/g, (match, key) => {
            return i18nService.t(key, lang);
        });
    }
}
export const templateEngine = new TemplateEngine();
//# sourceMappingURL=template-engine.js.map