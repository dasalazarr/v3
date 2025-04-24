import { addKeyword, EVENTS } from "@builderbot/bot";
import container from "../di/container";
import { config } from "../config";
import { SheetsService } from "../services/sheetsServices";
import { AIService } from "../services/aiservices";
import { TemplateEngine } from '../core/templateEngine';

// Obtenemos las instancias de los servicios del contenedor
const sheetsService = container.resolve<SheetsService>("SheetsService");
const aiServices = container.resolve<AIService>("AIService");
const templateEngine = container.resolve<TemplateEngine>(TemplateEngine);

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { endFlow }) => {
    try {
      console.log("📱 Mensaje recibido de:", ctx.from);
      console.log("🔑 API Key:", config.apiKey ? "Configurada" : "No configurada");
      
      if (!ctx.body) {
        console.log("❌ Mensaje vacío");
        const errorMessage = templateEngine.render('error', { error: 'Mensaje vacío' });
        return endFlow(errorMessage);
      }

      // Use aiServices directly without 'new' since it's already instantiated
      console.log("💬 Enviando mensaje al asistente");
      const response = await aiServices.processMessage(ctx.body, ctx.from);

      if (!response) {
        console.error("❌ No se recibió respuesta del asistente");
        const errorMessage = templateEngine.render('error', { error: 'No se recibió respuesta del asistente' });
        return endFlow(errorMessage);
      }

      // Ya no es necesario guardar la conversación aquí, ya que se hace dentro de processMessage
      console.log("✅ Respuesta enviada");
      return endFlow(response);
    } catch (error) {
      console.error("❌ Error en el flujo FAQ:", error);
      const errorMessage = templateEngine.render('error', { error: error instanceof Error ? error.message : 'Error desconocido' });
      return endFlow(errorMessage);
    }
  });
