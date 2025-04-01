import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";

const flows = createFlow([
    mainFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow
]);

export default flows;