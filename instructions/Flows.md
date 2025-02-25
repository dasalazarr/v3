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

**Propósito**: Punto de entrada principal para todas las interacciones. Determina si el usuario está registrado y lo dirige al flujo correspondiente.

**Estructura**:
```typescript
import { addKeyword, EVENTS } from "@builderbot/bot"
import { faqFlow } from "./faqFlow"
import sheetsServices from "../services/sheetsServices"
import { registerFlow } from "./registerFlow";

const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, ctxFn) => {
    const isUser = await sheetsServices.userExists(ctx.from);
    if (!isUser) {
        return ctxFn.gotoFlow(registerFlow);
    } else {
        ctxFn.gotoFlow(faqFlow)
    } 
  });

export { mainFlow };
```

**Funcionamiento**:
- Se activa con el evento `WELCOME` cuando un usuario inicia la conversación
- Verifica si el número de teléfono del usuario existe en la base de datos
- Si el usuario no existe, lo redirige al flujo de registro
- Si el usuario ya existe, lo redirige al flujo de FAQ

**Consideraciones**:
- Es un flujo de decisión, no contiene interacciones directas con el usuario
- Debe manejar excepciones en caso de que la verificación de usuario falle
- Es el primer flujo que se ejecuta en cualquier interacción nueva

### 2. Register Flow (`registerFlow.ts`)

**Propósito**: Gestionar el proceso de registro de nuevos usuarios, capturando su nombre y correo electrónico.

**Estructura**:
```typescript
import { addKeyword, EVENTS } from "@builderbot/bot";
import sheetsServices from "~/services/sheetsServices";

const registerFlow = addKeyword(EVENTS.ACTION)
  .addAnswer("¿Quieres comenzar con el Registro?", { 
    capture: true, 
    buttons: [{ body: "Sí, quiero!" }, { body: "No, gracias!" }] 
  },
  async (ctx, ctxFn) => {
    // Lógica de respuesta
  })
  .addAnswer("Primero, ¿cuál es tu nombre?", { capture: true }, 
  async (ctx, ctxFn) => {
    // Captura del nombre
  })
  .addAnswer("Ahora, ¿cuál es tu mail?", { capture: true }, 
  async (ctx, ctxFn) => {
    // Validación del correo y registro del usuario
  });
```

**Funcionamiento**:
1. Solicita confirmación del usuario para iniciar el registro
2. Si el usuario confirma, solicita su nombre
3. Almacena el nombre en el estado de la conversación
4. Solicita el correo electrónico
5. Valida el formato del correo utilizando una expresión regular
6. Si el correo es válido, registra al usuario en la base de datos
7. Confirma el registro exitoso al usuario

**Consideraciones**:
- Implementa validación para el formato del correo electrónico
- Utiliza el estado de la conversación para almacenar información temporal
- Proporciona retroalimentación clara en cada paso del proceso
- Ofrece una salida temprana si el usuario decide no registrarse

### 3. FAQ Flow (`faqFlow.ts`)

**Propósito**: Procesar mensajes generales de usuarios registrados, utilizando IA para generar respuestas adecuadas y registrar gastos cuando se detectan.

**Estructura**:
```typescript
import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "~/services/aiservices";
import { config } from "../config";
import sheetsServices from "~/services/sheetsServices";

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { endFlow }) => {
    try {
      // Procesamiento del mensaje con IA
      // Registro de la conversación
      // Respuesta al usuario
    } catch (error) {
      // Manejo de errores
    }
  });
```

**Funcionamiento**:
1. Recibe el mensaje del usuario
2. Inicializa el servicio de IA con la API key configurada
3. Envía el mensaje al asistente de IA para procesamiento
4. Recibe la respuesta generada por la IA
5. Guarda la conversación en la hoja de cálculo
6. Responde al usuario con el contenido generado
7. Finaliza el flujo permitiendo una nueva interacción

**Consideraciones**:
- Maneja los errores de manera robusta para evitar interrupciones
- Registra cada interacción para análisis y mejora continua
- Delega el procesamiento complejo al servicio de IA
- Finaliza adecuadamente el flujo para permitir nuevas interacciones

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
