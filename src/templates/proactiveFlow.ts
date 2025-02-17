import { addKeyword, EVENTS } from "@builderbot/bot";
import { AppointmentController } from '../services/appointments.controller';
import { ReminderService } from "../services/reminderService";
import { Logger } from "../utils/logger";

interface Reminder {
    userId: string;
    message: string;
    scheduledTime: Date;
    type: 'APPOINTMENT' | 'TASK' | 'GENERAL';
}

class ProactiveManager {
    private static instance: ProactiveManager;
    private reminderService: ReminderService;
    private logger: Logger;
    private checkInterval: number = 60000; // Check every minute

    private constructor() {
        this.reminderService = new ReminderService();
        this.logger = new Logger('ProactiveManager');
        this.startReminderCheck();
    }

    public static getInstance(): ProactiveManager {
        if (!ProactiveManager.instance) {
            ProactiveManager.instance = new ProactiveManager();
        }
        return ProactiveManager.instance;
    }

    private async startReminderCheck(): Promise<void> {
        setInterval(async () => {
            try {
                await this.checkAndSendReminders();
            } catch (error) {
                this.logger.error('Error checking reminders:', error);
            }
        }, this.checkInterval);
    }

    private async checkAndSendReminders(): Promise<void> {
        const currentTime = new Date();
        const pendingReminders = await this.reminderService.getPendingReminders(currentTime);
        
        for (const reminder of pendingReminders) {
            try {
                await this.sendReminder(reminder);
                await this.reminderService.markReminderAsSent(reminder.id);
            } catch (error) {
                this.logger.error(`Error sending reminder ${reminder.id}:`, error);
            }
        }
    }

    private async sendReminder(reminder: Reminder): Promise<void> {
        // Implementación específica para enviar el recordatorio según el tipo
        switch (reminder.type) {
            case 'APPOINTMENT':
                await this.sendAppointmentReminder(reminder);
                break;
            case 'TASK':
                await this.sendTaskReminder(reminder);
                break;
            case 'GENERAL':
                await this.sendGeneralReminder(reminder);
                break;
        }
    }

    public async scheduleReminder(reminder: Reminder): Promise<void> {
        try {
            await this.reminderService.createReminder(reminder);
            this.logger.info(`Reminder scheduled for user ${reminder.userId}`);
        } catch (error) {
            this.logger.error('Error scheduling reminder:', error);
            throw error;
        }
    }

    private async sendAppointmentReminder(reminder: Reminder): Promise<void> {
        // Implementación específica para recordatorios de citas
    }

    private async sendTaskReminder(reminder: Reminder): Promise<void> {
        // Implementación específica para recordatorios de tareas
    }

    private async sendGeneralReminder(reminder: Reminder): Promise<void> {
        // Implementación específica para recordatorios generales
    }
}

class AppointmentReminder {
    private static instance: AppointmentReminder;
    private checkInterval: number = 5 * 60 * 1000; // Revisar cada 5 minutos
    private bot: any; // Referencia al bot de WhatsApp
    private appointmentController: AppointmentController;

    private constructor() {
        this.appointmentController = new AppointmentController();
        this.startReminderCheck();
    }

    public static getInstance(): AppointmentReminder {
        if (!AppointmentReminder.instance) {
            AppointmentReminder.instance = new AppointmentReminder();
        }
        return AppointmentReminder.instance;
    }

    public setBot(bot: any) {
        this.bot = bot;
    }

    private async startReminderCheck(): Promise<void> {
        setInterval(async () => {
            try {
                await this.checkAndSendReminders();
            } catch (error) {
                console.error('Error checking reminders:', error);
            }
        }, this.checkInterval);
    }

    private async checkAndSendReminders(): Promise<void> {
        if (!this.bot) return;

        const now = new Date();
        const upcoming = await this.appointmentController.getUpcomingAppointments();

        for (const appointment of upcoming) {
            const appointmentTime = new Date(appointment.startTime);
            const timeDiff = appointmentTime.getTime() - now.getTime();
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));

            // Enviar recordatorio 24 horas antes
            if (minutesDiff <= 1440 && minutesDiff >= 1435) {
                await this.sendReminder(appointment, '24 horas');
            }
            // Enviar recordatorio 1 hora antes
            else if (minutesDiff <= 60 && minutesDiff >= 55) {
                await this.sendReminder(appointment, '1 hora');
            }
            // Enviar recordatorio 15 minutos antes
            else if (minutesDiff <= 15 && minutesDiff >= 10) {
                await this.sendReminder(appointment, '15 minutos');
            }
        }
    }

    private async sendReminder(appointment: any, timeFrame: string): Promise<void> {
        if (!this.bot) return;

        const message = `🔔 *Recordatorio de Cita*\n\n` +
            `Tu cita está programada para dentro de ${timeFrame}:\n\n` +
            `📅 Fecha: ${new Date(appointment.startTime).toLocaleDateString()}\n` +
            `⏰ Hora: ${new Date(appointment.startTime).toLocaleTimeString()}\n` +
            `📝 Motivo: ${appointment.description}\n\n` +
            `Si necesitas cancelar o reprogramar tu cita, por favor responde con "cancelar cita".`;

        try {
            await this.bot.sendMessage(appointment.userId, message);
            console.log(`Reminder sent to ${appointment.userId} for appointment at ${appointment.startTime}`);
        } catch (error) {
            console.error(`Error sending reminder to ${appointment.userId}:`, error);
        }
    }
}

// Flujo para manejar las respuestas a los recordatorios
const proactiveFlow = addKeyword(['recordatorio', 'recordar'])
    .addAction(async (ctx, ctxFn) => {
        // Aquí puedes agregar lógica adicional si necesitas manejar
        // respuestas específicas a los recordatorios
    });

export { proactiveFlow, ProactiveManager, AppointmentReminder };
