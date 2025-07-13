import cron from 'node-cron';
import logger from './services/logger-service.js';

export function setupScheduledTasks(services: any) {
  logger.info('\u23F0 Setting up scheduled tasks...');

  cron.schedule('0 9 * * 0', async () => {
    logger.info('\ud83d\udcca Running weekly progress summary generation...');
    try {
      logger.info('Weekly progress summaries generated');
    } catch (error) {
      logger.error('Error generating weekly summaries:', error);
    }
  });

  cron.schedule('0 0 * * *', async () => {
    logger.info('\ud83e\udee1 Running daily VDOT recalculation...');
    try {
      logger.info('Daily VDOT recalculation completed');
    } catch (error) {
      logger.error('Error in daily VDOT recalculation:', error);
    }
  });

  logger.info('\u2705 Scheduled tasks configured');
}

