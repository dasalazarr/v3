import express from 'express';
import fetch from 'node-fetch';
import { users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import logger from './services/logger-service.js';

/**
 * Send a WhatsApp message using the Meta API
 */
async function sendWhatsAppMessage(to: string, message: string, config: any) {
  try {
    const url = `https://graph.facebook.com/v17.0/${config.NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`\u274c Failed to send WhatsApp message: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    logger.info(`\u2705 WhatsApp message sent successfully:`, result);
    return true;
  } catch (error) {
    logger.error('\u274c Error sending WhatsApp message:', error);
    return false;
  }
}

/**
 * Configure WhatsApp webhook endpoints
 */
export function setupWhatsAppWebhook(app: express.Application, services: any, config: any) {
  // Verification endpoint
  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    if (mode && token) {
      if (mode === 'subscribe' && token === config.VERIFY_TOKEN) {
        logger.info('\u2705 WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } else {
        logger.warn('\u274c WEBHOOK_VERIFICATION_FAILED: Token mismatch');
        res.sendStatus(403);
      }
    } else {
      logger.warn('\u274c WEBHOOK_VERIFICATION_FAILED: Missing parameters');
      res.sendStatus(400);
    }
  });

  // Message handler endpoint
  app.post('/webhook', async (req, res) => {
    // Always acknowledge the request
    res.status(200).send('OK');

    try {
      const data = req.body;
      logger.info('\ud83d\udcf5 Received WhatsApp webhook:', JSON.stringify(data, null, 2));

      if (data && data.object === 'whatsapp_business_account') {
        logger.info('\ud83d\udcf5 Processing WhatsApp webhook data...');

        if (data.entry && Array.isArray(data.entry)) {
          for (const entry of data.entry) {
            if (entry.changes && Array.isArray(entry.changes)) {
              for (const change of entry.changes) {
                if (change.value && change.value.messages && Array.isArray(change.value.messages)) {
                  logger.info(`\ud83d\udcde Found ${change.value.messages.length} messages to process`);

                  for (const message of change.value.messages) {
                    try {
                      if (message.type === 'text' && message.text && message.text.body) {
                        const phone = message.from;
                        const messageText = message.text.body;

                        logger.info(`\ud83d\udce9 Processing message from ${phone}: ${messageText}`);

                        let [user] = await services.database.query
                          .select()
                          .from(users)
                          .where(eq(users.phoneNumber, phone))
                          .limit(1);
                        if (!user) {
                          [user] = await services.database.query
                            .insert(users)
                            .values({ phoneNumber: phone, preferredLanguage: 'es' })
                            .returning();
                        }

                        const allowance = await services.freemiumService.checkMessageAllowance(user);
                        if (!allowance.allowed) {
                          const upsell = user.preferredLanguage === 'en'
                            ? `You reached the free message limit. Upgrade here: ${allowance.link}`
                            : `Has alcanzado tu \u00edmite gratuito. Mejora aqu\u00ed: ${allowance.link}`;
                          await sendWhatsAppMessage(phone, upsell, config);
                          continue;
                        }

                        const aiResponse = await services.headCoach.handleMessage({
                          userId: user.id,
                          conversationHistory: [],
                          userMessage: messageText,
                          channel: 'whatsapp'
                        });

                        if (aiResponse && aiResponse.length > 0) {
                          await sendWhatsAppMessage(phone, aiResponse, config);
                          logger.info(`\u2705 Sent AI response to ${phone}: ${aiResponse}`);
                        }
                      }
                    } catch (messageError) {
                      logger.error('\u274c Error processing individual message:', messageError);
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('\u274c Error processing webhook:', error);
    }
  });
}

