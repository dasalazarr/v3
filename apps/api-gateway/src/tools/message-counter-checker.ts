import { z } from 'zod';
import { ChatBuffer } from '@running-coach/vector-memory';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

// Schema for the tool parameters
const MessageCounterSchema = z.object({
  // No additional parameters needed - userId is passed separately
});

export function createMessageCounterTool(
  database: Database,
  chatBuffer: ChatBuffer,
  messageLimit: number
) {
  return {
    name: 'check_message_counter',
    description: 'Check the user\'s current message count and remaining free messages. Use this when users ask about their message limit, usage, or premium status.',
    parameters: MessageCounterSchema,
    execute: async (params: { userId: string }) => {
      try {
        console.log(`🔍 [MESSAGE_COUNTER_TOOL] Checking counter for user: ${params.userId}`);

        // Get user from database
        const [user] = await database.query
          .select()
          .from(users)
          .where(eq(users.id, params.userId))
          .limit(1);

        if (!user) {
          return {
            error: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado en el sistema.'
          };
        }

        // If user is premium, they have unlimited messages
        if (user.subscriptionStatus === 'premium') {
          return {
            subscriptionStatus: 'premium',
            messageCount: 'unlimited',
            remainingMessages: 'unlimited',
            message: user.preferredLanguage === 'es' 
              ? '¡Tienes Andes Premium! 💎 Disfruta de mensajes ilimitados y todas las funciones avanzadas.'
              : 'You have Andes Premium! 💎 Enjoy unlimited messages and all advanced features.'
          };
        }

        // Generate Redis key for message counter
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth();
        const redisKey = `msg:${params.userId}:${year}-${month + 1}`;

        // Get current message count from Redis
        const currentCount = await chatBuffer.getKeyValue(redisKey);
        const remainingMessages = Math.max(0, messageLimit - currentCount);

        console.log(`📊 [MESSAGE_COUNTER_TOOL] User ${params.userId}: ${currentCount}/${messageLimit} messages used`);

        // Determine status and message
        let status: 'normal' | 'warning' | 'critical' | 'limit_reached';
        let message: string;

        if (currentCount >= messageLimit) {
          status = 'limit_reached';
          message = user.preferredLanguage === 'es'
            ? '🚨 Has alcanzado tu límite de mensajes gratuitos este mes. ¡Actualiza a Andes Premium para mensajes ilimitados!'
            : '🚨 You\'ve reached your free message limit this month. Upgrade to Andes Premium for unlimited messages!';
        } else if (currentCount >= messageLimit - 2) {
          status = 'critical';
          message = user.preferredLanguage === 'es'
            ? `⚠️ Te ${remainingMessages === 1 ? 'queda' : 'quedan'} ${remainingMessages} mensaje${remainingMessages === 1 ? '' : 's'} gratuito${remainingMessages === 1 ? '' : 's'} este mes. Considera actualizar a Premium para acceso ilimitado.`
            : `⚠️ You have ${remainingMessages} free message${remainingMessages === 1 ? '' : 's'} remaining this month. Consider upgrading to Premium for unlimited access.`;
        } else if (currentCount >= messageLimit - 5) {
          status = 'warning';
          message = user.preferredLanguage === 'es'
            ? `📊 Has usado ${currentCount} de ${messageLimit} mensajes gratuitos este mes. Te quedan ${remainingMessages} mensajes.`
            : `📊 You've used ${currentCount} of ${messageLimit} free messages this month. ${remainingMessages} messages remaining.`;
        } else {
          status = 'normal';
          message = user.preferredLanguage === 'es'
            ? `📊 Has usado ${currentCount} de ${messageLimit} mensajes gratuitos este mes. ¡Tienes ${remainingMessages} mensajes restantes!`
            : `📊 You've used ${currentCount} of ${messageLimit} free messages this month. You have ${remainingMessages} messages remaining!`;
        }

        return {
          subscriptionStatus: user.subscriptionStatus,
          messageCount: currentCount,
          messageLimit: messageLimit,
          remainingMessages: remainingMessages,
          status: status,
          message: message,
          resetDate: user.preferredLanguage === 'es' 
            ? 'Los mensajes se resetean el primer día de cada mes'
            : 'Messages reset on the first day of each month'
        };

      } catch (error) {
        console.error('❌ [MESSAGE_COUNTER_TOOL] Error checking message counter:', error);
        return {
          error: 'SYSTEM_ERROR',
          message: 'Error al consultar el contador de mensajes. Por favor intenta de nuevo.'
        };
      }
    }
  };
}
