import { injectable, inject } from 'tsyringe';
import { AIAgent } from '@running-coach/llm-orchestrator';
import { LanguageDetector, TemplateEngine } from '@running-coach/shared';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { addKeyword, EVENTS } from '@builderbot/bot';

/**
 * Flujo para manejar preguntas frecuentes (FAQ) y conversaciones generales.
 * Versión actualizada con soporte bilingüe.
 */
@injectable()
export class FaqFlow {
  constructor(
    @inject('AIAgent') private aiAgent: AIAgent,
    @inject('LanguageDetector') private languageDetector: LanguageDetector,
    @inject('TemplateEngine') private templateEngine: TemplateEngine,
    @inject('Database') private database: Database
  ) {}

  /**
   * Procesa un mensaje general del usuario y genera una respuesta
   */
  async processMessage(ctx: any): Promise<string | null> {
    // Ignora mensajes vacíos para evitar procesamientos innecesarios
    if (!ctx.body || ctx.body.trim().length === 0) {
      console.log('[FaqFlow] Mensaje vacío ignorado.');
      return null;
    }

    // Detectar idioma del mensaje o buscar preferencia del usuario
    let userLanguage: 'en' | 'es' = 'es'; // Default a español
    
    try {
      // Intentar obtener el idioma preferido del usuario desde la base de datos
      const userRecord = await this.database.query.select()
        .from(users)
        .where(eq(users.phoneNumber, ctx.from))
        .limit(1);
      
      if (userRecord.length > 0 && userRecord[0].preferredLanguage) {
        userLanguage = userRecord[0].preferredLanguage as 'en' | 'es';
        console.log(`🌐 [FaqFlow] Usando idioma preferido del usuario: ${userLanguage}`);
      } else if (process.env.LANG_DETECTION === 'true') {
        // Si no hay preferencia guardada, detectar del mensaje
        const detectedLang = this.languageDetector.detect(ctx.body);
        userLanguage = (detectedLang === 'en' || detectedLang === 'es') ? detectedLang : 'es';
        console.log(`🌐 [FaqFlow] Idioma detectado: ${userLanguage}`);
      }
    } catch (error) {
      console.error('Error al obtener idioma del usuario:', error);
      // Fallback a detección simple
      if (process.env.LANG_DETECTION === 'true') {
        const detectedLang = this.languageDetector.detect(ctx.body);
        userLanguage = (detectedLang === 'en' || detectedLang === 'es') ? detectedLang : 'es';
      }
    }

    // Permite al usuario salir del flujo de preguntas con comando "terminar"
    if (ctx.body.toLowerCase().includes('terminar')) {
      return this.templateEngine.process("t(farewell)", {}, userLanguage);
    }

    try {
      const userName = ctx.pushName || (userLanguage === 'en' ? 'athlete' : 'atleta');
      console.log(`[FaqFlow] Procesando pregunta general de ${userName} (${ctx.from}): "${ctx.body}"`);
      
      // Procesa el mensaje con el agente de IA
      const response = await this.aiAgent.processMessage({
        userId: ctx.from,
        message: ctx.body,
        userProfile: { 
          id: ctx.from, 
          phoneNumber: ctx.from,
          preferredLanguage: userLanguage,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      if (response && response.content) {
        return response.content;
      } else {
        // Maneja el caso en que la IA no devuelva una respuesta usando el motor de plantillas
        return this.templateEngine.process("t(error)", {}, userLanguage);
      }
    } catch (error) {
      console.error('❗ Error crítico en faqFlow:', error);
      // Informa al usuario del error de una manera amigable usando el motor de plantillas
      return this.templateEngine.process("t(fallback.message)", {}, userLanguage);
    }
  }

  /**
   * Crea un flujo compatible con BuilderBot para manejar preguntas generales
   * @returns Flujo de BuilderBot
   */
  createFlow() {
    return addKeyword(EVENTS.ACTION)
      .addAction(async (ctx, { flowDynamic }) => {
        const response = await this.processMessage(ctx);
        if (response) {
          await flowDynamic(response);
        }
      });
  }
}
