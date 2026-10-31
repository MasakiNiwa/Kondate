import {
  FOOD_MAP,
  dishNutrition,
  dishSeasonality,
  getDish,
  riceNutrition,
  seasonalPrice,
} from '@/lib/food/catalog';
import { addNutrients, zeroNutrients } from '@/lib/food/nutrients';
import { achievement, type Targets } from '@/lib/food/reference';
import type { Dish, NutrientKey, Nutrients } from '@/lib/food/types';
import { NUTRIENT_KEYS } from '@/lib/food/types';
import {
  NUTRIENT_WEIGHTS,
  dayDate,
  dayKey,
  effectiveMinutes,
  isPerishable,
  tripOfDay,
} from './scoring';
import type { DayEvaluation, PlanEvaluation, PlannedDay, ShoppingLine } from './types';

export interface EvalContext {
  startDate: string;
  days: number;
  trips: number;
  servings: number;
  targets: Targets;
  riceGrams: number;
  maxMinutes: number[];
  maxTemps: number[];
  stock: { foodId: string; grams: number }[];
}

/** 1 食分（1 人分）の栄養: 料理の合計 + ご飯（主食を兼ねる料理がなければ） */
export function mealNutrition(dishes: Dish[], riceGrams: number): Nutrients {
  const n = zeroNutrients();
  for (const d of dishes) addNutrients(n, dishNutrition(d));
  if (!dishes.some((d) => d.includesStaple)) addNutrients(n, riceNutrition(riceGrams));
  return n;
}

/**
 * 栄養スコア（0〜100）。重みを付けた各栄養素の「目標からの外れ」の平均を引く。
 * 下限に届かない分・上限を超えた分を割合で数え、1 栄養素あたり最大 100% まで。
 */
export function nutritionScore(n: Nutrients, t: Targets): number {
  let penalty = 0;
  let weight = 0;
  for (const k of NUTRIENT_KEYS) {
    const w = NUTRIENT_WEIGHTS[k];
    if (w.lo > 0 && t[k].lo > 0) {
      penalty += w.lo * Math.min(1, Math.max(0, (t[k].lo - n[k]) / t[k].lo));
      weight += w.lo;
    }
    if (w.hi > 0 && Number.isFinite(t[k].hi) && t[k].hi > 0) {
      penalty += w.hi * Math.min(1, Math.max(0, (n[k] - t[k].hi) / t[k].hi));
      weight += w.hi;
    }
  }
  return Math.round(100 * (1 - penalty / weight));
}

export function achievements(n: Nutrients, t: Targets): Record<NutrientKey, number> {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, achievement(n[k], t[k])])) as Record<
    NutrientKey,
    number
  >;
}

/** 献立から買い物リストを作る（区間ごとに使う量を足して、パック単位に切り上げる） */
export function buildShopping(ctx: EvalContext, days: PlannedDay[]): ShoppingLine[] {
  const trips = tripOfDay(ctx.days, ctx.trips);
  const stock = new Map(ctx.stock.map((s) => [s.foodId, s.grams]));
  const lines: ShoppingLine[] = [];
  const nTrips = Math.max(...trips.map((t) => t.trip)) + 1;
  for (let t = 0; t < nTrips; t++) {
    const startDay = trips.findIndex((x) => x.trip === t);
    const date = dayKey(ctx.startDate, startDay);
    const month = dayDate(ctx.startDate, startDay).getMonth() + 1;
    const used = new Map<string, number>();
    days.forEach((day, d) => {
      if (trips[d]?.trip !== t) return;
      for (const id of day.dishes) {
        const dish = getDish(id);
        if (!dish) continue;
        for (const ing of dish.ingredients) {
          const f = FOOD_MAP.get(ing.foodId);
          if (!f || f.pantry) continue;
          used.set(f.id, (used.get(f.id) ?? 0) + ing.grams * ctx.servings);
        }
      }
    });
    for (const [foodId, grams] of used) {
      const f = FOOD_MAP.get(foodId)!;
      const have = t === 0 ? (stock.get(foodId) ?? 0) : 0;
      const fromStock = Math.min(have, grams);
      const need = grams - fromStock;
      // 1% 未満の端数は誤差とみなして切り捨てる
      const packs = need <= 0 ? 0 : Math.ceil(need / f.packGrams - 0.01);
      lines.push({
        foodId,
        trip: t,
        date,
        packs,
        usedGrams: Math.round(grams),
        fromStock: Math.round(fromStock),
        leftover: Math.max(0, Math.round(packs * f.packGrams + fromStock - grams)),
        cost: packs * seasonalPrice(f, month),
      });
    }
  }
  return lines.sort((a, b) => a.trip - b.trip || categoryOrder(a.foodId) - categoryOrder(b.foodId));
}

const CATEGORY_ORDER = [
  'vegetable',
  'tuber',
  'mushroom',
  'fruit',
  'meat',
  'fish',
  'egg',
  'dairy',
  'soy',
  'processed',
  'grain',
  'seaweed',
  'seasoning',
];
export function categoryOrder(foodId: string): number {
  return CATEGORY_ORDER.indexOf(FOOD_MAP.get(foodId)?.category ?? 'seasoning');
}

/** 献立全体の評価（栄養・費用・余り・旬・調理時間） */
export function evaluatePlan(ctx: EvalContext, days: PlannedDay[]): PlanEvaluation {
  const dayEvals: DayEvaluation[] = days.map((day, d) => {
    const dishes = day.dishes.map(getDish).filter((x): x is Dish => !!x);
    const n = mealNutrition(dishes, ctx.riceGrams);
    return {
      date: day.date,
      nutrients: n,
      achievement: achievements(n, ctx.targets),
      nutritionScore: nutritionScore(n, ctx.targets),
      minutes: Math.round(effectiveMinutes(dishes)),
      maxMinutes: ctx.maxMinutes[d] ?? 40,
      maxTemp: ctx.maxTemps[d] ?? 20,
    };
  });
  const shopping = buildShopping(ctx, days);
  const totalCost = shopping.reduce((s, l) => s + l.cost, 0);
  const wasteValue = shopping.reduce((s, l) => {
    const f = FOOD_MAP.get(l.foodId)!;
    return isPerishable(f) ? s + (l.leftover / f.packGrams) * f.price : s;
  }, 0);
  const allDishes = days.flatMap((d) => d.dishes.map(getDish).filter((x): x is Dish => !!x));
  const seasonality =
    allDishes.length > 0
      ? days.reduce((s, day, d) => {
          const month = dayDate(ctx.startDate, d).getMonth() + 1;
          return s + day.dishes.reduce((a, id) => a + dishSeasonality(getDish(id)!, month), 0);
        }, 0) / allDishes.length
      : 0;
  const foods = new Set(allDishes.flatMap((d) => d.ingredients.map((i) => i.foodId)));
  const nDays = Math.max(1, dayEvals.length);
  return {
    days: dayEvals,
    shopping,
    totalCost,
    costPerServing: totalCost / Math.max(1, nDays * ctx.servings),
    wasteValue: Math.round(wasteValue),
    nutritionScore: Math.round(dayEvals.reduce((s, d) => s + d.nutritionScore, 0) / nDays),
    seasonality,
    avgMinutes: Math.round(dayEvals.reduce((s, d) => s + d.minutes, 0) / nDays),
    foodVariety: [...foods].filter((id) => !FOOD_MAP.get(id)?.pantry).length,
  };
}
