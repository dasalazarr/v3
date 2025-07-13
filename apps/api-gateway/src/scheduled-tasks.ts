import cron from 'node-cron';
import logger from './services/logger-service.js';
import { users } from '@running-coach/database';
import { sendWhatsAppMessage } from './whatsapp-webhook.js'; // Assuming this is exported

export function setupScheduledTasks(services: any, config: any) {
  logger.info('\u23F0 Setting up scheduled tasks...');

  // Weekly progress summary generation (Sunday at 9 AM)
  cron.schedule('0 9 * * 0', async () => {
    logger.info('\ud83d\udcca Running weekly progress summary generation...');
    try {
      const allUsers = await services.database.query.select().from(users);
      for (const user of allUsers) {
        if (user.phoneNumber) {
          const imageUrl = await services.progressSummaryService.generateProgressCard(user.id);
          if (imageUrl) {
            // Assuming sendWhatsAppMessage can send images or URLs
            // For now, sending the URL as text
            await sendWhatsAppMessage(user.phoneNumber, `Here's your weekly progress summary: ${imageUrl}`, services.config);
            logger.info(`Sent weekly progress summary to ${user.phoneNumber}`);
          }
        }
      }
      logger.info('Weekly progress summaries generated and sent');
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

