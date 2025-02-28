import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { registerFlow } from "./registerFlow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";
import { budgetFlow, checkBudgetFlow, deleteBudgetFlow, alertsFlow } from "./budgetFlow";

const flows = createFlow([
    mainFlow,
    registerFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow,
    budgetFlow,
    checkBudgetFlow,
    deleteBudgetFlow,
    alertsFlow
]);

export default flows;