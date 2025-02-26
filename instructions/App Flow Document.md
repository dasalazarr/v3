# App Flow Document - Khipu: Asistente Financiero por WhatsApp

## Introducción al Flujo de la Aplicación

Este documento describe el recorrido completo del usuario desde el primer contacto con Khipu hasta las diversas interacciones y funcionalidades disponibles a través de la plataforma de mensajería WhatsApp. El flujo está diseñado para ser intuitivo, conversacional y eficiente, adaptándose al contexto natural de una aplicación de mensajería instantánea.

## Primer Contacto y Registro

El usuario inicia la conversación enviando cualquier mensaje al número de WhatsApp asociado a Khipu. El sistema verifica automáticamente si el número de teléfono ya está registrado en la base de datos. Si es un usuario nuevo, se activa el flujo de registro.

En el flujo de registro, Khipu se presenta como un asistente financiero y explica brevemente su propósito. Luego solicita al usuario su nombre completo con un mensaje amigable. El usuario responde con su nombre y Khipu lo saluda personalmente.

A continuación, solicita un correo electrónico válido para completar el registro. El sistema verifica el formato del correo utilizando expresiones regulares. Si el formato es incorrecto, solicita nuevamente la información. Una vez validado, el sistema registra al usuario en Google Sheets y confirma que el registro se ha completado exitosamente.

## Registro de Conversaciones

Todas las interacciones entre el usuario y Khipu se registran automáticamente en la hoja "Conversations" de Google Sheets. El sistema:

1. Verifica si la hoja "Conversations" existe y la crea automáticamente si es necesario
2. Registra cada mensaje con la siguiente información:
   - Número de teléfono del usuario
   - Marca de tiempo (timestamp)
   - Mensaje del usuario
   - Respuesta del bot
3. Actualiza la marca de tiempo de última actividad del usuario

Este registro permite:
- Analizar patrones de uso y preguntas frecuentes
- Mejorar el entrenamiento del modelo de IA
- Proporcionar contexto histórico para futuras interacciones
- Facilitar la depuración y mejora continua del sistema

## Gestión de Gastos

### Registro de Gastos

El usuario puede registrar gastos mediante mensajes de texto naturales. El sistema:

1. Analiza el mensaje utilizando procesamiento de lenguaje natural
2. Extrae información clave (monto, categoría, descripción, fecha)
3. Valida los datos extraídos:
   - Verifica que la fecha sea válida
   - Confirma que la categoría exista
   - Asegura que el monto sea un número positivo
   - Requiere una descripción no vacía
4. Almacena el gasto en la hoja correspondiente al mes actual

### Consulta de Gastos

El usuario puede solicitar información sobre sus gastos mediante comandos conversacionales:

1. **Gastos por Categoría**: "¿Cuánto he gastado en alimentación este mes?"
   - El sistema filtra los gastos por categoría y rango de fechas
   - Devuelve un resumen de los montos totales por categoría

2. **Gastos Mensuales**: "¿Cuál es mi gasto total del mes?"
   - El sistema calcula la suma de todos los gastos del mes actual
   - Presenta el resultado con formato monetario

3. **Análisis de Tendencias**: "¿Cómo han evolucionado mis gastos en los últimos 3 meses?"
   - El sistema compara los gastos entre diferentes periodos
   - Puede presentar tendencias de aumento o disminución

## Interacción Principal - Registro de Gastos

Una vez registrado, el usuario puede interactuar con Khipu para registrar sus gastos diarios. El formato de la interacción es flexible y en lenguaje natural. El usuario puede escribir mensajes como "Gasté $50 en el supermercado ayer" o "Pagué $120 por la factura de luz".

El sistema analiza el mensaje utilizando la API de DeepSeek para detectar patrones de gasto. Extrae la información clave como el monto, la descripción y la fecha. Si detecta un patrón de gasto válido, procede a categorizarlo automáticamente basándose en el contexto y descripción proporcionados.

Khipu responde confirmando la información extraída y la categoría asignada: "He registrado tu gasto de $50 en Supermercado (categoría: Alimentación) con fecha 24/02/2025. ¿Es correcta esta información?". El usuario puede confirmar o corregir cualquier detalle.

Si la información es correcta, el sistema guarda el gasto en la hoja de cálculo correspondiente al mes actual (formato "Gastos_Febrero_2025"). Si el usuario necesita corregir algo, puede indicarlo en lenguaje natural y el sistema procesará la corrección.

## Manejo de Contexto Conversacional

Khipu implementa un sistema de contexto conversacional que permite mantener conversaciones más naturales y coherentes con los usuarios. Este sistema:

1. **Mantiene Memoria de Conversaciones Previas**
   - Almacena las últimas 5 interacciones (10 mensajes en total) con cada usuario
   - Carga automáticamente el historial de conversaciones desde Google Sheets al inicio de cada nueva interacción
   - Utiliza este contexto para generar respuestas más relevantes y personalizadas

2. **Mejora la Comprensión de Intenciones**
   - Interpreta mensajes ambiguos basándose en el contexto previo
   - Permite referencias a información mencionada anteriormente
   - Facilita conversaciones multi-turno para completar acciones complejas

3. **Flujo de Continuidad**
   - Si el usuario menciona "Hoy fue el gasto" después de indicar "Dos dolares en didi", el sistema entiende que está confirmando la fecha del gasto mencionado previamente
   - Cuando el usuario hace preguntas de seguimiento como "¿Y cuánto llevo este mes?", el sistema entiende el contexto de la pregunta
   - Las correcciones como "No, quise decir transporte" son interpretadas correctamente en el contexto de la conversación

### Ejemplo de Conversación con Contexto

```
Usuario: "Gasté 50 pesos en comida"
Khipu: "✅ Gasto registrado: $50 en Alimentación"

Usuario: "También 20 en transporte"
Khipu: "✅ He registrado tu gasto de $20 en Transporte. 
       Tus gastos del día son: Alimentación $50, Transporte $20"

Usuario: "¿Cuánto he gastado en total este mes?"
Khipu: "Este mes has gastado un total de $1,250. 
       Tus principales categorías son: Alimentación $450, Transporte $380..."
```

## Reconocimiento Avanzado de Gastos

El sistema ha sido mejorado para reconocer gastos expresados en lenguaje natural de múltiples formas:

### Patrones de Reconocimiento Soportados

1. **Expresiones Directas**
   - "50 en comida"
   - "30 pesos en transporte"
   - "Dos dólares en taxi"

2. **Verbos de Gasto**
   - "Gasté 100 en el supermercado"
   - "Pagué 80 por la cena"
   - "Compré ropa por 200"

3. **Expresiones con Palabras Numéricas**
   - "Dos dólares en didi"
   - "Cinco pesos en café"
   - "Diez en estacionamiento"

### Proceso de Reconocimiento y Registro

1. El usuario envía un mensaje en lenguaje natural
2. El sistema analiza el mensaje utilizando patrones de reconocimiento
3. Si se identifica como un gasto:
   - Extrae el monto (convirtiendo palabras numéricas si es necesario)
   - Identifica la descripción del gasto
   - Infiere la categoría basada en palabras clave
   - Registra el gasto en Google Sheets
   - Confirma al usuario con un resumen del gasto y los totales actualizados
4. Si hay ambigüedad:
   - Solicita la información faltante de manera conversacional
   - Mantiene el contexto para completar el registro una vez obtenida toda la información

Este enfoque permite a los usuarios registrar gastos de forma natural y conversacional, sin necesidad de seguir formatos específicos o comandos rígidos.

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

## Arquitectura Técnica

### Flujo de Procesamiento de Mensajes

1. El usuario envía un mensaje a través de WhatsApp
2. El webhook recibe el mensaje y lo procesa mediante el flujo principal
3. El sistema verifica si el usuario está registrado:
   - Si no está registrado, inicia el flujo de registro
   - Si está registrado, continúa con el procesamiento del mensaje
4. El mensaje se envía al servicio de IA (DeepSeek) para análisis
5. Basado en el análisis, el sistema:
   - Identifica si es un comando de gasto y lo procesa con ExpenseService
   - Responde a una consulta general con información relevante
   - Dirige al usuario a un flujo específico (FAQ, ayuda, etc.)
6. La respuesta se envía al usuario y la conversación se registra

### Componentes Clave

1. **SheetsService**: Gestiona todas las interacciones con Google Sheets
   - Creación y mantenimiento de hojas
   - Lectura y escritura de datos
   - Validación y formateo

2. **ExpenseService**: Maneja la lógica de negocio relacionada con gastos
   - Validación de datos de gastos
   - Categorización y análisis
   - Generación de reportes

3. **AIServices**: Procesa el lenguaje natural y genera respuestas
   - Interactúa con la API de DeepSeek
   - Extrae entidades y comandos de los mensajes
   - Genera respuestas contextuales

## Mejoras Futuras

### Funcionalidades Planificadas

1. **Presupuestos Personalizados**
   - Permitir al usuario establecer límites de gasto por categoría
   - Enviar alertas cuando se acerque o supere el presupuesto

2. **Exportación de Reportes**
   - Generar informes PDF o Excel con resúmenes mensuales
   - Enviar reportes automáticos al final de cada mes

3. **Recordatorios de Pagos**
   - Configurar recordatorios para pagos recurrentes
   - Notificar al usuario antes de la fecha de vencimiento

4. **Integración con Servicios Bancarios**
   - Conectar con APIs bancarias para importar transacciones
   - Reconciliar gastos automáticamente

### Mejoras Técnicas

1. **Migración a Base de Datos Relacional**
   - Implementar la estructura Supabase propuesta en la documentación
   - Mejorar la escalabilidad y rendimiento

2. **Implementación de Caché**
   - Reducir llamadas a la API de Google Sheets
   - Mejorar tiempos de respuesta

3. **Análisis Avanzado de Datos**
   - Implementar algoritmos de predicción de gastos
   - Ofrecer recomendaciones personalizadas de ahorro
