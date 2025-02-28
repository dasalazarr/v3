import { injectable, inject } from "tsyringe";
import sheetsServices, { SheetsService } from "./sheetsServices";
import budgetService, { BudgetAlert, AnomalyData } from "./budgetService";

/**
 * Interface for alert records stored in the database
 */
export interface AlertRecord {
  id?: string;
  phoneNumber: string;
  category: string;
  type: 'threshold' | 'exceeded' | 'anomaly';
  message: string;
  timestamp: Date;
  read: boolean;
}

/**
 * Service for managing and sending alerts to users
 */
@injectable()
class AlertService {
  constructor(
    @inject("SheetsService") private sheetManager: SheetsService = sheetsServices
  ) {}

  /**
   * Initialize the Alerts sheet if it doesn't exist
   */
  async initializeAlertSheet(): Promise<void> {
    try {
      const sheetExists = await this.sheetManager.sheetExists("Alerts");
      
      if (!sheetExists) {
        await this.sheetManager.createSheet("Alerts", [
          "ID", "PhoneNumber", "Category", "Type", "Message", "Timestamp", "Read"
        ]);
        console.log("Hoja de Alertas creada exitosamente");
      }
    } catch (error) {
      console.error("Error al inicializar hoja de alertas:", error);
      throw error;
    }
  }

  /**
   * Save an alert to the database
   */
  async saveAlert(alert: AlertRecord): Promise<void> {
    try {
      // Ensure the sheet exists
      await this.initializeAlertSheet();
      
      // Generate a unique ID for the alert
      const id = `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Format the data for the sheet
      const alertData = [
        id,
        alert.phoneNumber,
        alert.category,
        alert.type,
        alert.message,
        alert.timestamp.toLocaleDateString("es-ES"),
        alert.read.toString()
      ];
      
      // Add the alert to the sheet
      await this.sheetManager.appendRow("Alerts", alertData);
      
    } catch (error) {
      console.error("Error al guardar alerta:", error);
      throw error;
    }
  }

  /**
   * Get all alerts for a user
   */
  async getAlerts(phoneNumber: string, onlyUnread: boolean = false): Promise<AlertRecord[]> {
    try {
      // Ensure the sheet exists
      await this.initializeAlertSheet();
      
      // Get all data from the sheet
      const data = await this.sheetManager.getSheetData("Alerts");
      
      // Filter alerts for the specified user
      const alerts: AlertRecord[] = [];
      
      data.forEach(row => {
        if (row[1] === phoneNumber && (!onlyUnread || row[6] === "false")) {
          alerts.push({
            id: row[0],
            phoneNumber: row[1],
            category: row[2],
            type: row[3] as 'threshold' | 'exceeded' | 'anomaly',
            message: row[4],
            timestamp: this.parseDate(row[5]),
            read: row[6] === "true"
          });
        }
      });
      
      // Sort alerts by timestamp (newest first)
      alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return alerts;
    } catch (error) {
      console.error("Error al obtener alertas:", error);
      return [];
    }
  }

  /**
   * Mark an alert as read
   */
  async markAlertAsRead(alertId: string): Promise<boolean> {
    try {
      // Ensure the sheet exists
      await this.initializeAlertSheet();
      
      // Get all data from the sheet
      const data = await this.sheetManager.getSheetData("Alerts");
      
      // Find the alert by ID
      const rowIndex = data.findIndex(row => row[0] === alertId);
      
      if (rowIndex === -1) {
        return false; // Alert not found
      }
      
      // Update the Read status to true
      await this.sheetManager.updateCell("Alerts", rowIndex + 2, 7, "true");
      
      return true;
    } catch (error) {
      console.error("Error al marcar alerta como leída:", error);
      return false;
    }
  }

  /**
   * Process a budget alert and save it
   */
  async processBudgetAlert(alert: BudgetAlert): Promise<void> {
    try {
      // Save the alert to the database
      await this.saveAlert({
        phoneNumber: alert.phoneNumber,
        category: alert.category,
        type: alert.type,
        message: alert.message,
        timestamp: alert.timestamp,
        read: false
      });
      
      // Here you could add code to send the alert via WhatsApp
      // This would depend on your messaging implementation
      console.log(`Alerta enviada a ${alert.phoneNumber}: ${alert.message}`);
      
    } catch (error) {
      console.error("Error al procesar alerta de presupuesto:", error);
    }
  }

  /**
   * Process anomaly alerts
   */
  async processAnomalyAlerts(phoneNumber: string): Promise<void> {
    try {
      // Detect anomalies
      const anomalies = await budgetService.detectAnomalies(phoneNumber);
      
      // Process each anomaly
      for (const anomaly of anomalies) {
        // Generate message for the anomaly
        const message = budgetService.generateAnomalyMessage(anomaly);
        
        // Save the alert
        await this.saveAlert({
          phoneNumber,
          category: anomaly.category,
          type: 'anomaly',
          message,
          timestamp: new Date(),
          read: false
        });
        
        // Here you could add code to send the alert via WhatsApp
        console.log(`Alerta de anomalía enviada a ${phoneNumber}: ${message}`);
      }
      
    } catch (error) {
      console.error("Error al procesar alertas de anomalías:", error);
    }
  }

  /**
   * Check for budget limits when a new expense is added
   */
  async checkBudgetLimitsForExpense(phoneNumber: string, category: string, amount: number): Promise<void> {
    try {
      // Check if the expense exceeds any budget limits
      const alert = await budgetService.checkBudgetLimits(phoneNumber, category, amount);
      
      // If an alert was generated, process it
      if (alert) {
        await this.processBudgetAlert(alert);
      }
      
    } catch (error) {
      console.error("Error al verificar límites de presupuesto para gasto:", error);
    }
  }

  /**
   * Helper method to parse date strings
   */
  private parseDate(dateStr: string): Date {
    try {
      const [day, month, year] = dateStr.split("/").map(Number);
      return new Date(year, month - 1, day);
    } catch {
      return new Date();
    }
  }
}

export default new AlertService();
