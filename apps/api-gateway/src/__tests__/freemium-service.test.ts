import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import { FreemiumService } from '../services/freemium-service';
import { ChatBuffer } from '@running-coach/vector-memory';

describe('FreemiumService', () => {
  let chatBufferMock: Mocked<ChatBuffer>;
  let freemiumService: FreemiumService;
  const MESSAGE_LIMIT = 10;
  const PAYWALL_LINK = 'https://gumroad.com';

  beforeEach(() => {
    chatBufferMock = {
      incrementKey: vi.fn(),
    } as any;
    freemiumService = new FreemiumService(chatBufferMock, MESSAGE_LIMIT, 'en', 'es');
  });

  it('should allow messages for active subscription users', async () => {
    const user = { id: 'user-1', subscriptionStatus: 'premium' } as any;
    const result = await freemiumService.checkMessageAllowance(user);
    expect(result.allowed).toBe(true);
    expect(chatBufferMock.incrementKey).not.toHaveBeenCalled();
  });

  it('should allow messages for non-active users under the limit', async () => {
    const user = { id: 'user-2', subscriptionStatus: 'free' } as any;
    chatBufferMock.incrementKey.mockResolvedValue(5);
    const result = await freemiumService.checkMessageAllowance(user);
    expect(result.allowed).toBe(true);
    expect(chatBufferMock.incrementKey).toHaveBeenCalled();
  });

  it('should deny messages for non-active users over the limit', async () => {
    const user = { id: 'user-3', subscriptionStatus: 'free' } as any;
    chatBufferMock.incrementKey.mockResolvedValue(11);
    const result = await freemiumService.checkMessageAllowance(user);
    expect(result.allowed).toBe(false);
    expect(result.link).toContain(PAYWALL_LINK);
    expect(chatBufferMock.incrementKey).toHaveBeenCalled();
  });

  it('should calculate the correct TTL for the end of the month', async () => {
    const user = { id: 'user-4', subscriptionStatus: 'free' } as any;
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const firstDayOfNextMonth = new Date(Date.UTC(year, month + 1, 1));
    const expectedTtl = Math.floor((firstDayOfNextMonth.getTime() - now.getTime()) / 1000);

    chatBufferMock.incrementKey.mockResolvedValue(1);
    await freemiumService.checkMessageAllowance(user);

    // Check that the TTL is within a reasonable range of the expected value
    const actualTtl = chatBufferMock.incrementKey.mock.calls[0][1];
    expect(actualTtl).toBeCloseTo(expectedTtl, -1); // Allow for a small difference
  });
});
