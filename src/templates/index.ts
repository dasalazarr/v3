import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { registerFlow } from "./registerFlow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";
import { contractFlow } from "./contractFlow";

const flows = createFlow([
    mainFlow,
    registerFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow,
    contractFlow
]);

export default flows;