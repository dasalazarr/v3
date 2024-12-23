import { createFlow } from "@builderbot/bot";
import flowPrincipal, { reservarCitaFlow, infoFlow } from "./mainflow";
import { faqFlow } from "./faqFlow";
import { registerFlow } from "./registerFlow";

export default createFlow([
    flowPrincipal,
    reservarCitaFlow,
    infoFlow,
    faqFlow,
    registerFlow
]);