import { createFlow, addKeyword } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";
import { ArquitecturaFlow } from "./arquitecturaFlow";
import { INTENT } from "../core/ConversacionController";

// Instanciamos el flujo de arquitectura
const arquitecturaFlow = new ArquitecturaFlow();

// Definimos el flujo de arquitectura con la sintaxis de BuilderBot
const arquitecturaKeywordFlow = addKeyword(["arquitectura", "arquia", "plano", "proyecto", "visita"])
    .addAction(async (ctx, { flowDynamic }) => {
        const message = ctx.body;
        // Usando INTENT.OTHER que es el tipo correcto para la función
        const response = await arquitecturaFlow.handleMessage(INTENT.OTHER, message);
        return flowDynamic(response);
    });

const flows = createFlow([
    mainFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow,
    arquitecturaKeywordFlow
]);

export default flows;