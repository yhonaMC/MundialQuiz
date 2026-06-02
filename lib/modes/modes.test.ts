import { describe, it, expect } from 'vitest';
import { MODES, getMode } from '@/lib/modes/modes';

describe('MODES', () => {
  it('defines exactly the 6 Group-A modes', () => {
    expect(MODES.map((m) => m.id).sort()).toEqual(
      ['contrarreloj', 'escalera', 'experto', 'maraton', 'por-mundial', 'supervivencia'].sort(),
    );
  });

  it('every mode has scoring config and a question count', () => {
    for (const m of MODES) {
      expect(m.scoring.base).toBeGreaterThan(0);
      expect(m.questionCount).toBeDefined();
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.icon.length).toBeGreaterThan(0);
    }
  });

  it('contrarreloj has a timer', () => {
    expect(getMode('contrarreloj')!.timer).toBeDefined();
  });

  it('supervivencia has lives', () => {
    expect(getMode('supervivencia')!.lives).toBe(3);
  });

  it('escalera allows cash-out', () => {
    expect(getMode('escalera')!.allowCashOut).toBe(true);
  });

  it('maraton is sequential', () => {
    expect(getMode('maraton')!.tournamentFilter).toBe('sequential');
  });

  it('getMode returns undefined for unknown ids', () => {
    expect(getMode('nope')).toBeUndefined();
  });
});
