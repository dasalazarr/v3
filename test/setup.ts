import { beforeAll, afterAll, beforeEach } from 'vitest';
import 'reflect-metadata';

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.QDRANT_URL = 'http://localhost:6333';
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.DEEPSEEK_API_KEY = 'test-key';
});

// Clean up after tests
afterAll(() => {
  // Cleanup any test resources
});

// Reset state before each test
beforeEach(() => {
  // Reset any global state
});