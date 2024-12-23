import  { addKeyword, EVENTS } from "@builderbot/bot"
import { faqFlow } from "./faqFlow"
import sheetsServices from "../services/sheetsServices"
import { registerFlow } from "./registerFlow";
import { reservarCitaFlow } from './reservarCitaFlow';

const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAnswer('¡Bienvenido! ¿En qué puedo ayudarte?')
  .addAction(async (ctx, ctxFn) => {
    const isUser = await sheetsServices.userExists(ctx.from);
    if (!isUser) {
        return ctxFn.gotoFlow(registerFlow);
    }else{
        ctxFn.gotoFlow(faqFlow)
    } 
  })

const reservarCitaKeyword = addKeyword('Reservar cita')
  .addAction((ctx, { gotoFlow }) => {
    return gotoFlow(reservarCitaFlow)
  })

export { mainFlow, reservarCitaKeyword };