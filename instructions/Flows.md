# Documentación de Flujos - Khipu: Asistente Financiero por WhatsApp

## Introducción a los Flujos Conversacionales

Este documento proporciona una descripción detallada de los flujos conversacionales implementados en Khipu, su funcionamiento, lógica y estructura. También se incluye un template estandarizado para la creación de nuevos flujos, facilitando la escalabilidad y mantenimiento del sistema a largo plazo.

## Arquitectura de Flujos

Los flujos en Khipu están construidos sobre el framework BuilderBot, que proporciona una estructura modular para la gestión de conversaciones. Cada flujo sigue un patrón común:

1. **Definición**: Creación del flujo mediante la función `addKeyword`
2. **Activación**: Especificación de eventos o palabras clave que activan el flujo
3. **Acciones**: Procesamiento lógico durante la ejecución del flujo
4. **Respuestas**: Mensajes enviados al usuario durante la interacción
5. **Captura**: Obtención y validación de información proporcionada por el usuario
6. **Transiciones**: Navegación entre diferentes estados del flujo o hacia otros flujos

## Flujos Actuales

### 1. Main Flow (`mainFlow.ts`)

**Propósito**: Punto de entrada principal para todas las interacciones.

**Estructura**:
```typescript
import { addKeyword, EVENTS } from "@builderbot/bot"
import { faqFlow } from "./faqFlow"
import container from "../di/container";
import { SheetsService } from "../services/sheetsServices"

// Obtenemos la instancia del servicio del contenedor
const sheetsService = container.resolve<SheetsService>("SheetsService");

const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, ctxFn) => {
    // Ya no verificamos si el usuario existe, todos van al faqFlow
    ctxFn.gotoFlow(faqFlow);
  });

export { mainFlow };
```

**Funcionamiento**:
- Se activa con el evento `WELCOME` cuando un usuario inicia la conversación
- Redirige directamente al usuario al flujo de FAQ sin verificación previa
- Utiliza el patrón de inyección de dependencias para obtener servicios

**Consideraciones**:
- A diferencia de versiones anteriores, ya no verifica si el usuario está registrado
- No requiere un flujo de registro previo
- Es un flujo de simple redirección, sin interacciones directas con el usuario

### 2. FAQ Flow (`faqFlow.ts`)

**Propósito**: Procesar mensajes generales de usuarios, utilizando IA para generar respuestas adecuadas.

**Estructura**:
```typescript
import { addKeyword, EVENTS } from "@builderbot/bot";
import container from "../di/container";
import { config } from "../config";
import { SheetsService } from "../services/sheetsServices";
import { AIService } from "../services/aiservices";

// Obtenemos las instancias de los servicios del contenedor
const sheetsService = container.resolve<SheetsService>("SheetsService");
const aiServices = container.resolve<AIService>("AIService");

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { endFlow }) => {
    try {
      console.log("📱 Mensaje recibido de:", ctx.from);
      console.log("🔑 API Key:", config.apiKey ? "Configurada" : "No configurada");
      
      if (!ctx.body) {
        console.log("❌ Mensaje vacío");
        return endFlow("Por favor, envía un mensaje con contenido.");
      }

      // Procesamiento del mensaje con IA
      console.log("💬 Enviando mensaje al asistente");
      const response = await aiServices.processMessage(ctx.body, ctx.from);

      if (!response) {
        console.error("❌ No se recibió respuesta del asistente");
        return endFlow("No pude procesar tu mensaje. Por favor, intenta de nuevo.");
      }

      console.log("✅ Respuesta enviada");
      return endFlow(response);
    } catch (error) {
      console.error("❌ Error en el flujo FAQ:", error);
      return endFlow("Lo siento, ocurrió un error. Por favor, intenta de nuevo.");
    }
  });
```

**Funcionamiento**:
1. Recibe el mensaje del usuario
2. Comprueba que el mensaje no esté vacío
3. Envía el mensaje al servicio de IA para procesamiento
4. Recibe la respuesta generada por la IA
5. Responde al usuario con el contenido generado
6. Finaliza el flujo permitiendo una nueva interacción

**Consideraciones**:
- Maneja los errores de manera robusta para evitar interrupciones
- Utiliza inyección de dependencias para los servicios
- El registro de conversaciones se maneja dentro del servicio de IA
- Proporciona mensajes de error informativos al usuario

### 3. Appointment Flow (`appointmentFlow.ts`)

**Propósito**: Permitir a los usuarios agendar, modificar y cancelar citas a través del asistente.

**Estructura**:
```typescript
import { addKeyword, EVENTS } from "@builderbot/bot";
import container from "../di/container";
import { AppointmentController } from '../services/appointments.controller';
import * as chrono from 'chrono-node';

// Obtenemos la instancia del controlador del contenedor
const appointmentController = container.resolve<AppointmentController>("AppointmentController");

// Estado temporal para almacenar los datos de la cita durante el flujo
const appointmentData = new Map<string, any>();

export const appointmentFlow = addKeyword(['cita', 'agendar', 'programar', 'reservar'], {
  sensitive: true
})
  .addAnswer(
    '¡Claro! Te ayudo a agendar una cita. ¿Para qué fecha te gustaría?',
    { capture: true },
    async (ctx, { fallBack, flowDynamic }) => {
      // Procesamiento de la fecha...
    }
  )
  .addAnswer(
    '¿A qué hora te gustaría la cita?',
    { capture: true },
    async (ctx, { fallBack, flowDynamic }) => {
      // Procesamiento de la hora...
    }
  )
  .addAnswer(
    '¿Cuál es el motivo de tu cita?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      // Captura del motivo...
    }
  )
  .addAnswer(
    'Perfecto, déjame verificar la disponibilidad y agendar tu cita...',
    null,
    async (ctx, { flowDynamic }) => {
      // Creación de la cita...
    }
  );

// Flujo para cancelar citas
export const cancelAppointmentFlow = addKeyword(['cancelar cita'])
  // Implementación del flujo de cancelación...
```

**Funcionamiento**:
1. Se activa cuando el usuario menciona palabras clave relacionadas con citas
2. Solicita la fecha deseada y la valida usando procesamiento de lenguaje natural
3. Solicita la hora deseada y verifica que esté dentro del horario de atención
4. Captura el motivo de la cita
5. Verifica la disponibilidad para evitar conflictos
6. Crea la cita en Google Calendar y registra en Google Sheets
7. Proporciona al usuario la confirmación y el ID de su cita

## Flujo MVP Odontológico

Este flujo ha sido adaptado específicamente para una clínica dental, optimizando el proceso de gestión de pacientes y citas. Permite registrar pacientes, agendar citas dentales y enviar recordatorios automáticos.

```typescript
// Flujo para registro de pacientes dentales y agendamiento de citas
export const dentalPatientFlow = addKeyword(['quiero una cita', 'agendar', 'odontólogo', 'dentista'])
  .addAnswer(
    'Bienvenido a nuestra Clínica Dental. Para agendar una cita, necesitamos registrarte primero. ¿Cuál es tu nombre completo?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      // Almacenar nombre del paciente
      const patientName = ctx.body;
      // Guardar en estado temporal
      patientData.set(ctx.from, { name: patientName });
      await flowDynamic(`Gracias ${patientName}. Registrando tu información...`);
    }
  )
  .addAnswer(
    '¿Cuál es tu número de teléfono para contactarte?',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      // Almacenar teléfono del paciente
      const phone = ctx.body;
      const data = patientData.get(ctx.from) || {};
      // Actualizar estado temporal
      patientData.set(ctx.from, { ...data, phone });
      
      try {
        // Registrar paciente en la base de datos
        const patientsService = container.resolve('PatientsService');
        const { patientId } = await patientsService.createPatient({
          name: data.name,
          phone: phone
        });
        
        // Guardar ID del paciente
        patientData.set(ctx.from, { ...data, phone, patientId });
        await flowDynamic(`Perfecto, te hemos registrado con éxito.`);
      } catch (error) {
        console.error('Error registrando paciente:', error);
        await flowDynamic('Lo siento, hubo un problema al registrar tus datos. Por favor, intenta nuevamente.');
      }
    }
  )
  .addAnswer(
    '¿Qué tipo de servicio dental necesitas?\n\n1. Consulta/Revisión\n2. Limpieza dental\n3. Tratamiento de conducto\n4. Extracción\n5. Ortodoncia\n6. Otro',
    { capture: true },
    async (ctx, { flowDynamic }) => {
      // Mapear tipos de cita
      const appointmentTypes = {
        '1': 'Consulta',
        '2': 'Limpieza',
        '3': 'Endodoncia',
        '4': 'Extracción',
        '5': 'Ortodoncia',
        '6': 'Otro'
      };
      
      const typeInput = ctx.body;
      const type = appointmentTypes[typeInput] || 'Consulta';
      
      const data = patientData.get(ctx.from) || {};
      patientData.set(ctx.from, { ...data, type });
      
      await flowDynamic(`Has seleccionado: ${type}`);
    }
  )
  // Continuar con el flujo normal de agendamiento de citas
  .addAnswer(
    '¿Para qué fecha deseas tu cita dental?',
    // Resto del flujo de citas...
  );
```

**Flujo para el MVP Odontológico**:

1. **Registro de Paciente**
   - Se captura el nombre completo del paciente
   - Se solicita número de teléfono de contacto
   - La información se almacena en Google Sheets usando `PatientsService`

2. **Tipo de Servicio Dental**
   - El paciente selecciona el tipo de procedimiento dental
   - Opciones predefinidas: Consulta, Limpieza, Endodoncia, Extracción, Ortodoncia

3. **Agendamiento**
   - Se sigue el flujo estándar de citas, solicitando fecha y hora
   - La cita se crea con referencia al ID del paciente
   - Se categoriza según el tipo de servicio dental

4. **Confirmación y Recordatorio**
   - Confirmación inmediata por WhatsApp
   - Recordatorio automático 24 horas antes de la cita

**Consideraciones**:
- Utiliza la biblioteca chrono-node para procesar fechas en lenguaje natural
- Implementa validaciones para garantizar fechas futuras y dentro del horario
- Maneja el estado de la conversación a través de un Map para persistencia temporal
- Incluye manejo de errores detallado y mensajes de usuario claros
- Proporciona funcionalidad para cancelar citas existentes

## Lógica y Procesamiento

### Servicio de IA (`aiservices.ts`)

El componente central para el procesamiento de mensajes es el servicio de IA, que realiza las siguientes funciones:

1. **Análisis de Mensajes**: Procesa el texto para detectar intenciones y extraer información relevante
2. **Detección de Gastos**: Identifica si el mensaje contiene información sobre un gasto (monto, categoría, fecha)
3. **Generación de Respuestas**: Crea respuestas contextuales basadas en la historia conversacional
4. **Manejo de Excepciones**: Gestiona errores de API y situaciones no reconocidas

```typescript
async chatWithAssistant(userPrompt: string): Promise<{ response: string; expense?: Expense }> {
  try {
    // Detectar si es un gasto mediante regex
    const expenseInfo = this.detectExpensePattern(userPrompt);
    
    if (expenseInfo) {
      // Procesar el gasto identificado
      // Categorizar el gasto usando IA
      // Registrar el gasto en Google Sheets
      return { response: confirmationMessage, expense: expenseInfo };
    }
    
    // Procesar mensaje normal con IA
    const messages = this.createMessages(userPrompt);
    const response = await this.chat(userPrompt, messages);
    
    return { response };
  } catch (error) {
    console.error('Error en chatWithAssistant:', error);
    return { response: this.getErrorMessage(error) };
  }
}
```

### Conexión con Google Sheets (`sheetsServices.ts`)

El servicio de hojas de cálculo maneja la persistencia de datos:

1. **Verificación de Usuarios**: Comprueba si un número de teléfono está registrado
2. **Registro de Usuarios**: Añade nuevos usuarios al sistema
3. **Registro de Gastos**: Añade entradas de gastos en hojas mensuales
4. **Gestión de Hojas**: Crea automáticamente hojas para nuevos meses
5. **Formateo y Validación**: Aplica formato condicional y validación de datos

## Template para Nuevos Flujos

A continuación se presenta un template estandarizado para la creación de nuevos flujos, siguiendo las mejores prácticas y la estructura establecida en Khipu:

```typescript
import { addKeyword, EVENTS } from "@builderbot/bot";
import { config } from "../config";
// Importar los servicios necesarios
import servicio1 from "~/services/servicio1";
import servicio2 from "~/services/servicio2";

/**
 * [NOMBRE_DEL_FLUJO] - [DESCRIPCIÓN BREVE]
 * 
 * Este flujo se encarga de [PROPÓSITO PRINCIPAL].
 * Se activa cuando [CONDICIÓN DE ACTIVACIÓN].
 * 
 * @author [AUTOR]
 * @version [VERSIÓN]
 * @date [FECHA]
 */
export const nombreDelFlujo = addKeyword([EVENTO_O_KEYWORD])
  /**
   * Paso 1: [DESCRIPCIÓN DEL PASO]
   * [EXPLICACIÓN ADICIONAL SI ES NECESARIA]
   */
  .addAnswer("[MENSAJE AL USUARIO]", 
    { 
      capture: [BOOLEANO], // true si se espera respuesta del usuario
      buttons: [
        { body: "[OPCIÓN 1]" },
        { body: "[OPCIÓN 2]" }
      ] // opcional
    },
    async (ctx, ctxFn) => {
      try {
        // Lógica de procesamiento
        console.log("[MENSAJE DE LOG DESCRIPTIVO]", ctx.body);
        
        // Ejemplo de validación
        if ([CONDICIÓN]) {
          return ctxFn.fallBack("[MENSAJE DE ERROR]");
        }
        
        // Ejemplo de almacenamiento en estado
        await ctxFn.state.update({ key: ctx.body });
        
        // Ejemplo de respuesta dinámica
        await ctxFn.flowDynamic("[RESPUESTA PERSONALIZADA]" + ctx.body);
      } catch (error) {
        console.error("[PREFIJO DE ERROR]:", error);
        return ctxFn.fallBack("[MENSAJE DE ERROR PARA USUARIO]");
      }
    }
  )
  
  /**
   * Paso 2: [DESCRIPCIÓN DEL PASO]
   */
  .addAnswer("[SIGUIENTE MENSAJE]", 
    { capture: [BOOLEANO] },
    async (ctx, ctxFn) => {
      // Lógica similar a la anterior
    }
  )
  
  /**
   * Acción final
   * Esta acción se ejecuta al final del flujo y puede:
   * - Redirigir a otro flujo
   * - Finalizar la conversación
   * - Realizar operaciones de limpieza
   */
  .addAction(async (ctx, ctxFn) => {
    try {
      // Recuperar el estado completo
      const state = ctxFn.state.getMyState();
      
      // Ejemplo de interacción con servicio
      await servicio1.metodo(state.key, ctx.from);
      
      // Ejemplo de finalización
      return ctxFn.endFlow("[MENSAJE DE FINALIZACIÓN]");
      
      // Alternativa: redirección a otro flujo
      // return ctxFn.gotoFlow(otroFlujo);
    } catch (error) {
      console.error("[PREFIJO DE ERROR FINAL]:", error);
      return ctxFn.endFlow("[MENSAJE DE ERROR FINAL]");
    }
  });
```

## Mejores Prácticas para Flujos

### 1. Estructura y Organización

- **Prefijos Claros**: Usar nombres descriptivos para los flujos (ej. `registerFlow`, `expenseFlow`)
- **Comentarios Detallados**: Documentar el propósito, entradas y salidas de cada flujo
- **Modularidad**: Dividir flujos complejos en subflujos manejables
- **Consistencia**: Mantener un estilo uniforme en todos los flujos

### 2. Manejo de Estado

- **Estado Mínimo**: Almacenar solo lo necesario en el estado de la conversación
- **Validación Temprana**: Validar entradas del usuario lo antes posible
- **Limpieza de Estado**: Limpiar el estado al finalizar los flujos
- **Persistencia Selectiva**: Guardar en base de datos solo la información procesada y validada

### 3. Respuestas al Usuario

- **Claridad**: Mensajes concisos y fáciles de entender
- **Consistencia**: Mantener un tono y estilo coherentes
- **Retroalimentación**: Confirmar acciones completadas
- **Opciones Claras**: Cuando se presentan botones, hacerlos descriptivos

### 4. Manejo de Errores

- **Graceful Degradation**: Proporcionar experiencia aceptable incluso cuando fallan componentes
- **Mensajes Amigables**: Traducir errores técnicos a mensajes comprensibles
- **Logging Detallado**: Registrar errores con contexto para facilitar depuración
- **Recuperación**: Ofrecer caminos alternativos cuando un flujo falla

## Ejemplos de Nuevos Flujos Potenciales

### 1. Flujo de Reportes Mensuales

```typescript
import { addKeyword } from "@builderbot/bot";
import sheetsServices from "~/services/sheetsServices";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const reportFlow = addKeyword(['reporte', 'informe', 'resumen'])
  .addAnswer("¿Qué tipo de reporte te gustaría recibir?", {
    capture: true,
    buttons: [
      { body: "Mensual" },
      { body: "Por Categoría" },
      { body: "Personalizado" }
    ]
  }, async (ctx, ctxFn) => {
    await ctxFn.state.update({ reportType: ctx.body });
    
    if (ctx.body === "Personalizado") {
      await ctxFn.flowDynamic("Para un reporte personalizado, necesito algunos detalles adicionales.");
    }
  })
  
  .addAnswer("¿Para qué mes necesitas el reporte? (ejemplo: Enero 2025)", {
    capture: true
  }, async (ctx, ctxFn) => {
    // Procesamiento del mes solicitado
    // Generación del reporte
    // Envío de resultados formatados
  });
```

### 2. Flujo de Configuración de Alertas

```typescript
import { addKeyword } from "@builderbot/bot";
import expenseService from "~/services/expenseService";

export const alertConfigFlow = addKeyword(['alerta', 'límite', 'notificación'])
  .addAnswer("¿Para qué categoría quieres configurar una alerta?", {
    capture: true
  })
  .addAnswer("¿Cuál es el monto límite que deseas establecer?", {
    capture: true
  })
  .addAnswer("¿Con qué frecuencia quieres recibir la alerta? (diaria/semanal/mensual)", {
    capture: true,
    buttons: [
      { body: "Diaria" },
      { body: "Semanal" },
      { body: "Mensual" }
    ]
  }, async (ctx, ctxFn) => {
    // Configuración de la alerta
    // Confirmación al usuario
  });
```

## Conclusiones y Recomendaciones

### Para Mantenimiento de Flujos

1. **Revisiones Periódicas**: Evaluar regularmente el rendimiento y efectividad de los flujos
2. **Análisis de Abandono**: Identificar puntos donde los usuarios abandonan los flujos
3. **Actualización de Modelos**: Mantener actualizados los modelos de IA para mejorar la comprensión
4. **Pruebas Automáticas**: Implementar pruebas para validar el funcionamiento correcto de los flujos

### Para Escalabilidad

1. **Framework de Flujos**: Considerar la migración a un framework más robusto para flujos complejos
2. **Versionado de Flujos**: Implementar versionado para facilitar actualizaciones graduales
3. **Monitoreo en Tiempo Real**: Integrar herramientas de monitoreo para identificar problemas
4. **Estrategia de Caché**: Implementar caché para reducir llamadas a APIs externas

### Para Desarrollo Futuro

1. **Personalización**: Adaptar respuestas basadas en el historial y preferencias del usuario
2. **Multilenguaje**: Preparar la estructura para soportar múltiples idiomas
3. **Integración con NLP Avanzado**: Explorar modelos específicos para finanzas
4. **Flujos Condicionales**: Implementar lógica más sofisticada basada en el contexto completo
