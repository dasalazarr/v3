import { vi, expect, describe, it, beforeEach } from 'vitest';
import { OnboardingAgent } from '../src/agents/OnboardingAgent';
import { AgentContext, AgentTool } from '../src/agents/BaseAgent';
import { users } from '@running-coach/database';

describe('OnboardingAgent Integration Tests - Complete Flow', () => {
  let mockLlmClient: any;
  let mockDatabase: any;
  let mockI18nService: any;
  let setMock: any;
  let onboardingAgent: OnboardingAgent;
  let mockContext: AgentContext;

  beforeEach(() => {
    mockLlmClient = {
      generateResponse: vi.fn(),
    };
    
    const whereMock = vi.fn().mockResolvedValue(undefined);
    setMock = vi.fn(() => ({ where: whereMock }));
    mockDatabase = {
      query: {
        update: vi.fn(() => ({ set: setMock })),
      },
    } as any;
    
    mockI18nService = {
      t: vi.fn((key: string, lang: string) => {
        const translations: Record<string, Record<string, string>> = {
          'onboarding:onboarding_goal_prompt': {
            'es': '¿Cuál es tu meta principal? ¿Estás entrenando para tu primera carrera, buscando mejorar tu tiempo, o solo quieres mantenerte en forma?',
            'en': 'What\'s your main goal? Are you training for your first race, looking to improve your time, or just want to stay fit?'
          },
          'onboarding:goal_race_prompt': {
            'es': '¿Cuál es tu carrera objetivo? ¿Un 5K, 10K, Media Maratón (21K), Maratón (42K) o Ultra?',
            'en': 'What\'s your goal race? A 5K, 10K, Half Marathon (21K), Marathon (42K), or Ultra?'
          },
          'onboarding:experience_level_prompt': {
            'es': '¿Eres principiante, intermedio o avanzado?',
            'en': 'Are you a beginner, intermediate, or advanced?'
          },
          'onboarding:weekly_frequency_prompt': {
            'es': '¿Cuántas veces a la semana te gustaría correr?',
            'en': 'How many times a week would you like to run?'
          },
          'onboarding:age_prompt': {
            'es': '¿Cuál es tu edad?',
            'en': 'What\'s your age?'
          },
          'onboarding:gender_prompt': {
            'es': '¿Cuál es tu género?',
            'en': 'What\'s your gender?'
          },
          'onboarding:injury_history_prompt': {
            'es': '¿Tienes alguna lesión o molestia actual que deba saber?',
            'en': 'Do you have any current injuries or discomfort I should know about?'
          }
        };
        return translations[key]?.[lang] || key;
      }),
    };

    const mockTools: AgentTool = {
      llmClient: mockLlmClient,
      database: mockDatabase,
      i18nService: mockI18nService,
      logger: { info: vi.fn(), error: vi.fn() } as any,
      vectorMemory: {} as any,
      planGenerator: {} as any,
      whatsappClient: {} as any,
      analyticsService: {} as any,
      chatBuffer: {} as any,
    };

    onboardingAgent = new OnboardingAgent(mockTools);

    mockContext = {
      userId: 'test-user-id',
      userMessage: '',
      userProfile: {
        id: 'test-user-id',
        phoneNumber: '1234567890',
        onboardingCompleted: false,
        preferredLanguage: 'es',
        currentOnboardingQuestion: null,
      } as typeof users.$inferSelect,
      conversationHistory: [],
      channel: 'whatsapp',
    };
  });

  it('should complete full onboarding flow in 7 interactions', async () => {
    // Interaction 1: Welcome + Onboarding Goal
    mockContext.userMessage = 'Hola';
    mockContext.conversationHistory = [];
    mockLlmClient.generateResponse.mockResolvedValueOnce('¡Bienvenido! ¿Cuál es tu meta principal? ¿Estás entrenando para tu primera carrera, buscando mejorar tu tiempo, o solo quieres mantenerte en forma?');
    
    let response = await onboardingAgent.run(mockContext);
    expect(response).toContain('meta principal');
    expect(setMock).toHaveBeenCalledWith({ currentOnboardingQuestion: 'onboardingGoal' });

    // Interaction 2: Answer Onboarding Goal -> Goal Race
    mockContext.userMessage = 'primera carrera';
    mockContext.userProfile!.currentOnboardingQuestion = 'onboardingGoal';
    mockContext.conversationHistory.push({ role: 'assistant', content: response }, { role: 'user', content: mockContext.userMessage });
    mockLlmClient.generateResponse.mockResolvedValueOnce('¡Genial! ¿Cuál es tu carrera objetivo? ¿Un 5K, 10K, Media Maratón (21K), Maratón (42K) o Ultra?');
    
    response = await onboardingAgent.run(mockContext);
    expect(response).toContain('carrera objetivo');
    expect(setMock).toHaveBeenCalledWith({
      onboardingGoal: 'first_race', 
      currentOnboardingQuestion: null 
    });
    expect(setMock).toHaveBeenCalledWith({ currentOnboardingQuestion: 'goalRace' });

    // Interaction 3: Answer Goal Race -> Experience Level
    mockContext.userMessage = '5k';
    mockContext.userProfile!.currentOnboardingQuestion = 'goalRace';
    mockContext.userProfile!.onboardingGoal = 'first_race';
    mockContext.conversationHistory.push({ role: 'assistant', content: response }, { role: 'user', content: mockContext.userMessage });
    mockLlmClient.generateResponse.mockResolvedValueOnce('Perfecto, 5K es una excelente meta. ¿Eres principiante, intermedio o avanzado?');
    
    response = await onboardingAgent.run(mockContext);
    expect(response).toContain('principiante');
    expect(setMock).toHaveBeenCalledWith({
      goalRace: '5k', 
      currentOnboardingQuestion: null 
    });
    expect(setMock).toHaveBeenCalledWith({ currentOnboardingQuestion: 'experienceLevel' });

    // Interaction 4: Answer Experience Level -> Weekly Frequency
    mockContext.userMessage = 'principiante';
    mockContext.userProfile!.currentOnboardingQuestion = 'experienceLevel';
    mockContext.userProfile!.goalRace = '5k';
    mockContext.conversationHistory.push({ role: 'assistant', content: response }, { role: 'user', content: mockContext.userMessage });
    mockLlmClient.generateResponse.mockResolvedValueOnce('Genial. ¿Cuántas veces a la semana te gustaría correr? (ej. 3, 4, 5)');
    
    response = await onboardingAgent.run(mockContext);
    expect(response).toContain('semana');
    expect(setMock).toHaveBeenCalledWith({
      experienceLevel: 'beginner', 
      currentOnboardingQuestion: null 
    });
    expect(setMock).toHaveBeenCalledWith({ currentOnboardingQuestion: 'weeklyFrequency' });

    // Interaction 5: Answer Weekly Frequency -> Age
    mockContext.userMessage = '3';
    mockContext.userProfile!.currentOnboardingQuestion = 'weeklyFrequency';
    mockContext.userProfile!.experienceLevel = 'beginner';
    mockContext.conversationHistory.push({ role: 'assistant', content: response }, { role: 'user', content: mockContext.userMessage });
    mockLlmClient.generateResponse.mockResolvedValueOnce('Excelente. Para personalizar aún más, ¿cuál es tu edad?');
    
    response = await onboardingAgent.run(mockContext);
    expect(response).toContain('edad');
    expect(setMock).toHaveBeenCalledWith({
      weeklyFrequency: 3, 
      currentOnboardingQuestion: null 
    });
    expect(setMock).toHaveBeenCalledWith({ currentOnboardingQuestion: 'age' });

    // Interaction 6: Answer Age -> Gender
    mockContext.userMessage = '30';
    mockContext.userProfile!.currentOnboardingQuestion = 'age';
    mockContext.userProfile!.weeklyFrequency = 3;
    mockContext.conversationHistory.push({ role: 'assistant', content: response }, { role: 'user', content: mockContext.userMessage });
    mockLlmClient.generateResponse.mockResolvedValueOnce('Y finalmente, ¿cuál es tu género? (Hombre/Mujer/Otro)');
    
    response = await onboardingAgent.run(mockContext);
    expect(response).toContain('género');
    expect(setMock).toHaveBeenCalledWith({
      age: 30,
      currentOnboardingQuestion: null
    });
    expect(setMock).toHaveBeenCalledWith({ currentOnboardingQuestion: 'gender' });

    // Interaction 7: Answer Gender -> Injury History
    mockContext.userMessage = 'hombre';
    mockContext.userProfile!.currentOnboardingQuestion = 'gender';
    mockContext.userProfile!.age = 30;
    mockContext.conversationHistory.push({ role: 'assistant', content: response }, { role: 'user', content: mockContext.userMessage });
    mockLlmClient.generateResponse.mockResolvedValueOnce('¿Tienes alguna lesión o molestia actual que deba saber? (Sí/No)');
    
    response = await onboardingAgent.run(mockContext);
    expect(response).toContain('lesión');
    expect(setMock).toHaveBeenCalledWith({
      gender: 'male',
      currentOnboardingQuestion: null
    });
    expect(setMock).toHaveBeenCalledWith({ currentOnboardingQuestion: 'injuryHistory' });

    // Interaction 8: Answer Injury History -> Complete Onboarding
    mockContext.userMessage = 'no';
    mockContext.userProfile!.currentOnboardingQuestion = 'injuryHistory';
    mockContext.userProfile!.gender = 'male';
    mockContext.conversationHistory.push({ role: 'assistant', content: response }, { role: 'user', content: mockContext.userMessage });
    mockLlmClient.generateResponse.mockResolvedValueOnce('¡Felicidades! Tu perfil está completo. ¡Estás listo para comenzar!');
    
    response = await onboardingAgent.run(mockContext);
    expect(response).toContain('Felicidades');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ injuryHistory: 'no' }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ onboardingCompleted: true }));

    // Verify all fields are set
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ onboardingGoal: 'first_race' }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ goalRace: '5k' }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ experienceLevel: 'beginner' }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ weeklyFrequency: 3 }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ age: 30 }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ gender: 'male' }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ injuryHistory: 'no' }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ onboardingCompleted: true }));
  });

  it('should handle invalid responses and re-ask questions without counting as extra interactions', async () => {
    mockContext.userMessage = 'invalid goal';
    mockContext.userProfile!.currentOnboardingQuestion = 'onboardingGoal';
    mockLlmClient.generateResponse.mockResolvedValueOnce('Lo siento, no entendí tu meta. Por favor, elige entre \'primera carrera\', \'mejorar tiempo\', o \'mantenerse en forma\'.');
    
    const response = await onboardingAgent.run(mockContext);
    expect(response).toContain('no entendí');
    // Should not update the database with invalid data
    expect(setMock).not.toHaveBeenCalledWith(expect.objectContaining({ onboardingGoal: 'invalid goal' }));
    // Should keep the current question for retry
    expect(setMock).not.toHaveBeenCalledWith({ currentOnboardingQuestion: null });
  });

  it('should skip age, gender, and injury history questions if user already has them in profile', async () => {
    // Set up context where all required questions are answered except weeklyFrequency
    mockContext.userMessage = '4';
    mockContext.userProfile = {
      ...mockContext.userProfile!,
      onboardingGoal: 'stay_fit',
      goalRace: '10k',
      experienceLevel: 'intermediate',
      age: 25, // User already has age
      gender: 'female', // User already has gender
      injuryHistory: 'none', // User already has injury history
      currentOnboardingQuestion: 'weeklyFrequency'
    };
    mockContext.conversationHistory = [{ role: 'user', content: 'prev' }];
    
    mockLlmClient.generateResponse.mockResolvedValueOnce('¡Perfecto! Has completado tu perfil. ¡Estás listo para comenzar tu entrenamiento hacia los 10K!');
    
    const response = await onboardingAgent.run(mockContext);
    
    // Should complete onboarding without asking age, gender, or injury history
    expect(response).toContain('completado');
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ weeklyFrequency: 4 }));
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ onboardingCompleted: true }));
  });

  it('should validate number ranges correctly', async () => {
    const agent = onboardingAgent as any; // Access private method for testing
    
    // Test valid weekly frequency
    const validFrequency = agent.validateAnswer('3', {
      validation: { type: 'number', range: { min: 1, max: 7 } }
    });
    expect(validFrequency.isValid).toBe(true);
    expect(validFrequency.parsedValue).toBe(3);

    // Test invalid weekly frequency (too high)
    const invalidFrequency = agent.validateAnswer('10', {
      validation: { type: 'number', range: { min: 1, max: 7 } }
    });
    expect(invalidFrequency.isValid).toBe(false);

    // Test valid age
    const validAge = agent.validateAnswer('25', {
      validation: { type: 'number', range: { min: 16, max: 80 } }
    });
    expect(validAge.isValid).toBe(true);
    expect(validAge.parsedValue).toBe(25);
  });

  it('should validate choice options correctly', async () => {
    const agent = onboardingAgent as any;
    
    // Test valid onboarding goal choices
    let validChoice = agent.validateAnswer('primera carrera', {
      validation: { 
        type: 'choice', 
        options: {
          'first_race': ['primera carrera', 'correr por primera vez'],
          'improve_time': ['mejorar tiempo', 'ser mas rapido'],
          'stay_fit': ['mantenerme en forma', 'salud', 'bienestar'],
        }
      }
    });
    expect(validChoice.isValid).toBe(true);
    expect(validChoice.parsedValue).toBe('first_race');

    // Test valid goal race choices
    validChoice = agent.validateAnswer('5k', {
      validation: { 
        type: 'choice', 
        options: {
          '5k': ['5k', '5k', 'cinco k'],
          '10k': ['10k', 'diez k'],
          'half_marathon': ['21k', 'media maraton', 'media', 'half'],
          'marathon': ['42k', 'maraton'],
          'ultra': ['ultra', 'ultramaraton'],
        }
      }
    });
    expect(validChoice.isValid).toBe(true);
    expect(validChoice.parsedValue).toBe('5k');

    validChoice = agent.validateAnswer('media maraton', {
      validation: { 
        type: 'choice', 
        options: {
          '5k': ['5k', '5k', 'cinco k'],
          '10k': ['10k', 'diez k'],
          'half_marathon': ['21k', 'media maraton', 'media', 'half'],
          'marathon': ['42k', 'maraton'],
          'ultra': ['ultra', 'ultramaraton'],
        }
      }
    });
    expect(validChoice.isValid).toBe(true);
    expect(validChoice.parsedValue).toBe('half_marathon');

    // Test valid gender choices
    validChoice = agent.validateAnswer('mujer', {
      validation: { 
        type: 'choice', 
        options: {
          male: ['masculino', 'hombre'],
          female: ['femenino', 'mujer'],
          other: ['otro', 'no binario'],
        }
      }
    });
    expect(validChoice.isValid).toBe(true);
    expect(validChoice.parsedValue).toBe('female');

    // Test invalid choice
    const invalidChoice = agent.validateAnswer('not a choice', {
      validation: { 
        type: 'choice', 
        options: {
          '5k': ['5k', '5k', 'cinco k'],
        }
      }
    });
    expect(invalidChoice.isValid).toBe(false);
  });

  it('should validate text input correctly', async () => {
    const agent = onboardingAgent as any;

    // Test valid text input for injury history
    const validText = agent.validateAnswer('I have a knee injury', {
      validation: { type: 'text' }
    });
    expect(validText.isValid).toBe(true);
    expect(validText.parsedValue).toBe('I have a knee injury');

    const emptyText = agent.validateAnswer('', {
      validation: { type: 'text' }
    });
    expect(emptyText.isValid).toBe(true);
    expect(emptyText.parsedValue).toBe('');
  });
});