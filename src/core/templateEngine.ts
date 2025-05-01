import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

interface TemplateCache {
  [key: string]: Handlebars.TemplateDelegate;
}

class TemplateEngine {
  private templates: TemplateCache = {};
  private basePath: string;

  constructor(basePath: string = path.join(__dirname, '../../assets/prompts')) {
    this.basePath = basePath;
    this.loadTemplates();
  }

  private loadTemplates(): void {
    // Cargar plantillas para todos los dominios
    const domains = ['arquitectura']; // Añadir otros dominios aquí cuando se implementen
    
    for (const domain of domains) {
      const domainPath = path.join(this.basePath, domain);
      
      if (fs.existsSync(domainPath)) {
        const files = fs.readdirSync(domainPath)
          .filter(file => file.endsWith('.hbs'));
        
        for (const file of files) {
          const templateName = `${domain}.${path.basename(file, '.hbs')}`;
          const templatePath = path.join(domainPath, file);
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          
          this.templates[templateName] = Handlebars.compile(templateContent);
          console.log(`Loaded template: ${templateName}`);
        }
      }
    }
  }

  public render(templateName: string, context: any = {}): string {
    if (!this.templates[templateName]) {
      console.error(`Template not found: ${templateName}`);
      return `[Template not found: ${templateName}]`;
    }
    
    try {
      return this.templates[templateName](context);
    } catch (error) {
      console.error(`Error rendering template ${templateName}:`, error);
      return `[Error rendering template: ${templateName}]`;
    }
  }
}

// Singleton instance
const templateEngine = new TemplateEngine();
export default templateEngine;
