import  { addKeyword, EVENTS } from "@builderbot/bot"
import { faqFlow } from "./faqFlow"
import container from "../di/container";
import { SheetsService } from "../services/sheetsServices"
import { registerFlow } from "./registerFlow";

// Obtenemos la instancia del servicio del contenedor
const sheetsService = container.resolve<SheetsService>("SheetsService");

const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, ctxFn) => {
    const isUser = await sheetsService.userExists(ctx.from);
    if (!isUser) {
        return ctxFn.gotoFlow(registerFlow);
    }else{
        ctxFn.gotoFlow(faqFlow)
    } 

  });

export { mainFlow };