import { injectable, inject } from "tsyringe";
import sheetsServices, { SheetsService } from "./sheetsServices";
import expenseService, { ExpenseService } from "./expenseService";
import { format } from "date-fns";

export interface Budget {
  phoneNumber: string;
  category: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  active: boolean;
}

export interface BudgetStatus {
  category: string;
  budgetAmount: number;
  currentAmount: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface BudgetAlert {
  phoneNumber: string;
  category: string;
  type: 'threshold' | 'exceeded' | 'anomaly';
  currentAmount: number;
  budgetAmount: number;
  percentage: number;
  message: string;
  timestamp: Date;
}

export interface AnomalyData {
  category: string;
  currentAmount: number;
  historicalAverage: number;
  percentageDifference: number;
  comparisonPeriod: number;
}

class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetError';
  }
}

@injectable()
export class BudgetService {
  constructor(
    @inject("SheetsService") private sheetManager: SheetsService = sheetsServices,
    @inject("ExpenseService") private expenseService: ExpenseService
  ) {}

  async initializeBudgetSheet(): Promise<void> {
    try {
      // Verificar si la hoja ya existe
      const sheetExists = await this.sheetManager.sheetExists("Budgets");
      
      if (!sheetExists) {
        // Crear la hoja de presupuestos con encabezados
        await this.sheetManager.createSheet("Budgets", [
          "PhoneNumber",
          "Category",
          "Amount",
          "Period",
          "StartDate",
          "Active"
        ]);
        
        console.log("Hoja de presupuestos creada exitosamente");
      }
    } catch (error) {
      console.error("Error al inicializar hoja de presupuestos:", error);
      throw error;
    }
  }

  async setBudget(budget: Budget): Promise<void> {
    try {
      // Validaciones básicas
      if (!budget.phoneNumber || budget.phoneNumber.trim().length === 0) {
        throw new BudgetError('El número de teléfono es requerido');
      }
      
      if (!budget.category || budget.category.trim().length === 0) {
        throw new BudgetError('La categoría es requerida');
      }
      
      if (typeof budget.amount !== 'number' || budget.amount <= 0) {
        throw new BudgetError('El monto debe ser un número positivo');
      }
      
      if (!['daily', 'weekly', 'monthly'].includes(budget.period)) {
        throw new BudgetError('El periodo debe ser daily, weekly o monthly');
      }
      
      // Asegurarse de que la hoja exista
      await this.initializeBudgetSheet();
      
      // Verificar si ya existe un presupuesto para esta categoría y usuario
      const existingBudget = await this.getBudget(budget.phoneNumber, budget.category, budget.period);
      
      if (existingBudget) {
        // Actualizar presupuesto existente
        await this.updateBudget(budget);
        return;
      }
      
      // Crear un nuevo presupuesto
      const formattedDate = format(budget.startDate || new Date(), "dd/MM/yyyy");
      const row = [
        budget.phoneNumber,
        budget.category,
        budget.amount.toFixed(2),
        budget.period,
        formattedDate,
        budget.active ? "true" : "false"
      ];
      
      await this.sheetManager.appendToSheet("Budgets", row);
    } catch (error) {
      console.error('Error al establecer presupuesto:', error);
      if (error instanceof BudgetError) {
        throw error;
      }
      throw new BudgetError('Error al establecer el presupuesto');
    }
  }

  async updateBudget(budget: Budget): Promise<void> {
    try {
      const data = await this.sheetManager.getSheetData("Budgets");
      
      // Encontrar el índice del presupuesto a actualizar
      const rowIndex = data.findIndex(row => 
        row[0] === budget.phoneNumber && 
        row[1] === budget.category &&
        row[3] === budget.period
      );
      
      if (rowIndex === -1) {
        throw new BudgetError('Presupuesto no encontrado');
      }
      
      // Actualizar los datos
      const formattedDate = format(budget.startDate || new Date(), "dd/MM/yyyy");
      const updatedRow = [
        budget.phoneNumber,
        budget.category,
        budget.amount.toFixed(2),
        budget.period,
        formattedDate,
        budget.active ? "true" : "false"
      ];
      
      // Actualizar en Google Sheets
      await this.sheetManager.updateSheetRow("Budgets", rowIndex + 1, updatedRow);
      
    } catch (error) {
      console.error('Error al actualizar presupuesto:', error);
      if (error instanceof BudgetError) {
        throw error;
      }
      throw new BudgetError('Error al actualizar el presupuesto');
    }
  }

  async deleteBudget(phoneNumber: string, category: string, period: string): Promise<void> {
    try {
      const data = await this.sheetManager.getSheetData("Budgets");
      
      // Encontrar el índice del presupuesto a eliminar
      const rowIndex = data.findIndex(row => 
        row[0] === phoneNumber && 
        row[1] === category &&
        row[3] === period
      );
      
      if (rowIndex === -1) {
        throw new BudgetError('Presupuesto no encontrado');
      }
      
      // Marcar como inactivo en lugar de eliminar físicamente
      const updatedRow = [...data[rowIndex]];
      updatedRow[5] = "false";
      
      // Actualizar en Google Sheets
      await this.sheetManager.updateSheetRow("Budgets", rowIndex + 1, updatedRow);
      
    } catch (error) {
      console.error('Error al eliminar presupuesto:', error);
      if (error instanceof BudgetError) {
        throw error;
      }
      throw new BudgetError('Error al eliminar el presupuesto');
    }
  }

  async getBudget(phoneNumber: string, category: string, period: string): Promise<Budget | null> {
    try {
      // Asegurarse de que la hoja exista
      await this.initializeBudgetSheet();
      
      const data = await this.sheetManager.getSheetData("Budgets");
      
      const budgetRow = data.find(row => 
        row[0] === phoneNumber && 
        row[1] === category &&
        row[3] === period &&
        row[5] === "true"
      );
      
      if (!budgetRow) return null;
      
      return {
        phoneNumber: budgetRow[0],
        category: budgetRow[1],
        amount: parseFloat(budgetRow[2]),
        period: budgetRow[3] as 'daily' | 'weekly' | 'monthly',
        startDate: this.parseDate(budgetRow[4]),
        active: budgetRow[5] === "true"
      };
    } catch (error) {
      console.error('Error al obtener presupuesto:', error);
      return null;
    }
  }

  async getBudgets(phoneNumber: string): Promise<Budget[]> {
    try {
      // Asegurarse de que la hoja exista
      await this.initializeBudgetSheet();
      
      const data = await this.sheetManager.getSheetData("Budgets");
      
      const budgets: Budget[] = [];
      
      data.forEach(row => {
        if (row[0] === phoneNumber && row[5] === "true") {
          budgets.push({
            phoneNumber: row[0],
            category: row[1],
            amount: parseFloat(row[2]),
            period: row[3] as 'daily' | 'weekly' | 'monthly',
            startDate: this.parseDate(row[4]),
            active: row[5] === "true"
          });
        }
      });
      
      return budgets;
    } catch (error) {
      console.error('Error al obtener presupuestos:', error);
      return [];
    }
  }

  async getBudgetStatus(phoneNumber: string, category?: string): Promise<BudgetStatus[]> {
    try {
      const budgets = await this.getBudgets(phoneNumber);
      if (budgets.length === 0) return [];
      
      // Filtrar por categoría si se especifica
      const filteredBudgets = category 
        ? budgets.filter(b => b.category === category)
        : budgets;
      
      // Obtener gastos actuales para cada presupuesto
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const expenses = await this.expenseService.getExpensesByCategory(startOfMonth, endOfMonth);
      
      // Calcular el estado de cada presupuesto
      const statuses: BudgetStatus[] = [];
      
      for (const budget of filteredBudgets) {
        if (budget.period !== 'monthly') continue; // Por ahora solo manejamos mensuales
        
        const currentAmount = expenses[budget.category] || 0;
        const percentage = (currentAmount / budget.amount) * 100;
        
        let status: 'ok' | 'warning' | 'exceeded' = 'ok';
        if (percentage >= 100) {
          status = 'exceeded';
        } else if (percentage >= 80) {
          status = 'warning';
        }
        
        statuses.push({
          category: budget.category,
          budgetAmount: budget.amount,
          currentAmount,
          percentage,
          status
        });
      }
      
      return statuses;
    } catch (error) {
      console.error('Error al obtener estado de presupuestos:', error);
      return [];
    }
  }

  async checkBudgetLimits(phoneNumber: string, category: string, amount: number): Promise<BudgetAlert | null> {
    try {
      const budget = await this.getBudget(phoneNumber, category, 'monthly');
      
      if (!budget || !budget.active) {
        return null; // No hay presupuesto configurado para esta categoría
      }
      
      // Obtener el total gastado en esta categoría en el periodo actual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const expenses = await this.expenseService.getExpensesByCategory(startOfMonth, endOfMonth);
      const currentAmount = (expenses[category] || 0) + amount;
      
      // Calcular el porcentaje del presupuesto consumido
      const percentage = (currentAmount / budget.amount) * 100;
      
      // Generar alertas según umbrales
      if (percentage >= 100) {
        return {
          phoneNumber,
          category,
          type: 'exceeded',
          currentAmount,
          budgetAmount: budget.amount,
          percentage,
          message: `🚨 Alerta de presupuesto: Has superado tu presupuesto mensual en la categoría ${category}.\n\nPresupuesto: $${budget.amount.toFixed(2)}\nGastado: $${currentAmount.toFixed(2)}\nExceso: $${(currentAmount - budget.amount).toFixed(2)} (${(percentage - 100).toFixed(0)}% sobre el límite)`,
          timestamp: new Date()
        };
      } else if (percentage >= 80 && percentage < 100) {
        return {
          phoneNumber,
          category,
          type: 'threshold',
          currentAmount,
          budgetAmount: budget.amount,
          percentage,
          message: `⚠️ Alerta de presupuesto: Has alcanzado el ${percentage.toFixed(0)}% de tu presupuesto mensual en la categoría ${category}.\n\nPresupuesto: $${budget.amount.toFixed(2)}\nGastado: $${currentAmount.toFixed(2)}\nRestante: $${(budget.amount - currentAmount).toFixed(2)}`,
          timestamp: new Date()
        };
      }
      
      return null; // No se generó ninguna alerta
    } catch (error) {
      console.error('Error al verificar límites de presupuesto:', error);
      return null;
    }
  }

  async detectAnomalies(phoneNumber: string, months: number = 3): Promise<AnomalyData[]> {
    try {
      // Obtener fecha actual
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Obtener gastos del mes actual
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      const currentExpenses = await this.expenseService.getExpensesByCategory(startOfMonth, endOfMonth);
      
      // Obtener gastos históricos
      const historicalData: Record<string, number[]> = {};
      
      for (let i = 1; i <= months; i++) {
        const pastMonthStart = new Date(currentYear, currentMonth - i, 1);
        const pastMonthEnd = new Date(currentYear, currentMonth - i + 1, 0);
        
        const monthExpenses = await this.expenseService.getExpensesByCategory(pastMonthStart, pastMonthEnd);
        
        // Agregar a datos históricos
        Object.entries(monthExpenses).forEach(([category, amount]) => {
          if (!historicalData[category]) {
            historicalData[category] = [];
          }
          historicalData[category].push(amount);
        });
      }
      
      // Calcular anomalías
      const anomalies: AnomalyData[] = [];
      const significantThreshold = 0.2; // 20%
      
      Object.entries(currentExpenses).forEach(([category, currentAmount]) => {
        // Solo analizar si tenemos datos históricos
        if (historicalData[category] && historicalData[category].length > 0) {
          const historicalValues = historicalData[category];
          const avgAmount = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
          
          // Calcular diferencia porcentual
          const percentageDiff = (currentAmount - avgAmount) / avgAmount;
          
          // Si supera el umbral, considerar anomalía
          if (Math.abs(percentageDiff) >= significantThreshold) {
            anomalies.push({
              category,
              currentAmount,
              historicalAverage: avgAmount,
              percentageDifference: percentageDiff,
              comparisonPeriod: months
            });
          }
        }
      });
      
      return anomalies;
    } catch (error) {
      console.error('Error al detectar anomalías:', error);
      return [];
    }
  }

  generateAnomalyMessage(anomaly: AnomalyData): string {
    const direction = anomaly.percentageDifference > 0 ? "más" : "menos";
    const percentage = Math.abs(Math.round(anomaly.percentageDifference * 100));
    const difference = Math.abs(anomaly.currentAmount - anomaly.historicalAverage).toFixed(2);
    
    return `📊 Análisis de gastos: Este mes has gastado un ${percentage}% ${direction} en ${anomaly.category} que tu promedio de los últimos ${anomaly.comparisonPeriod} meses.\n\nMes actual: $${anomaly.currentAmount.toFixed(2)}\nPromedio anterior: $${anomaly.historicalAverage.toFixed(2)}\nDiferencia: ${anomaly.percentageDifference > 0 ? '+' : '-'}$${difference}`;
  }

  private parseDate(dateStr: string): Date {
    try {
      const [day, month, year] = dateStr.split("/").map(Number);
      return new Date(year, month - 1, day);
    } catch {
      return new Date();
    }
  }
}

export default new BudgetService(sheetsServices, expenseService);
