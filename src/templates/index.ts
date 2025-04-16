import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";
import { dentalFlow } from "./dentalFlow";

const flows = createFlow([
    mainFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow,
    dentalFlow
]);

export default flows;