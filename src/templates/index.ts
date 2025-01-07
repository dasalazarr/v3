import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { registerFlow } from "./registerFlow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";

export default createFlow([
    mainFlow,
    registerFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow
]);