# App Flow Document - Khipu: Asistente Financiero por WhatsApp

## Introducción al Flujo de la Aplicación

Este documento describe el recorrido completo del usuario desde el primer contacto con Khipu hasta las diversas interacciones y funcionalidades disponibles a través de la plataforma de mensajería WhatsApp. El flujo está diseñado para ser intuitivo, conversacional y eficiente, adaptándose al contexto natural de una aplicación de mensajería instantánea.

## Primer Contacto y Registro

El usuario inicia la conversación enviando cualquier mensaje al número de WhatsApp asociado a Khipu. El sistema verifica automáticamente si el número de teléfono ya está registrado en la base de datos. Si es un usuario nuevo, se activa el flujo de registro.

En el flujo de registro, Khipu se presenta como un asistente financiero y explica brevemente su propósito. Luego solicita al usuario su nombre completo con un mensaje amigable. El usuario responde con su nombre y Khipu lo saluda personalmente.

A continuación, solicita un correo electrónico válido para completar el registro. El sistema verifica el formato del correo utilizando expresiones regulares. Si el formato es incorrecto, solicita nuevamente la información. Una vez validado, el sistema registra al usuario en Google Sheets y confirma que el registro se ha completado exitosamente.

## Interacción Principal - Registro de Gastos

Una vez registrado, el usuario puede interactuar con Khipu para registrar sus gastos diarios. El formato de la interacción es flexible y en lenguaje natural. El usuario puede escribir mensajes como "Gasté $50 en el supermercado ayer" o "Pagué $120 por la factura de luz".

El sistema analiza el mensaje utilizando la API de DeepSeek para detectar patrones de gasto. Extrae la información clave como el monto, la descripción y la fecha. Si detecta un patrón de gasto válido, procede a categorizarlo automáticamente basándose en el contexto y descripción proporcionados.

Khipu responde confirmando la información extraída y la categoría asignada: "He registrado tu gasto de $50 en Supermercado (categoría: Alimentación) con fecha 24/02/2025. ¿Es correcta esta información?". El usuario puede confirmar o corregir cualquier detalle.

Si la información es correcta, el sistema guarda el gasto en la hoja de cálculo correspondiente al mes actual (formato "Gastos_Febrero_2025"). Si el usuario necesita corregir algo, puede indicarlo en lenguaje natural y el sistema procesará la corrección.

## Consultas y Reportes

El usuario puede solicitar información sobre sus gastos previos mediante preguntas en lenguaje natural. Por ejemplo, "¿Cuánto he gastado este mes?" o "¿Cuáles fueron mis gastos en alimentación la semana pasada?".

Khipu procesa estas consultas, accede a la información almacenada en Google Sheets, y genera una respuesta estructurada con la información solicitada. Para consultas sobre totales mensuales, el sistema calcula la suma de todos los gastos registrados en el mes actual y presenta esta información de manera clara.

Para consultas por categoría, el sistema filtra los gastos según la categoría mencionada y el período de tiempo especificado o implícito. Luego suma los montos y presenta el total junto con un desglose de los gastos más significativos si es relevante.

## Recordatorios y Alertas

El sistema puede configurarse para enviar recordatorios periódicos para el registro de gastos. Por ejemplo, al final del día puede preguntar: "¿Has registrado todos tus gastos de hoy? Es importante mantener un registro completo para un mejor control financiero."

También puede configurarse para enviar alertas cuando se detecten patrones inusuales, como un gasto significativamente mayor al promedio en una categoría específica. El mensaje podría ser: "He notado que tu gasto en Entretenimiento este mes es un 40% mayor que tu promedio histórico. ¿Quieres revisar el detalle?"

## Corrección y Edición de Datos

Si el usuario necesita corregir un gasto previamente registrado, puede solicitarlo con mensajes como "Necesito corregir mi último gasto" o "Quiero modificar el gasto en restaurante de ayer".

El sistema responde presentando los detalles del gasto mencionado y preguntando qué aspecto necesita ser corregido. El usuario puede especificar el cambio en lenguaje natural: "El monto fue $45, no $54" o "La categoría debería ser Trabajo, no Personal".

Khipu procesa la solicitud, actualiza la información en Google Sheets y confirma que el cambio se ha realizado correctamente, mostrando los datos actualizados para verificación.

## Flujo de Cierre de Sesión

Aunque no existe un proceso formal de cierre de sesión debido a la naturaleza de WhatsApp, el usuario puede indicar que ha terminado su interacción actual con mensajes como "Gracias, eso es todo por ahora" o "Hasta luego".

El sistema responde con un mensaje de despedida amable que incluye un recordatorio sutil sobre la importancia del registro regular de gastos: "¡Hasta pronto! Recuerda registrar tus gastos diariamente para mantener un control efectivo de tus finanzas. Estaré aquí cuando me necesites."

## Manejo de Errores y Situaciones Imprevistas

Si el sistema no puede interpretar claramente un mensaje o detecta ambigüedad, responde con una solicitud de aclaración específica: "No estoy seguro si estás registrando un gasto o haciendo una consulta. ¿Podrías reformular tu mensaje?"

En caso de problemas técnicos, como fallos en la conexión a Google Sheets o a la API de DeepSeek, el sistema responde con un mensaje transparente sobre el problema y sugiere intentarlo más tarde: "Estoy experimentando problemas técnicos para procesar tu solicitud en este momento. Por favor, intenta nuevamente en unos minutos."

Si el usuario envía contenido no relacionado con finanzas o fuera del alcance del asistente, Khipu responde educadamente recordando su propósito principal: "Como tu asistente financiero, estoy aquí para ayudarte con el registro y seguimiento de tus gastos. ¿En qué puedo ayudarte con tus finanzas hoy?"

## Flujo de Ayuda y Soporte

El usuario puede solicitar ayuda en cualquier momento con mensajes como "¿Qué puedes hacer?" o "Necesito ayuda con el registro de gastos".

Khipu responde con un mensaje informativo que explica sus principales funcionalidades, junto con ejemplos de uso para cada una. También ofrece sugerencias específicas basadas en el historial de interacción del usuario, como las categorías más utilizadas o consultas frecuentes.

Si el usuario tiene problemas técnicos persistentes, puede solicitar contacto con soporte humano, y el sistema proporcionará instrucciones sobre cómo reportar el problema a través de un correo electrónico dedicado.
