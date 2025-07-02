import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VectorMemory } from '../vector-memory';

const mockClient = {
  getCollections: vi.fn(),
  createCollection: vi.fn(),
  createPayloadIndex: vi.fn(),
};

vi.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: vi.fn(() => mockClient),
}));

vi.mock('@running-coach/shared', () => ({
  VECTOR_DIMENSION: 1536,
}));

vi.mock('openai', () => ({
  default: class {},
}));

beforeEach(() => {
  // reset singleton between tests
  // @ts-ignore
  VectorMemory.instance = undefined;
  mockClient.getCollections.mockResolvedValue({ collections: [] });
  mockClient.createCollection.mockResolvedValue({});
  mockClient.createPayloadIndex.mockResolvedValue({});
});

describe('VectorMemory.initialize', () => {
  it('creates payload index for userId', async () => {
    const vm = VectorMemory.getInstance(
      { url: 'http://localhost:6333', collectionName: 'test' },
      { apiKey: 'test-key' }
    );
    await vm.initialize();
    expect(mockClient.createPayloadIndex).toHaveBeenCalledWith('test', {
      field_name: 'userId',
      field_schema: 'uuid',
      wait: true,
    });
  });
});
