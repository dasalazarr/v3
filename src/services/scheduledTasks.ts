import { singleton, inject } from "tsyringe";
import { SheetsService } from "./sheetsServices";

/**
 * Class to handle scheduled tasks for the application
 */
@singleton()
export class ScheduledTasks {
  private anomalyCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(
    @inject("SheetsService") private sheetsService: SheetsService
  ) {}
  
  /**
   * Start all scheduled tasks
   */
  startAll(): void {
    console.log("✅ Tareas programadas iniciadas (solo las no financieras)");
  }
  
  /**
   * Stop all scheduled tasks
   */
  stopAll(): void {
    if (this.anomalyCheckInterval) {
      clearInterval(this.anomalyCheckInterval);
      this.anomalyCheckInterval = null;
    }
    console.log("❌ Tareas programadas detenidas");
  }
}

// Exportamos la clase, no una instancia
export default ScheduledTasks;
