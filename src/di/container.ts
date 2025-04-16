import { container } from 'tsyringe';
import SheetsService from '../services/sheetsServices';
import ScheduledTasks from '../services/scheduledTasks';
import AIService from '../services/aiservices';
import { AppointmentService } from '../services/appointments.service';
import { AppointmentController } from '../services/appointments.controller';
import { PatientsService } from '../services/patients.service';
import { PatientsController } from '../services/patients.controller';

// Registramos los servicios en el contenedor
container.registerSingleton('SheetsService', SheetsService);
container.registerSingleton('ScheduledTasks', ScheduledTasks);
container.registerSingleton('AIService', AIService);
container.registerSingleton('AppointmentService', AppointmentService);
container.registerSingleton('AppointmentController', AppointmentController);
container.registerSingleton('PatientsService', PatientsService);
container.registerSingleton('PatientsController', PatientsController);

// Exportamos el contenedor para uso en la aplicación
export default container;
