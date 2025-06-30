import { container } from 'tsyringe';
import SheetsService from '../services/sheetsServices';
import ScheduledTasks from '../services/scheduledTasks';
import AIService from '../services/aiservices';
import { AppointmentService } from '../services/appointments.service';
import { AppointmentController } from '../services/appointments.controller';
import { TranslationService } from '../services/translationService';
import { LanguageDetector, I18nService, TemplateEngine } from '@running-coach/shared';
import { FaqFlow } from '../apps/api-gateway/src/flows/faq-flow';

// Registramos los servicios en el contenedor
container.registerSingleton('SheetsService', SheetsService);
container.registerSingleton('ScheduledTasks', ScheduledTasks);
container.registerSingleton('AIService', AIService);
container.registerSingleton('AppointmentService', AppointmentService);
container.registerSingleton('AppointmentController', AppointmentController);
container.registerSingleton('TranslationService', TranslationService);
// Instanciamos los servicios de idioma
const languageDetector = new LanguageDetector();
const i18nService = new I18nService();
const templateEngine = new TemplateEngine(i18nService);

// Registramos los servicios de idioma en el contenedor
container.registerInstance('LanguageDetector', languageDetector);
container.registerInstance('I18nService', i18nService);
container.registerInstance('TemplateEngine', templateEngine);

// Exportamos el contenedor para uso en la aplicación
export default container;
