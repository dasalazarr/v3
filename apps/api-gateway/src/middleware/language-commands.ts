import { Database } from '@running-coach/database';
import { users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { i18nService } from '@running-coach/shared';

/**
 * Middleware para detectar y procesar comandos de cambio de idioma
 */
export class LanguageCommandMiddleware {
  constructor(private database: Database) {}

  /**
   * Procesa el mensaje y detecta comandos de cambio de idioma
   * @param message Mensaje del usuario
   * @param userId ID del usuario
   * @returns Objeto con información sobre si el mensaje es un comando y el resultado del procesamiento
   */
  async process(message: string, userId: string): Promise<{ 
    isCommand: boolean; 
    processedMessage?: string;
    newLanguage?: 'en' | 'es';
  }> {
    const trimmedMessage = message.trim().toLowerCase();
    
    // Detectar comandos de cambio de idioma
    if (trimmedMessage === '/english' || trimmedMessage === '/en' || trimmedMessage === '/inglés' || trimmedMessage === '/ingles') {
      await this.changeLanguage(userId, 'en');
      return { 
        isCommand: true,
        newLanguage: 'en',
        processedMessage: i18nService.t('language_changed', 'en')
      };
    }
    
    if (trimmedMessage === '/español' || trimmedMessage === '/espanol' || trimmedMessage === '/es' || trimmedMessage === '/spanish') {
      await this.changeLanguage(userId, 'es');
      return { 
        isCommand: true,
        newLanguage: 'es',
        processedMessage: i18nService.t('language_changed', 'es')
      };
    }
    
    // No es un comando de idioma
    return { isCommand: false };
  }

  /**
   * Cambia el idioma preferido del usuario en la base de datos
   * @param userId ID del usuario
   * @param language Nuevo idioma ('en' o 'es')
   */
  private async changeLanguage(userId: string, language: 'en' | 'es'): Promise<void> {
    try {
      // Actualizar el idioma en la base de datos
      await this.database.query.update(users)
        .set({ preferredLanguage: language })
        .where(eq(users.id, userId));
      
      console.log(`🌐 Language changed for user ${userId} to ${language}`);
    } catch (error) {
      console.error(`❌ Error changing language for user ${userId}:`, error);
      throw error;
    }
  }
}
