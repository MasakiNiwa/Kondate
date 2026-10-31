import { describe, expect, it } from 'vitest';
import { climateOf, nearestCity, normalMaxTemp, seasonOf } from './climate';

describe('climate', () => {
  it('picks the nearest city', () => {
    expect(nearestCity(35.0, 135.7).label).toBe('大阪');
    expect(nearestCity(43.1, 141.4).label).toBe('札幌');
  });
  it('interpolates normal temperatures between months', () => {
    const mid = normalMaxTemp(new Date(2026, 7, 15));
    expect(mid).toBeGreaterThan(30);
    const endOfAug = normalMaxTemp(new Date(2026, 7, 31));
    expect(endOfAug).toBeLessThan(mid);
  });
  it('classifies seasons and climates', () => {
    expect(seasonOf(4)).toBe('spring');
    expect(seasonOf(12)).toBe('winter');
    expect(climateOf(32)).toBe('hot');
    expect(climateOf(5)).toBe('cold');
  });
});
