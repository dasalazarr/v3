import { addKeyword } from "@builderbot/bot";
import sheetsServices from "../services/sheetsServices";

export const reservarCitaFlow = addKeyword(['reservar', 'agendar', 'cita', 'Reservar cita', 'agendar cita'])
    .addAnswer('¿Para qué fecha te gustaría agendar tu cita? (Por favor, usa el formato DD/MM/YYYY)')
    .addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
        const fecha = ctx.body;
        await state.update({ fecha });
        return flowDynamic([
            'Por favor, elige un horario disponible entre 9:00 AM y 6:00 PM',
            'Formato: HH:MM (ejemplo: 14:30)'
        ]);
    })
    .addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
        const hora = ctx.body;
        const fecha = state.get('fecha');
        const paciente = ctx.from;

        try {
            const resultado = await sheetsServices.reservarCita(fecha, hora, paciente);
            return flowDynamic([
                `¡Perfecto! Tu cita ha sido agendada para el ${resultado.fechaHora}.`,
                'Se ha enviado un correo con los detalles de la cita.',
                `Puedes ver la cita en tu calendario aquí: ${resultado.linkCalendario}`,
                'Recibirás un recordatorio por email 24 horas antes y una notificación 30 minutos antes de la cita.',
                'Si necesitas modificar o cancelar tu cita, no dudes en avisarnos.'
            ]);
        } catch (error) {
            return flowDynamic([
                'Lo siento, hubo un problema al agendar tu cita:',
                error.message,
                'Por favor, intenta nuevamente con otra fecha u hora.'
            ]);
        }
    });
