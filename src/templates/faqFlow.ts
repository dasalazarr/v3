import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "~/services/aiservices";
import { config } from "../config";
import sheetsServices from "~/services/sheetsServices";

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { endFlow }) => {
    try {
      const AI = new aiServices(config.apiKey);
      const threadId = await sheetsServices.getUserThread(ctx.from);
      const { response, threadId: newThreadId } = await AI.chatWithAssistant(ctx.body, threadId);

      // Guardar thread si es nuevo
      if (!threadId && newThreadId) {
        await sheetsServices.saveUserThread(ctx.from, newThreadId);
      }

      // Guardar conversación
      await sheetsServices.addConverToUser(ctx.from, [
        { role: "user", content: ctx.body },
        { role: "assistant", content: response }
      ]);

      return endFlow(response);
    } catch (error) {
      console.error("Error en faqFlow:", error);
      return endFlow("Lo siento, hubo un error. Por favor, intenta de nuevo.");
    }
  });
