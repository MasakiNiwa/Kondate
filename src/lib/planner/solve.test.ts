import highsLoader from 'highs';
import { beforeAll, describe, expect, it } from 'vitest';
import { getDish } from '@/lib/food/catalog';
import { solvePlan } from './solve';
import { sampleRequest } from './testRequest';
import type { Highs } from 'highs';

let highs: Highs;
beforeAll(async () => {
  highs = await highsLoader();
});

describe('solvePlan', () => {
  it('makes a 7-day plan with one main, side and soup per day', () => {
    const r = solvePlan(sampleRequest(), highs);
    expect(r.status, r.message).not.toBe('failed');
    expect(r.days).toHaveLength(7);
    for (const d of r.days) {
      expect(d.dishes.map((id) => getDish(id)?.role)).toEqual(['main', 'side', 'soup']);
    }
    // 同じ料理はくり返さない
    const all = r.days.flatMap((d) => d.dishes);
    expect(new Set(all).size).toBe(all.length);
    expect(r.evaluation!.totalCost).toBeGreaterThan(0);
    console.log(
      `solve ${r.solveMs}ms vars=${r.stats.variables} rows=${r.stats.constraints} cost=${r.evaluation!.totalCost} score=${r.evaluation!.nutritionScore} waste=${r.evaluation!.wasteValue}`,
    );
    console.log(
      r.days
        .map((d) => `${d.date} ${d.dishes.map((id) => getDish(id)!.name).join(' / ')}`)
        .join('\n'),
    );
  }, 60_000);

  it('respects excluded foods and fixed dishes', () => {
    const r = solvePlan(
      sampleRequest({
        days: 4,
        foodPrefs: { 'pork-slice': 'never', egg: 'never' },
        fixed: [{ day: 1, dishId: 'saba-miso' }],
      }),
      highs,
    );
    expect(r.status).not.toBe('failed');
    expect(r.days[1].dishes[0]).toBe('saba-miso');
    for (const d of r.days) {
      for (const id of d.dishes) {
        const ids = getDish(id)!.ingredients.map((i) => i.foodId);
        expect(ids).not.toContain('pork-slice');
        expect(ids).not.toContain('egg');
      }
    }
  }, 60_000);

  it('prefers cold dishes on hot days', () => {
    const hot = solvePlan(
      sampleRequest({ days: 5, startDate: '2026-08-03', maxTemps: [34, 34, 34, 34, 34] }),
      highs,
    );
    const cold = solvePlan(
      sampleRequest({ days: 5, startDate: '2026-01-12', maxTemps: [6, 6, 6, 6, 6] }),
      highs,
    );
    const count = (r: typeof hot, t: string) =>
      r.days.flatMap((d) => d.dishes).filter((id) => getDish(id)!.thermal === t).length;
    expect(count(hot, 'cold')).toBeGreaterThan(count(cold, 'cold'));
    expect(count(cold, 'hot')).toBeGreaterThan(count(hot, 'hot'));
  }, 60_000);
});
