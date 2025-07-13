import { singleton, inject } from "tsyringe";
import { SheetsService } from "./sheetsServices";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface Expense {
  date: Date;
  category: string;
  amount: number;
  description: string;
  paymentMethod?: string;
  notes?: string;
}

class ExpenseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpenseError';
  }
}

@singleton()
export class ExpenseService {
  constructor(
    @inject("SheetsService") private sheetManager: SheetsService
  ) {}

  async addExpense(expense: Expense): Promise<void> {
    // Validaciones básicas
    if (!expense.date || !(expense.date instanceof Date)) {
      throw new ExpenseError('La fecha es inválida');
    }

    if (!expense.category || expense.category.trim().length === 0) {
      throw new ExpenseError('La categoría es requerida');
    }

    if (typeof expense.amount !== 'number' || expense.amount <= 0) {
      throw new ExpenseError('El monto debe ser un número positivo');
    }

    if (!expense.description || expense.description.trim().length === 0) {
      throw new ExpenseError('La descripción es requerida');
    }

    try {
      const formattedDate = format(expense.date, "dd/MM/yyyy");
      const row = [
        formattedDate,
        expense.description.trim(),
        expense.category.trim(),
        expense.amount.toFixed(2),
        expense.paymentMethod || "Efectivo", // Default payment method
        expense.notes || ""
      ];

      await this.sheetManager.appendToSheet("Expenses", row);
    } catch (error) {
      console.error('Error al guardar gasto:', error);
      throw new ExpenseError('Error al guardar el gasto. Por favor, intenta nuevamente.');
    }
  }

  async getExpensesByCategory(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    try {
      const expenses = await this.sheetManager.getSheetData("Expenses");
      const categories: Record<string, number> = {};

      expenses.forEach(row => {
        if (!row || row.length < 4) return; // Ignorar filas inválidas
        
        // Row structure: [date, description, category, amount, paymentMethod, notes]
        const dateStr = row[0];
        const category = row[2];
        const amountStr = row[3];
        
        const expenseDate = this.parseDate(dateStr);
        
        if (!expenseDate) return; // Ignorar fechas inválidas
        
        if (this.isDateInRange(expenseDate, startDate, endDate)) {
          const amount = parseFloat(amountStr);
          if (!isNaN(amount)) {
            categories[category] = (categories[category] || 0) + amount;
          }
        }
      });

      return categories;
    } catch (error) {
      console.error('Error al obtener gastos por categoría:', error);
      throw new ExpenseError('Error al obtener el reporte de gastos');
    }
  }

  async getMonthlyExpenses(): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const expenses = await this.sheetManager.getSheetData("Expenses");
      
      return expenses.reduce((total, row) => {
        if (!row || row.length < 4) return total;
        
        // Row structure: [date, description, category, amount, paymentMethod, notes]
        const dateStr = row[0];
        const amountStr = row[3];
        
        const expenseDate = this.parseDate(dateStr);
        
        if (!expenseDate || expenseDate < startOfMonth) return total;
        
        const amount = parseFloat(amountStr);
        return isNaN(amount) ? total : total + amount;
      }, 0);
    } catch (error) {
      console.error('Error al obtener gastos mensuales:', error);
      throw new ExpenseError('Error al calcular el total mensual');
    }
  }

  private parseDate(dateStr: string): Date | null {
    try {
      const [day, month, year] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private isDateInRange(date: Date, startDate?: Date, endDate?: Date): boolean {
    if (!startDate && !endDate) return true;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  }
}

export default ExpenseService;
