import { addKeyword, EVENTS } from "@builderbot/bot"
import { faqFlow } from "./faqFlow"
import sheetsServices from "../services/sheetsServices"
import { registerFlow } from "./registerFlow";
import { reservarCitaFlow } from './reservarCitaFlow';

const mainFlow = addKeyword(EVENTS.WELCOME)
    .addAnswer('¡Bienvenido! 👋 ¿En qué puedo ayudarte?\n\n' +
              '1️⃣ Escribe "reservar" o "agendar" para programar una cita\n' +
              '2️⃣ Escribe "info" para obtener información sobre nuestros productos')
    .addAction(async (ctx, ctxFn) => {
        const isUser = await sheetsServices.userExists(ctx.from);
        if (!isUser) {
            return ctxFn.gotoFlow(registerFlow);
        }
    });

export { mainFlow, reservarCitaFlow };