import  { addKeyword, EVENTS } from "@builderbot/bot"
import { faqFlow } from "./faqFlow"
import container from "../di/container";
import { SheetsService } from "../services/sheetsServices"
import { TemplateEngine } from '../core/templateEngine';
import { AIService } from '../services/aiservices';

// Obtenemos las instancias de los servicios del contenedor
const sheetsService = container.resolve<SheetsService>("SheetsService");
const templateEngine = container.resolve<TemplateEngine>(TemplateEngine);
const aiService = container.resolve<AIService>("AIService");

const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, ctxFn) => {
    try {
      // Detectar el dominio actual o usar el predeterminado
      const currentDomain = aiService.getDomain();
      
      // Generar mensaje de bienvenida usando la plantilla
      const welcomeMessage = templateEngine.render('welcome', {
        user: {
          name: ctx.pushName || '',
          phone: ctx.from
        },
        domain: currentDomain
      });
      
      // Enviar mensaje de bienvenida
      await ctxFn.flowDynamic([{ body: welcomeMessage }]);
      
      // Continuar con el flujo FAQ
      ctxFn.gotoFlow(faqFlow);
    } catch (error) {
      console.error('Error en mainFlow:', error);
      const errorMessage = templateEngine.render('error', { 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
      await ctxFn.flowDynamic([{ body: errorMessage }]);
      ctxFn.gotoFlow(faqFlow);
    }
  });

export { mainFlow };