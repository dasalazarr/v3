import { addKeyword } from "@builderbot/bot";
import sheetsServices from "../services/sheetsServices";

const reservarCitaFlow = addKeyword('Reservar cita')
  .addAction(async (ctx, ctxFn) => {
    ctx.reply('¡Genial! Para agendar tu cita, por favor proporciona la fecha y la hora en el siguiente formato: Reservar cita para el [fecha] a [hora].');
  })
  .addAction(async (ctx, ctxFn) => {
    const mensaje = ctx.message.text;
    const regex = /Reservar cita para el (.+) a (.+)/;
    const matches = mensaje.match(regex);

    if (matches) {
        const fecha = matches[1];
        const hora = matches[2];
        const paciente = ctx.from;

        try {
            const resultado = await sheetsServices.reservarCita(fecha, hora, paciente);
            ctx.reply(resultado);
        } catch (error) {
            ctx.reply('Error al reservar la cita: ' + error.message);
        }
    } else {
        ctx.reply('Por favor, utiliza el formato: Reservar cita para el [fecha] a [hora].');
    }
  });

export { reservarCitaFlow };
