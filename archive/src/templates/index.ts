import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";
import { trainingFlow } from "./trainingFlow";

const flows = createFlow([
    mainFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow,
    trainingFlow
]);

export default flows;