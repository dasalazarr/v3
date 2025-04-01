import  { addKeyword, EVENTS } from "@builderbot/bot"
import { faqFlow } from "./faqFlow"
import container from "../di/container";
import { SheetsService } from "../services/sheetsServices"

// Obtenemos la instancia del servicio del contenedor
const sheetsService = container.resolve<SheetsService>("SheetsService");

const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, ctxFn) => {
    // Ya no verificamos si el usuario existe, todos van al faqFlow
    // const isUser = await sheetsService.userExists(ctx.from);
    // if (!isUser) {
    //     return ctxFn.gotoFlow(registerFlow); // Eliminado
    // } else {
    //     ctxFn.gotoFlow(faqFlow)
    // }
    ctxFn.gotoFlow(faqFlow);
  });

export { mainFlow };