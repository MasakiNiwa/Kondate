import { describe, expect, it } from 'vitest';
import { DISHES } from './dishes';
import { FOODS } from './foods';
import { FOOD_MAP, dishNutrition } from './catalog';

describe('food data', () => {
  it('has unique ids', () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length);
  });
  it('every ingredient refers to a known food with a positive amount', () => {
    for (const d of DISHES) {
      for (const i of d.ingredients) {
        expect(FOOD_MAP.has(i.foodId), `${d.id} → ${i.foodId}`).toBe(true);
        expect(i.grams, `${d.id} → ${i.foodId}`).toBeGreaterThan(0);
      }
    }
  });
  it('purchased foods have pack sizes, prices and shelf life', () => {
    for (const f of FOODS.filter((x) => !x.pantry)) {
      expect(f.packGrams, f.id).toBeGreaterThan(0);
      expect(f.price, f.id).toBeGreaterThan(0);
      expect(f.shelfDays, f.id).toBeGreaterThan(0);
      for (const m of f.peakMonths) expect(m >= 1 && m <= 12, f.id).toBe(true);
    }
  });
  it('has enough dishes per role and plausible energy', () => {
    for (const role of ['main', 'side', 'soup'] as const) {
      expect(DISHES.filter((d) => d.role === role).length).toBeGreaterThanOrEqual(15);
    }
    for (const d of DISHES) {
      const e = dishNutrition(d).energy;
      const [lo, hi] = d.role === 'main' ? (d.includesStaple ? [300, 1000] : [80, 650]) : [5, 350];
      expect(e, `${d.name} ${e.toFixed(0)}kcal`).toBeGreaterThanOrEqual(lo);
      expect(e, `${d.name} ${e.toFixed(0)}kcal`).toBeLessThanOrEqual(hi);
    }
  });
});
