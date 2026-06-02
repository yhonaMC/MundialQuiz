import { describe, it, expect } from 'vitest';
import { TOURNAMENTS, getTournament } from '@/lib/data';

describe('TOURNAMENTS dataset', () => {
  it('contains exactly the 7 editions 1998–2022', () => {
    expect(TOURNAMENTS.map((t) => t.year)).toEqual([
      1998, 2002, 2006, 2010, 2014, 2018, 2022,
    ]);
  });

  it.each(
    [1998, 2002, 2006, 2010, 2014, 2018, 2022].map((y) => [y] as const),
  )('tournament %i has valid invariants', (year) => {
    const t = getTournament(year)!;
    expect(t).toBeDefined();
    const top4 = [t.champion, t.runnerUp, t.third, t.fourth];
    expect(new Set(top4).size).toBe(4);
    expect(t.notableTeams).toHaveLength(8);
    expect(new Set(t.notableTeams).size).toBe(8);
    for (const team of top4) expect(t.notableTeams).toContain(team);
    expect(t.numTeams).toBe(32);
    expect(t.totalGoals).toBeGreaterThan(100);
    expect(t.goldenBoot.goals).toBeGreaterThan(0);
    expect(t.hosts.length).toBeGreaterThan(0);
    expect(t.mascot.length).toBeGreaterThan(0);
    expect(t.finalVenue.length).toBeGreaterThan(0);
    expect(t.notableMatches.length).toBeGreaterThan(0);
  });
});
