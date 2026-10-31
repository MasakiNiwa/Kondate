import { describe, expect, it } from 'vitest';
import { householdDailyTargets, mealTargets } from '@/lib/food/reference';
import { buildRows, contributions, foodUsage } from './dataset';
import { computeInsights } from './insights';

const targets = mealTargets(
  householdDailyTargets([{ sex: 'f', age: '30-49', activity: 'normal' }]),
  0.38,
);
const plans = [
  {
    date: '2026-10-01',
    planId: 'a',
    dishes: ['saba-miso', 'ohitashi', 'miso-tofu-wakame'],
    servings: 1,
    createdAt: 0,
    done: true,
  },
  {
    date: '2026-10-02',
    planId: 'a',
    dishes: ['ginger-pork', 'coleslaw', 'tonjiru'],
    servings: 1,
    createdAt: 0,
  },
  {
    date: '2026-10-03',
    planId: 'a',
    dishes: ['curry-rice', 'green-salad', 'consomme-soup'],
    servings: 1,
    createdAt: 0,
  },
];

describe('analysis', () => {
  const rows = buildRows({ plans, targets, riceGrams: 150 });
  it('builds rows with nutrition, cost and protein groups', () => {
    expect(rows).toHaveLength(3);
    expect(rows[0].protein).toBe('fish');
    expect(rows[1].protein).toBe('pork');
    expect(rows[0].foodCost).toBeGreaterThan(0);
    // カレーは主食を兼ねるので、ご飯を足さない
    expect(rows[2].nutrients.energy).toBeLessThan(1100);
  });
  it('breaks a nutrient down by dish and food', () => {
    const c = contributions(rows, 'salt', 150);
    expect(c.dishes[0][1]).toBeGreaterThan(0);
    expect(c.foods.some(([id]) => id === 'miso')).toBe(true);
    expect(foodUsage(rows)[0].grams).toBeGreaterThan(0);
  });
  it('produces deterministic insights', () => {
    const list = computeInsights({ rows, targets, month: 10 });
    expect(list.length).toBeGreaterThan(0);
    expect(list.map((i) => i.id)).toContain('salt');
  });
});
