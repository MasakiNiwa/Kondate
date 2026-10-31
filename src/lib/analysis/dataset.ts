import {
  FOOD_MAP,
  dishNutrition,
  dishSeasonality,
  getDish,
  riceNutrition,
} from '@/lib/food/catalog';
import { addNutrients, zeroNutrients } from '@/lib/food/nutrients';
import type { Targets } from '@/lib/food/reference';
import type { Dish, Nutrients } from '@/lib/food/types';
import type { DayPlan } from '@/lib/db/types';
import { nutritionScore } from '@/lib/planner/evaluate';
import { effectiveMinutes, proteinGroup } from '@/lib/planner/scoring';

/** 分析の 1 行（1 日分の夕食） */
export interface DayRow {
  date: string;
  dishes: Dish[];
  done: boolean;
  servings: number;
  /** 1 人分の栄養（ご飯を含む） */
  nutrients: Nutrients;
  score: number;
  /** 使った食材の金額の目安（パック単価 × 使う量。1 食分・全員） */
  foodCost: number;
  minutes: number;
  seasonality: number;
  protein: string | null;
}

export interface AnalysisInput {
  plans: DayPlan[];
  targets: Targets;
  riceGrams: number;
}

export function buildRows({ plans, targets, riceGrams }: AnalysisInput): DayRow[] {
  return plans
    .map((p) => {
      const dishes = p.dishes.map(getDish).filter((x): x is Dish => !!x);
      const n = zeroNutrients();
      for (const d of dishes) addNutrients(n, dishNutrition(d));
      if (!dishes.some((d) => d.includesStaple)) addNutrients(n, riceNutrition(riceGrams));
      let cost = 0;
      for (const d of dishes) {
        for (const i of d.ingredients) {
          const f = FOOD_MAP.get(i.foodId);
          if (f && !f.pantry) cost += (f.price / f.packGrams) * i.grams * p.servings;
        }
      }
      const month = Number(p.date.slice(5, 7));
      const main = dishes.find((d) => d.role === 'main');
      return {
        date: p.date,
        dishes,
        done: !!p.done,
        servings: p.servings,
        nutrients: n,
        score: nutritionScore(n, targets),
        foodCost: Math.round(cost),
        minutes: Math.round(effectiveMinutes(dishes)),
        seasonality: dishes.length
          ? dishes.reduce((s, d) => s + dishSeasonality(d, month), 0) / dishes.length
          : 0,
        protein: main ? proteinGroup(main.protein) : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 食材ごとの使用量（1 人分の g の合計）と、料理ごとの栄養への寄与 */
export function foodUsage(rows: DayRow[]): { foodId: string; grams: number; days: number }[] {
  const map = new Map<string, { grams: number; days: Set<string> }>();
  for (const r of rows) {
    for (const d of r.dishes) {
      for (const i of d.ingredients) {
        const f = FOOD_MAP.get(i.foodId);
        if (!f || f.pantry) continue;
        const e = map.get(f.id) ?? { grams: 0, days: new Set<string>() };
        e.grams += i.grams;
        e.days.add(r.date);
        map.set(f.id, e);
      }
    }
  }
  return [...map.entries()]
    .map(([foodId, e]) => ({ foodId, grams: Math.round(e.grams), days: e.days.size }))
    .sort((a, b) => b.grams - a.grams);
}

/** ある栄養素について、料理・食材ごとの寄与（期間の合計・1 人分） */
export function contributions(rows: DayRow[], key: keyof Nutrients, riceGrams: number) {
  const byDish = new Map<string, number>();
  const byFood = new Map<string, number>();
  for (const r of rows) {
    for (const d of r.dishes) {
      byDish.set(d.id, (byDish.get(d.id) ?? 0) + dishNutrition(d)[key]);
      for (const i of d.ingredients) {
        const f = FOOD_MAP.get(i.foodId);
        if (!f) continue;
        byFood.set(f.id, (byFood.get(f.id) ?? 0) + (f.per100[key] * i.grams) / 100);
      }
    }
    if (riceGrams > 0 && !r.dishes.some((d) => d.includesStaple)) {
      const rice = FOOD_MAP.get('rice')!;
      byDish.set('rice', (byDish.get('rice') ?? 0) + (rice.per100[key] * riceGrams) / 100);
      byFood.set('rice', (byFood.get('rice') ?? 0) + (rice.per100[key] * riceGrams) / 100);
    }
  }
  const sort = (m: Map<string, number>) =>
    [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return { dishes: sort(byDish), foods: sort(byFood) };
}
