import { describe, it, expect } from 'vitest';
import { NATIONAL_TEAMS } from '@/lib/data/teams';

describe('NATIONAL_TEAMS', () => {
  it('has a healthy pool of unique team names', () => {
    expect(NATIONAL_TEAMS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(NATIONAL_TEAMS).size).toBe(NATIONAL_TEAMS.length);
  });

  it('includes the major champions', () => {
    for (const t of ['Brasil', 'Alemania', 'Argentina', 'Francia', 'España', 'Italia']) {
      expect(NATIONAL_TEAMS).toContain(t);
    }
  });
});
