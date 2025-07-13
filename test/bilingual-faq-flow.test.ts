import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { container } from 'tsyringe';
import { LanguageDetector, I18nService, TemplateEngine } from '@running-coach/shared';
import { AIService } from '../archive/src/services/aiservices';

// Mock de la base de datos
const mockDatabase = {
  schema: {
    users: {
      phoneNumber: 'phoneNumber',
      id: 'id',
      preferredLanguage: 'preferredLanguage'
    }
  },
  query: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue([{ id: 'user123', preferredLanguage: 'es' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis()
  }
};

// Mock del servicio de IA
const mockAIService = {
  getGeneralResponse: vi.fn().mockImplementation((message, userId, userName, options) => {
    const lang = options?.preferredLanguage || 'es';
    if (lang === 'es') {
      return Promise.resolve('Esta es una respuesta en español');
    } else {
      return Promise.resolve('This is a response in English');
    }
  })
};

describe('Flujo FAQ Bilingüe', () => {
  let languageDetector: LanguageDetector;
  let i18nService: I18nService;
  let templateEngine: TemplateEngine;
  let flowDynamic: any;
  let state: any;
  let endFlow: any;

  beforeEach(() => {
    // Configurar detectores de idioma y servicios de i18n
    languageDetector = new LanguageDetector();
    i18nService = new I18nService();
    
    // Cargar traducciones de prueba
    i18nService.loadLocales({
      en: {
        common: {
          welcome: 'Welcome to your personal running assistant!',
          farewell: 'See you soon! Keep running and improving.',
          fallback: {
            message: 'Sorry, I had trouble processing your message.'
          },
          error: 'Sorry, an error has occurred. Please try again.'
        }
      },
      es: {
        common: {
          welcome: '¡Bienvenido a tu asistente personal de running!',
          farewell: '¡Hasta pronto! Sigue corriendo y mejorando.',
          fallback: {
            message: 'Lo siento, tuve un problema procesando tu mensaje.'
          },
          error: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.'
        }
      }
    });
    
    templateEngine = new TemplateEngine(i18nService);
    
    // Registrar servicios en el contenedor
    container.registerInstance('LanguageDetector', languageDetector);
    container.registerInstance('I18nService', i18nService);
    container.registerInstance('TemplateEngine', templateEngine);
    container.registerInstance('Database', mockDatabase);
    container.registerInstance('AIService', mockAIService);
    
    // Mock de las funciones del flujo
    flowDynamic = vi.fn();
    state = { update: vi.fn() };
    endFlow = vi.fn(message => message);
    
    // Limpiar mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('debería detectar correctamente el idioma español', () => {
    const message = 'Hola, ¿cómo estás? Corrí 5km ayer';
    const detectedLang = languageDetector.detect(message);
    expect(detectedLang).toBe('es');
  });

  it('debería detectar correctamente el idioma inglés', () => {
    const message = 'Hi, how are you? I ran 5km yesterday';
    const detectedLang = languageDetector.detect(message);
    expect(detectedLang).toBe('en');
  });

  it('debería obtener traducciones correctas según el idioma', () => {
    const spanishWelcome = i18nService.t('welcome', 'es');
    const englishWelcome = i18nService.t('welcome', 'en');
    
    expect(spanishWelcome).toBe('¡Bienvenido a tu asistente personal de running!');
    expect(englishWelcome).toBe('Welcome to your personal running assistant!');
  });

  it('debería procesar plantillas con el idioma correcto', () => {
    const spanishTemplate = templateEngine.process({
      template: 't(welcome)',
      data: {},
      language: 'es'
    });
    
    const englishTemplate = templateEngine.process({
      template: 't(welcome)',
      data: {},
      language: 'en'
    });
    
    expect(spanishTemplate).toBe('¡Bienvenido a tu asistente personal de running!');
    expect(englishTemplate).toBe('Welcome to your personal running assistant!');
  });

  it('debería simular el flujo FAQ con un mensaje en español', async () => {
    // Contexto del mensaje
    const ctx = {
      from: '123456789',
      body: 'Hola, ¿cuál es el mejor entrenamiento para un maratón?',
      pushName: 'Juan'
    };
    
    // Obtener servicios del contenedor
    const languageDetector = container.resolve('LanguageDetector');
    const i18nService = container.resolve('I18nService');
    const aiService = container.resolve('AIService');
    
    // Detectar idioma
    const detectedLang = languageDetector.detect(ctx.body);
    expect(detectedLang).toBe('es');
    
    // Simular llamada al servicio de IA
    const aiResponse = await aiService.getGeneralResponse(
      ctx.body,
      ctx.from,
      ctx.pushName,
      { preferredLanguage: detectedLang }
    );
    
    expect(aiResponse).toBe('Esta es una respuesta en español');
  });

  it('debería simular el flujo FAQ con un mensaje en inglés', async () => {
    // Contexto del mensaje
    const ctx = {
      from: '123456789',
      body: 'Hi, what is the best training for a marathon?',
      pushName: 'John'
    };
    
    // Obtener servicios del contenedor
    const languageDetector = container.resolve('LanguageDetector');
    const i18nService = container.resolve('I18nService');
    const aiService = container.resolve('AIService');
    
    // Detectar idioma
    const detectedLang = languageDetector.detect(ctx.body);
    expect(detectedLang).toBe('en');
    
    // Simular llamada al servicio de IA
    const aiResponse = await aiService.getGeneralResponse(
      ctx.body,
      ctx.from,
      ctx.pushName,
      { preferredLanguage: detectedLang }
    );
    
    expect(aiResponse).toBe('This is a response in English');
  });

  it('debería manejar el comando de salida con el mensaje localizado', () => {
    // Probar en español
    const exitMessageEs = i18nService.t('farewell', 'es');
    expect(exitMessageEs).toBe('¡Hasta pronto! Sigue corriendo y mejorando.');
    
    // Probar en inglés
    const exitMessageEn = i18nService.t('farewell', 'en');
    expect(exitMessageEn).toBe('See you soon! Keep running and improving.');
  });
});
