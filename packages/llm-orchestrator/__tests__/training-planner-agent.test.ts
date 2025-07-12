
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainingPlannerAgent } from '../src/agents/TrainingPlannerAgent.js';
import { LLMClient } from '../src/llm-client.js';
import { PlanBuilder } from '@running-coach/plan-generator';
import { VectorMemory } from '@running-coach/vector-memory';
import { Database } from '@running-coach/database';
import { ChatBuffer } from '@running-coach/vector-memory';

// Mock dependencies
vi.mock('../src/llm-client.js');
vi.mock('@running-coach/plan-generator');
vi.mock('@running-coach/vector-memory');
vi.mock('@running-coach/database');

describe('TrainingPlannerAgent', () => {
  let agent: TrainingPlannerAgent;
  let mockLLMClient: LLMClient;
  let mockPlanBuilder: typeof PlanBuilder;
  let mockVectorMemory: VectorMemory;
  let mockDatabase: Database;
  let mockChatBuffer: ChatBuffer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLLMClient = new LLMClient();
    mockPlanBuilder = PlanBuilder;
    mockVectorMemory = new VectorMemory({} as any, {} as any, {} as any);
    mockDatabase = Database.getInstance({} as any);
    mockChatBuffer = ChatBuffer.getInstance({} as any);

    // Mock LLMClient response
    (mockLLMClient.generateResponse as vi.Mock).mockResolvedValue("Here is your personalized training plan explanation.");

    // Mock PlanBuilder.generatePlan
    (mockPlanBuilder.generatePlan as vi.Mock).mockReturnValue({
      id: 'plan-123',
      userId: 'user-123',
      targetRace: '5k',
      totalWeeks: 12,
    });

    agent = new TrainingPlannerAgent({
      llmClient: mockLLMClient,
      planBuilder: mockPlanBuilder,
      vectorMemory: mockVectorMemory,
      database: mockDatabase,
      chatBuffer: mockChatBuffer,
    });
  });

  it('should generate a training plan and explain it using LLM', async () => {
    const context = {
      userId: 'user-123',
      userMessage: 'I want a 5k plan.',
      conversationHistory: [],
    };

    const response = await agent.run(context);

    expect(mockPlanBuilder.generatePlan).toHaveBeenCalledTimes(1);
    expect(mockPlanBuilder.generatePlan).toHaveBeenCalledWith({
      userId: 'user-123',
      currentVDOT: 40,
      targetRace: '5k',
      weeklyFrequency: 3,
      experienceLevel: 'beginner',
    });

    expect(mockLLMClient.generateResponse).toHaveBeenCalledTimes(1);
    expect(mockLLMClient.generateResponse.mock.calls[0][0]).toContain('Here is the generated plan');
    expect(response).toBe('Here is your personalized training plan explanation.');
  });

  it('should handle errors during plan generation', async () => {
    (mockPlanBuilder.generatePlan as vi.Mock).mockImplementation(() => {
      throw new Error('Plan generation failed');
    });

    const context = {
      userId: 'user-123',
      userMessage: 'I want a plan.',
      conversationHistory: [],
    };

    const response = await agent.run(context);

    expect(response).toBe('Lo siento, no pude generar un plan de entrenamiento en este momento. Por favor, inténtalo de nuevo más tarde.');
    expect(mockLLMClient.generateResponse).not.toHaveBeenCalled();
  });

  it('should handle errors during LLM response generation', async () => {
    (mockLLMClient.generateResponse as vi.Mock).mockRejectedValue(new Error('LLM error'));

    const context = {
      userId: 'user-123',
      userMessage: 'I want a plan.',
      conversationHistory: [],
    };

    const response = await agent.run(context);

    expect(response).toBe('Lo siento, no pude generar un plan de entrenamiento en este momento. Por favor, inténtalo de nuevo más tarde.');
  });
});
