import { addKeyword } from "@builderbot/bot";
import budgetService from "../services/budgetService";
import alertService from "../services/alertService";

// Flow para configurar un nuevo presupuesto
export const budgetFlow = addKeyword(['presupuesto', 'presupuestos', 'límite', 'limite', 'alerta'])
  .addAnswer('¡Hola! Vamos a configurar un presupuesto para tus gastos. 📊', { delay: 1000 })
  .addAnswer('¿Para qué categoría quieres establecer un presupuesto? Por ejemplo: Alimentación, Transporte, Entretenimiento, etc.', 
    { capture: true },
    async (ctx, { flowDynamic, fallBack, state }) => {
      try {
        // Guardar la categoría en el estado
        state.update({ category: ctx.body });
        
        await flowDynamic(`Has seleccionado la categoría: *${ctx.body}*`);
      } catch (error) {
        console.error('Error al procesar la categoría:', error);
        return fallBack('Lo siento, hubo un error. Por favor, intenta de nuevo.');
      }
    }
  )
  .addAnswer('¿Cuál es el monto máximo que quieres gastar en esta categoría mensualmente?', 
    { capture: true },
    async (ctx, { flowDynamic, fallBack, state }) => {
      try {
        // Validar que el monto sea un número
        const amount = parseFloat(ctx.body.replace(/[^\d.]/g, ''));
        
        if (isNaN(amount) || amount <= 0) {
          return fallBack('Por favor, ingresa un monto válido (solo números).');
        }
        
        // Guardar el monto en el estado
        state.update({ amount });
        
        await flowDynamic(`Has establecido un presupuesto de *$${amount.toFixed(2)}* para *${state.get('category')}*`);
      } catch (error) {
        console.error('Error al procesar el monto:', error);
        return fallBack('Lo siento, hubo un error. Por favor, intenta de nuevo.');
      }
    }
  )
  .addAnswer('¿Quieres recibir alertas cuando superes el 80% y el 100% de este presupuesto?',
    { buttons: [{ body: 'Sí' }, { body: 'No' }] },
    async (ctx, { flowDynamic, state }) => {
      try {
        const wantAlerts = ctx.body.toLowerCase() === 'sí' || ctx.body.toLowerCase() === 'si';
        state.update({ wantAlerts });
        
        if (wantAlerts) {
          await flowDynamic('¡Perfecto! Te enviaré alertas cuando estés cerca de alcanzar tu límite.');
        } else {
          await flowDynamic('De acuerdo, no te enviaré alertas para este presupuesto.');
        }
      } catch (error) {
        console.error('Error al procesar la opción de alertas:', error);
      }
    }
  )
  .addAction(async (ctx, { flowDynamic, state }) => {
    try {
      const { category, amount, wantAlerts } = state.getMyState();
      
      // Crear el presupuesto
      await budgetService.setBudget({
        phoneNumber: ctx.from,
        category,
        amount,
        period: 'monthly',
        startDate: new Date(),
        active: true
      });
      
      await flowDynamic([
        '✅ ¡Presupuesto configurado exitosamente!',
        `📊 Categoría: *${category}*`,
        `💰 Monto mensual: *$${amount.toFixed(2)}*`,
        `🔔 Alertas: *${wantAlerts ? 'Activadas' : 'Desactivadas'}*`,
        '',
        'Te avisaré cuando estés cerca de alcanzar tu límite de gasto.'
      ].join('\n'));
    } catch (error) {
      console.error('Error al guardar el presupuesto:', error);
      await flowDynamic('Lo siento, hubo un error al guardar tu presupuesto. Por favor, intenta nuevamente.');
    }
  });

// Flow para consultar presupuestos
export const checkBudgetFlow = addKeyword(['ver presupuesto', 'consultar presupuesto', 'mis presupuestos', 'estado presupuesto'])
  .addAction(async (ctx, { flowDynamic }) => {
    try {
      const budgetStatus = await budgetService.getBudgetStatus(ctx.from);
      
      if (budgetStatus.length === 0) {
        return await flowDynamic('No tienes presupuestos configurados. Puedes crear uno usando el comando "presupuesto".');
      }
      
      let message = '📊 *Estado de tus presupuestos:*\n\n';
      
      budgetStatus.forEach(status => {
        const emoji = status.status === 'exceeded' ? '🚨' : 
                      status.status === 'warning' ? '⚠️' : '✅';
                      
        message += `${emoji} *${status.category}*\n`;
        message += `Presupuesto: $${status.budgetAmount.toFixed(2)}\n`;
        message += `Gastado: $${status.currentAmount.toFixed(2)} (${status.percentage.toFixed(0)}%)\n`;
        message += `Restante: $${(status.budgetAmount - status.currentAmount).toFixed(2)}\n\n`;
      });
      
      await flowDynamic(message);
    } catch (error) {
      console.error('Error al consultar presupuestos:', error);
      await flowDynamic('Lo siento, hubo un error al consultar tus presupuestos. Por favor, intenta nuevamente.');
    }
  });

// Flow para eliminar un presupuesto
export const deleteBudgetFlow = addKeyword(['eliminar presupuesto', 'borrar presupuesto', 'quitar presupuesto'])
  .addAnswer('¿Para qué categoría quieres eliminar el presupuesto?', 
    { capture: true },
    async (ctx, { flowDynamic, fallBack }) => {
      try {
        const category = ctx.body;
        const budget = await budgetService.getBudget(ctx.from, category, 'monthly');
        
        if (!budget) {
          return await flowDynamic(`No tienes un presupuesto configurado para la categoría *${category}*. Verifica el nombre e intenta nuevamente.`);
        }
        
        await budgetService.deleteBudget(ctx.from, category, 'monthly');
        
        await flowDynamic(`✅ El presupuesto para *${category}* ha sido eliminado exitosamente.`);
      } catch (error) {
        console.error('Error al eliminar presupuesto:', error);
        await flowDynamic('Lo siento, hubo un error al eliminar el presupuesto. Por favor, intenta nuevamente.');
      }
    }
  );

// Flow para ver alertas
export const alertsFlow = addKeyword(['alertas', 'ver alertas', 'mis alertas'])
  .addAction(async (ctx, { flowDynamic }) => {
    try {
      const alerts = await alertService.getAlerts(ctx.from);
      
      if (alerts.length === 0) {
        return await flowDynamic('No tienes alertas pendientes. ¡Todo está en orden! 👍');
      }
      
      let message = '🔔 *Tus alertas:*\n\n';
      
      // Mostrar solo las 5 alertas más recientes
      const recentAlerts = alerts.slice(0, 5);
      
      recentAlerts.forEach((alert, index) => {
        const date = alert.timestamp.toLocaleDateString('es-ES');
        const emoji = alert.type === 'exceeded' ? '🚨' : 
                      alert.type === 'threshold' ? '⚠️' : '📊';
                      
        message += `${emoji} *Alerta ${index + 1} (${date}):*\n`;
        message += `${alert.message}\n\n`;
        
        // Marcar la alerta como leída
        alertService.markAlertAsRead(alert.id || '');
      });
      
      if (alerts.length > 5) {
        message += `_...y ${alerts.length - 5} alertas más._\n`;
      }
      
      await flowDynamic(message);
    } catch (error) {
      console.error('Error al consultar alertas:', error);
      await flowDynamic('Lo siento, hubo un error al consultar tus alertas. Por favor, intenta nuevamente.');
    }
  });
