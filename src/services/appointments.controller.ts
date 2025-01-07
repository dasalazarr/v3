import { AppointmentService } from './appointments.service';

export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor() {
    this.appointmentService = new AppointmentService();
  }

  /**
   * Schedule a new appointment
   */
  async createAppointment(
    title: string,
    description: string,
    startTime: string,
    endTime: string
  ) {
    try {
      const appointment = {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'confirmed' as const
      };

      const eventId = await this.appointmentService.scheduleAppointment(appointment);
      return {
        success: true,
        message: 'Appointment scheduled successfully',
        eventId
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule appointment'
      };
    }
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(
    eventId: string,
    updates: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      status?: 'confirmed' | 'pending' | 'cancelled';
    }
  ) {
    try {
      const appointment = {
        ...updates,
        startTime: updates.startTime ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
      };

      await this.appointmentService.updateAppointment(eventId, appointment);
      return {
        success: true,
        message: 'Appointment updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update appointment'
      };
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(eventId: string) {
    try {
      await this.appointmentService.cancelAppointment(eventId);
      return {
        success: true,
        message: 'Appointment cancelled successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel appointment'
      };
    }
  }
}
