# Configuración de Inyección de Dependencias

## Requisitos
1. **reflect-metadata** en package.json
2. Importar al inicio de app.ts:
```typescript
import 'reflect-metadata';
```

## Estructura del Sistema de DI

### Contenedor Central
El sistema utiliza un contenedor central ubicado en `src/di/container.ts` que registra todos los servicios:

```typescript
import { container } from 'tsyringe';
import SheetsService from '../services/sheetsServices';
import ExpenseService from '../services/expenseService';
// ... otros imports
import AIService from '../services/aiServices';
import AppointmentService from '../services/appointments.service';
import AppointmentController from '../controllers/appointment.controller';

// Registro de servicios
container.registerSingleton('SheetsService', SheetsService);
container.registerSingleton('ExpenseService', ExpenseService);
// ... otros registros
container.registerSingleton('AIService', AIService);
container.registerSingleton('AppointmentService', AppointmentService);
container.registerSingleton('AppointmentController', AppointmentController);

export default container;
```

### Decoradores en Servicios
Todos los servicios deben usar el decorador `@singleton()` para garantizar una única instancia:

```typescript
// Servicio base
@singleton()
export class SheetsService {
  //...
}

// Inyección en constructor
@singleton()
export class BudgetService {
  constructor(
    @inject('SheetsService') private sheetsService: SheetsService,
    @inject('AlertService') private alertService: AlertService
  ) {}
}

// Servicio de citas
@singleton()
export class AppointmentService {
  constructor(
    @inject('SheetsService') private sheetsService: SheetsService,
    private logger = new Logger('AppointmentService')
  ) {}

  // Métodos de servicio
}

// Controlador de citas
@singleton()
export class AppointmentController {
  constructor(
    @inject('AppointmentService') private appointmentService: AppointmentService,
    private logger = new Logger('AppointmentController')
  ) {}

  // Métodos del controlador
}
```

### Uso en Flujos y Componentes
Para usar servicios en flujos o componentes, importa el contenedor y resuelve las instancias:

```typescript
import container from "../di/container";
import { SheetsService } from "../services/sheetsServices";

// Obtener instancia del servicio
const sheetsService = container.resolve<SheetsService>("SheetsService");

// En appointmentFlow.ts
import container from "../di/container";
import { AppointmentController } from "../controllers/appointment.controller";

// Obtener instancia del controlador
const appointmentController = container.resolve<AppointmentController>("AppointmentController");
```

### Inicialización en app.ts
En el archivo principal `app.ts`, se debe importar `reflect-metadata` al inicio y usar el contenedor para resolver servicios:

```typescript
import "reflect-metadata";
import container from "./di/container";
import { ScheduledTasks } from "./services/scheduledTasks";

// Inicializar servicios
const scheduledTasks = container.resolve<ScheduledTasks>('ScheduledTasks');
scheduledTasks.startAll();
```

## Buenas Prácticas
✅ Usar `@singleton()` para servicios que deben tener una única instancia
✅ Exportar la clase del servicio, no una instancia
✅ Usar `@inject()` para inyectar dependencias en constructores
✅ Registrar todos los servicios en el contenedor central
✅ Resolver servicios desde el contenedor, no instanciarlos directamente

## Errores Comunes
❌ Usar `new Service()` en lugar de resolver desde el contenedor
❌ Olvidar el decorador `@singleton()` en servicios
❌ No importar `reflect-metadata` al inicio de la aplicación
❌ Exportar instancias en lugar de clases (`export default new Service()`)
❌ Olvidar registrar un servicio en el contenedor
