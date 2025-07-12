
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMClient } from '../src/llm-client.js';
import OpenAI from 'openai';

// Mock the OpenAI library
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe('LLMClient', () => {
  let llmClient: LLMClient;
  let mockCreateCompletion: vi.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    llmClient = new LLMClient();
    mockCreateCompletion = (OpenAI as unknown as vi.Mock).mock.results[0].value.chat.completions.create;
  });

  it('should generate a response from the LLM', async () => {
    const mockResponse = {
      choices: [{
        message: { content: 'This is a test response.' },
      }],
    };
    mockCreateCompletion.mockResolvedValue(mockResponse);

    const prompt = 'Hello, AI!';
    const response = await llmClient.generateResponse(prompt);

    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
    expect(mockCreateCompletion).toHaveBeenCalledWith({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    expect(response).toBe('This is a test response.');
  });

  it('should handle errors during LLM response generation', async () => {
    mockCreateCompletion.mockRejectedValue(new Error('LLM API error'));

    const prompt = 'Generate an error.';
    const response = await llmClient.generateResponse(prompt);

    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
    expect(response).toBe('Lo siento, tuve un problema al procesar tu solicitud. Por favor, inténtalo de nuevo.');
  });

  it('should return empty string if LLM response content is null', async () => {
    const mockResponse = {
      choices: [{
        message: { content: null },
      }],
    };
    mockCreateCompletion.mockResolvedValue(mockResponse);

    const prompt = 'Test null response.';
    const response = await llmClient.generateResponse(prompt);

    expect(response).toBe('');
  });
});
