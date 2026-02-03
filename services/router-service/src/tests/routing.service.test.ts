import { decideChannels } from '../services/routing.service';

describe('routing.service - decideChannels', () => {
  test('returns default email channel for basic event', () => {
    const res = decideChannels({ type: 'campaign.created' });
    expect(Array.isArray(res)).toBe(true);
    expect(res).toContain('email');
  });

  test('is deterministic and returns array even with empty event', () => {
    const res = decideChannels(null as any);
    expect(res).toEqual(['email']);
  });
});
