import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";
import { contractFlow } from "./contractFlow";

const flows = createFlow([
    mainFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow,
    contractFlow,
]);

export {
    mainFlow,
    faqFlow,
};

export default flows;