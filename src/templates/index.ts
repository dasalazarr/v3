import { createFlow, addKeyword, EVENTS } from "@builderbot/bot";
import { mainFlow } from "./mainflow";
import { faqFlow } from "./faqFlow";
import { appointmentFlow, cancelAppointmentFlow } from "./appointmentFlow";
import { contractFlow } from "./contractFlow";
import { proactiveFlow, AppointmentReminder } from "./proactiveFlow";

// Inicializar el sistema de recordatorios
const appointmentReminder = AppointmentReminder.getInstance();

// Crear un flow para inicializar el sistema
const initFlow = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, { state }) => {
        // Configurar el bot en el sistema de recordatorios
        appointmentReminder.setBot(state.get('bot'));
        console.log('Sistema de recordatorios inicializado');
    });

const flows = createFlow([
    initFlow,
    mainFlow,
    faqFlow,
    appointmentFlow,
    cancelAppointmentFlow,
    contractFlow,
    proactiveFlow,
]);

export {
    mainFlow,
    faqFlow,
    proactiveFlow,
};

export default flows;