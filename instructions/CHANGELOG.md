# Bitácora de Cambios - Khipu WhatsApp Financial Assistant

## Implementación del Sistema de Citas (02/04/2025)

### Cambios Realizados

#### Nuevos Servicios
- **AppointmentService**: 
  - Implementación de servicio para gestión de citas
  - Integración con Google Calendar API
  - Validación de fechas, horarios y disponibilidad
  - Registro de citas en Google Sheets

- **AppointmentController**:
  - Creación de controlador para centralizar operaciones de citas
  - Interfaz entre el flujo conversacional y el servicio de citas
  - Manejo de errores específicos para citas

#### Flujos Actualizados
- **mainFlow**:
  - Eliminación de verificación de registro de usuario
  - Redirección directa al flujo FAQ para todos los usuarios

- **registerFlow**:
  - Eliminado completamente del sistema ya que no es necesario

- **appointmentFlow**:
  - Nuevo flujo para la gestión de citas mediante WhatsApp
  - Procesamiento de fechas y horas en lenguaje natural con chrono-node
  - Implementación de subdiálogos para programar, modificar y cancelar citas

#### Actualizaciones en Configuración
- **config.ts** y **config/index.ts**:
  - Adición de variables para Google Calendar
  - Actualización de los tipos TypeScript para incluir calendarId
  - Validación de variables de entorno relacionadas con citas

### Documentación
- **Flows.md**:
  - Actualizado para reflejar la eliminación del flujo de registro
  - Documentación detallada del nuevo flujo de citas

- **Backend Structure.md**:
  - Actualizado para incluir el servicio de citas y sus métodos
  - Documentación de la integración con Google Calendar

### Dependencias Añadidas
- **chrono-node**:
  - Biblioteca para análisis de expresiones de fecha y hora en lenguaje natural
  - Utilizada para interpretar fechas en el flujo de citas

- **googleapis**:
  - Actualización para incluir funcionalidades de Google Calendar

### Próximos Pasos
1. Realizar pruebas exhaustivas del flujo de citas con diferentes formatos de fecha y hora
2. Implementar recordatorios automáticos para citas próximas
3. Mejorar las validaciones de disponibilidad y conflictos
4. Considerar la implementación de un mecanismo de reconfirmación de citas

## Implementación de Inyección de Dependencias (09/03/2025)

### Cambios Realizados

#### Servicios Actualizados
- **SheetsService**: 
  - Cambiado de `@injectable()` a `@singleton()`
  - Modificada la exportación para exportar la clase en lugar de una instancia

- **ExpenseService**: 
  - Cambiado de `@injectable()` a `@singleton()`
  - Modificada la exportación para exportar la clase en lugar de una instancia

- **BudgetService**: 
  - Cambiado de `@injectable()` a `@singleton()`
  - Modificada la exportación para exportar la clase en lugar de una instancia

- **AlertService**: 
  - Cambiado de `@injectable()` a `@singleton()`
  - Actualizadas las referencias a budgetService
  - Modificada la exportación para exportar la clase en lugar de una instancia

- **ScheduledTasks**: 
  - Cambiado de `@injectable()` a `@singleton()`
  - Actualizado para usar inyección de dependencias
  - Modificada la exportación para exportar la clase en lugar de una instancia

- **AIService** (anteriormente aiServices):
  - Renombrado de `aiServices` a `AIService` para seguir convenciones de nomenclatura
  - Agregado el decorador `@singleton()`
  - Actualizado para usar inyección de dependencias
  - Modificada la exportación para exportar la clase en lugar de una instancia

- **AppointmentService** y **AppointmentController**:
  - Agregado el decorador `@singleton()`
  - Actualizado AppointmentController para usar inyección de dependencias
  - Registrados en el contenedor central

#### Nuevos Archivos
- **container.ts**: 
  - Creado en `src/di/`
  - Registra todos los servicios con el contenedor de tsyringe
  - Exporta el contenedor para su uso en la aplicación

#### Archivos de Flujo Actualizados
- **budgetFlow.ts**:
  - Actualizado para usar el contenedor para obtener instancias de servicios
  - Eliminadas importaciones directas de instancias de servicios

- **faqFlow.ts**:
  - Actualizado para usar el contenedor para obtener instancias de servicios
  - Corregido el nombre de la clase AIService

- **appointmentFlow.ts**:
  - Actualizado para usar el contenedor para obtener la instancia de AppointmentController
  - Eliminada la instanciación directa con new

- **mainflow.ts**:
  - Actualizado para usar el contenedor para obtener la instancia de SheetsService
  - Eliminada la importación directa de la instancia de sheetsServices

- **registerFlow.ts**:
  - Actualizado para usar el contenedor para obtener la instancia de SheetsService
  - Eliminada la importación directa de la instancia de sheetsServices

#### Actualizaciones en app.ts
- Importación de reflect-metadata al inicio del archivo
- Eliminada la propiedad diContainer que no es soportada por createBot
- Actualizado para resolver ScheduledTasks desde el contenedor antes de crear el bot

### Documentación
- **DEPENDENCY_INJECTION.md**:
  - Actualizado con información detallada sobre la implementación de inyección de dependencias
  - Agregadas secciones sobre el contenedor central, decoradores en servicios, uso en flujos y buenas prácticas

### Próximos Pasos
1. Verificar que todos los servicios funcionen correctamente con la nueva implementación
2. Realizar pruebas exhaustivas para asegurar que la inyección de dependencias esté funcionando como se espera
3. Considerar la implementación de pruebas unitarias para los servicios
4. Revisar y actualizar la documentación según sea necesario
