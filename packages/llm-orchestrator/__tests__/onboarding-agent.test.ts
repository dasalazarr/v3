import { vi, expect, describe, it, beforeEach } from 'vitest';
import { OnboardingAgent } from '../src/agents/OnboardingAgent';
import { AgentContext, AgentTool } from '../src/agents/BaseAgent';
import { users } from '@running-coach/database'; // Import for type inference

describe('OnboardingAgent', () => {
  let mockLlmClient: any;
  let mockDatabase: any;
  let mockI18nService: any;
  let onboardingAgent: OnboardingAgent;
  let mockContext: AgentContext;

  beforeEach(() => {
    mockLlmClient = {
      generateResponse: vi.fn(),
    };
    mockDatabase = {
      query: {
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(),
          })),
        })),
      },
    };
    mockI18nService = {
      t: vi.fn((key: string) => key), // Simple mock: returns the key itself
    };

    const mockTools: AgentTool = {
      llmClient: mockLlmClient,
      database: mockDatabase,
      i18nService: mockI18nService,
      logger: { info: vi.fn(), error: vi.fn() } as any,
      vectorMemory: {} as any, // Not used in OnboardingAgent directly
      planGenerator: {} as any, // Not used in OnboardingAgent directly
      whatsappClient: {} as any, // Not used in OnboardingAgent directly
      analyticsService: {} as any, // Not used in OnboardingAgent directly
      chatBuffer: {} as any, // Not used in OnboardingAgent directly
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
      } as typeof users.$inferSelect, // Cast to user profile type
      conversationHistory: [],
      channel: 'whatsapp',
    };
  });

  it('should send a welcome message and ask the first question on first contact', async () => {
    mockContext.userMessage = 'Hola';
    mockLlmClient.generateResponse.mockResolvedValueOnce('¡Bienvenido! ¿Cuál es tu meta de carrera? (5k, 10k, media maraton, maraton)');

    const response = await onboardingAgent.run(mockContext);

    expect(response).toBe('¡Bienvenido! ¿Cuál es tu meta de carrera? (5k, 10k, media maraton, maraton)');
    expect(mockLlmClient.generateResponse).toHaveBeenCalledWith(
      expect.stringContaining('Your task is to provide a warm welcome message to the user and then ask the first onboarding question: "onboarding:goal_race_prompt"'),
      undefined,
      "none"
    );
    expect(mockDatabase.query.update).toHaveBeenCalledWith(users);
    expect(mockDatabase.query.update().set).toHaveBeenCalledWith({ currentOnboardingQuestion: 'goalRace' });
  });

  it('should process a valid answer and ask the next question', async () => {
    mockContext.userMessage = '5k';
    mockContext.userProfile!.currentOnboardingQuestion = 'goalRace';
    mockLlmClient.generateResponse.mockResolvedValueOnce('Excelente. ¿Cuál es tu nivel de experiencia? (principiante, intermedio, avanzado)');

    const response = await onboardingAgent.run(mockContext);

    expect(response).toBe('Excelente. ¿Cuál es tu nivel de experiencia? (principiante, intermedio, avanzado)');
    expect(mockDatabase.query.update).toHaveBeenCalledWith(users);
    expect(mockDatabase.query.update().set).toHaveBeenCalledWith({
      goalRace: '5k',
      currentOnboardingQuestion: null,
    });
    expect(mockLlmClient.generateResponse).toHaveBeenCalledWith(
      expect.stringContaining('Your task is to ask the user the following onboarding question:'),
      undefined,
      "none"
    );
    expect(mockDatabase.query.update().set).toHaveBeenCalledWith({ currentOnboardingQuestion: 'experienceLevel' });
  });

  it('should re-ask the question if the answer is invalid', async () => {
    mockContext.userMessage = 'respuesta invalida';
    mockContext.userProfile!.currentOnboardingQuestion = 'goalRace';
    mockLlmClient.generateResponse.mockResolvedValueOnce('Lo siento, no entendí tu meta de carrera. Por favor, elige entre 5k, 10k, media maraton o maraton.');

    const response = await onboardingAgent.run(mockContext);

    expect(response).toBe('Lo siento, no entendí tu meta de carrera. Por favor, elige entre 5k, 10k, media maraton o maraton.');
    expect(mockDatabase.query.update().set).not.toHaveBeenCalledWith(expect.objectContaining({ goalRace: expect.any(String) })); // Should not update goalRace
    expect(mockLlmClient.generateResponse).toHaveBeenCalledWith(
      expect.stringContaining('The user's last response was invalid for the question: "onboarding:goal_race_prompt".'),
      undefined,
      "none"
    );
    expect(mockDatabase.query.update().set).not.toHaveBeenCalledWith({ currentOnboardingQuestion: null }); // Should not clear current question
  });

  it('should complete onboarding and provide a micro-milestone when all questions are answered', async () => {
    mockContext.userMessage = '30'; // Age
    mockContext.userProfile = {
      ...mockContext.userProfile,
      goalRace: '5k',
      experienceLevel: 'beginner',
      weeklyFrequency: 3, // Assuming this is the last question
      currentOnboardingQuestion: 'age',
    } as typeof users.$inferSelect;
    mockLlmClient.generateResponse.mockResolvedValueOnce('¡Felicidades! Tu meta de 5K es perfecta. ¡En 3 semanas, correrás 5K sin parar! ¿Listo para empezar?');

    const response = await onboardingAgent.run(mockContext);

    expect(response).toBe('¡Felicidades! Tu meta de 5K es perfecta. ¡En 3 semanas, correrás 5K sin parar! ¿Listo para empezar?');
    expect(mockDatabase.query.update).toHaveBeenCalledWith(users);
    expect(mockDatabase.query.update().set).toHaveBeenCalledWith({
      age: 30,
      onboardingCompleted: true,
      currentOnboardingQuestion: null,
      updatedAt: expect.any(Date)
    });
    expect(mockLlmClient.generateResponse).toHaveBeenCalledWith(
      expect.stringContaining('The user has just completed their onboarding. Their goal race is 5k, experience level is beginner, and they want to run 3 times a week.'),
      undefined,
      "none"
    );
  });

  it('should not run if onboarding is already completed', async () => {
    mockContext.userProfile!.onboardingCompleted = true;
    mockContext.userMessage = 'Cualquier mensaje';

    const response = await onboardingAgent.run(mockContext);

    expect(response).toBe('');
    expect(mockLlmClient.generateResponse).not.toHaveBeenCalled();
    expect(mockDatabase.query.update).not.toHaveBeenCalled();
  });
});
