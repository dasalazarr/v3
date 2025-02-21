import { addKeyword, EVENTS } from "@builderbot/bot";
import { container } from "tsyringe";
import { MessageClassifier, MessageIntent } from "../services/messageClassifier";
import { productFlow } from "./flows/productFlow";
import { appointmentFlow, appointmentStatusFlow } from "./flows/appointmentFlow";
import { faqFlow } from "./flows/faqFlow";
import { SheetManager } from "../services/sheetsServices"; // Cambio: Agregado llaves para importar SheetManager
import { errorHandler } from "../config";

// Get singleton instances with proper types
const classifier = container.resolve<MessageClassifier>('MessageClassifier');
const sheetManager = container.resolve<SheetManager>('SheetManager');

// Definir tipo para el contexto
interface BotContext {
  body: string;
  from: string;
  sendText: (text: string) => Promise<void>;
  [key: string]: any;
}

export const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx: BotContext, { gotoFlow }) => {
    const { from: phoneNumber } = ctx;
    
    // Initialize user if not exists
    if (!(await sheetManager.userExists(phoneNumber))) {
      await sheetManager.addConverToUser(phoneNumber, [
        { role: 'system', content: 'New user initialized' }
      ]);
    }

    const classified = await classifier.classifyMessage(ctx);

    // Route to appropriate flow based on intent
    switch (classified.intent) {
      case MessageIntent.PRODUCT_INQUIRY:
        return gotoFlow(productFlow);
      case MessageIntent.APPOINTMENT_SCHEDULING:
        return gotoFlow(appointmentFlow);
      case MessageIntent.APPOINTMENT_STATUS:
        return gotoFlow(appointmentStatusFlow);
      case MessageIntent.FAQ:
        return gotoFlow(faqFlow);
      default:
        const defaultResponse = 'Lo siento, no pude entender tu mensaje. ¿Podrías reformularlo?';
        await sheetManager.addConverToUser(phoneNumber, [
          { role: 'user', content: ctx.body },
          { role: 'assistant', content: defaultResponse }
        ]);
        await ctx.sendText(defaultResponse);
        return;
    }
  })
  // @ts-ignore - El tipo Flow no expone addMiddleware pero sabemos que existe
  .addMiddleware(errorHandler);