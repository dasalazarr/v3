import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "~/services/aiservices";
import { config } from "../config";
import sheetsServices from "~/services/sheetsServices";

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { endFlow }) => {
    try {
      console.log("📱 Mensaje recibido de:", ctx.from);
      console.log("🔑 API Key:", config.apiKey ? "Configurada" : "No configurada");
      console.log("🤖 Assistant ID:", config.assistant_id || "No configurado");
      
      if (!ctx.body) {
        console.log("❌ Mensaje vacío");
        return endFlow("Por favor, envía un mensaje con contenido.");
      }

      if (!config.assistant_id) {
        console.error("❌ Assistant ID no configurado");
        return endFlow("Error de configuración del servicio.");
      }

      const AI = new aiServices();
      console.log("🔍 Buscando thread para:", ctx.from);
      const threadId = await sheetsServices.getUserThread(ctx.from);
      console.log("Thread encontrado:", threadId || "Nuevo usuario");

      console.log("💬 Enviando mensaje al asistente");
      const { response, threadId: newThreadId } = await AI.chatWithAssistant(ctx.body, threadId);

      if (!response) {
        console.error("❌ No se recibió respuesta del asistente");
        return endFlow("No pude procesar tu mensaje. Por favor, intenta de nuevo.");
      }

      // Guardar thread si es nuevo
      if (!threadId && newThreadId) {
        console.log("💾 Guardando nuevo thread:", newThreadId);
        await sheetsServices.saveUserThread(ctx.from, newThreadId);
      }

      // Guardar conversación
      console.log("📝 Guardando conversación en sheets");
      await sheetsServices.addConverToUser(ctx.from, [
        { role: "user", content: ctx.body },
        { role: "assistant", content: response }
      ]);

      console.log("✅ Respuesta enviada");
      return endFlow(response);
    } catch (error) {
      console.error("❌ Error en faqFlow:", error);
      if (error instanceof Error) {
        console.error("Detalles del error:", error.message);
      }
      return endFlow("Lo siento, ocurrió un error inesperado. Por favor, intenta de nuevo en unos momentos.");
    }
  });
