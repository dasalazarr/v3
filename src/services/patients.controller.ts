import { singleton, inject } from 'tsyringe';
import { PatientsService } from './patients.service';

@singleton()
export class PatientsController {
  constructor(
    @inject("PatientsService") private patientsService: PatientsService
  ) {}

  /**
   * Create a new patient
   */
  async createPatient(
    name: string,
    phone: string,
    email?: string,
    notes?: string
  ) {
    try {
      const result = await this.patientsService.createPatient({
        name,
        phone,
        email,
        notes
      });

      return {
        success: true,
        message: 'Paciente registrado exitosamente',
        patientId: result.patientId
      };
    } catch (error) {
      console.error('Error creating patient:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al registrar paciente'
      };
    }
  }

  /**
   * List all patients
   */
  async listPatients() {
    try {
      const patients = await this.patientsService.listPatients();
      return {
        success: true,
        patients
      };
    } catch (error) {
      console.error('Error listing patients:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al listar pacientes'
      };
    }
  }
}
