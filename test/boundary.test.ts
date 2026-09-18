import { describe, expect, it } from 'vitest';
import { findBoundary } from '../src/boundary.js';

describe('findBoundary', () => {
  it('finds an increasing-width failure boundary exactly', async () => {
    const result = await findBoundary(
      async (width) => width >= 712,
      430,
      768,
    );

    expect(result).toEqual({
      boundary: 712,
      lastGoodWidth: 711,
      firstBadWidth: 712,
      probesUsed: expect.any(Number),
    });
    expect(result.probesUsed).toBeLessThanOrEqual(9);
  });

  it('works when the failure is on the narrower side', async () => {
    const result = await findBoundary(
      async (width) => width <= 711,
      768,
      430,
    );

    expect(result.boundary).toBe(711);
    expect(result.lastGoodWidth).toBe(712);
    expect(result.firstBadWidth).toBe(711);
    expect(result.probesUsed).toBeLessThanOrEqual(9);
  });
});
