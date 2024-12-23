import { addKeyword } from "@builderbot/bot";
import sheetsServices from "../services/sheetsServices";

export const reservarCitaFlow = addKeyword(['reservar', 'agendar', 'cita', 'Reservar cita', 'agendar cita'])
    .addAnswer('¿Para qué fecha te gustaría agendar tu cita? (Por favor, usa el formato DD/MM/YYYY)')
    .addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
        const fecha = ctx.body;
        await state.update({ fecha });
        return flowDynamic('¿A qué hora te gustaría la cita? (Formato: HH:MM, ejemplo 14:30)');
    })
    .addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
        const hora = ctx.body;
        const fecha = state.get('fecha');
        const paciente = ctx.from;

        try {
            const resultado = await sheetsServices.reservarCita(fecha, hora, paciente);
            return flowDynamic([
                `¡Perfecto! Tu cita ha sido agendada para el ${fecha} a las ${hora}.`,
                'Si necesitas modificar o cancelar tu cita, no dudes en avisarnos.'
            ]);
        } catch (error) {
            return flowDynamic([
                'Lo siento, hubo un problema al agendar tu cita.',
                'Por favor, intenta con otra fecha u hora, o contacta con nuestro servicio al cliente.'
            ]);
        }
    });
