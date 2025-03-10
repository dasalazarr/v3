import { singleton, inject } from "tsyringe";
import { SheetsService } from "./sheetsServices";
import { AlertService } from "./alertService";

/**
 * Class to handle scheduled tasks for the application
 */
@singleton()
export class ScheduledTasks {
  private anomalyCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(
    @inject("SheetsService") private sheetsService: SheetsService,
    @inject("AlertService") private alertService: AlertService
  ) {}
  
  /**
   * Start all scheduled tasks
   */
  startAll(): void {
    this.startAnomalyDetection();
    console.log("✅ Tareas programadas iniciadas");
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
  
  /**
   * Start the anomaly detection task
   * Runs daily to check for spending anomalies
   */
  startAnomalyDetection(): void {
    // Check for anomalies once a day (86400000 ms)
    const INTERVAL = 24 * 60 * 60 * 1000;
    
    // Run immediately on startup
    this.checkAnomalies();
    
    // Then schedule for regular intervals
    this.anomalyCheckInterval = setInterval(() => {
      this.checkAnomalies();
    }, INTERVAL);
    
    console.log("✅ Detección de anomalías programada");
  }
  
  /**
   * Check for anomalies for all users
   */
  private async checkAnomalies(): Promise<void> {
    try {
      console.log("🔍 Iniciando detección de anomalías...");
      
      // Get all users
      const users = await this.sheetsService.getAllUsers();
      
      // Process anomalies for each user
      for (const user of users) {
        const phoneNumber = user.phoneNumber;
        
        if (!phoneNumber) continue;
        
        console.log(`Procesando anomalías para usuario: ${phoneNumber}`);
        await this.alertService.processAnomalyAlerts(phoneNumber);
      }
      
      console.log("✅ Detección de anomalías completada");
    } catch (error) {
      console.error("❌ Error en la detección de anomalías:", error);
    }
  }
}

// Exportamos la clase, no una instancia
export default ScheduledTasks;
