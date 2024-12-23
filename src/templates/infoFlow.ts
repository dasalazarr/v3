import { addKeyword } from "@builderbot/bot";

export const infoFlow = addKeyword(['info', 'información', 'informacion'])
    .addAnswer([
        '📚 Aquí tienes información sobre nuestros productos y servicios:',
        '',
        '• Consulta general: $50',
        '• Tratamientos especializados desde $100',
        '• Servicios de emergencia disponibles 24/7',
        '',
        'Para más detalles específicos o precios, no dudes en preguntarme.',
        'Si deseas agendar una cita, escribe "reservar".'
    ]);
