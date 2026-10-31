import { dishSeasonality, getDish, allDishes } from '@/lib/food/catalog';
import type { Dish } from '@/lib/food/types';
import { buildShopping, mealNutrition, nutritionScore, type EvalContext } from './evaluate';
import { COEF, dayDate, isExcluded, prefCost, seasonCost, weatherFit } from './scoring';
import type { PlannedDay, Pref } from './types';

export interface Alternative {
  dish: Dish;
  /** 低いほどおすすめ（円換算） */
  score: number;
  /** 買い物の増減（円） */
  deltaCost: number;
  /** その日の栄養スコア（差し替えたあと） */
  nutrition: number;
  nutritionDelta: number;
  reasons: string[];
}

/**
 * 1 品を差し替える候補を、今の献立・買い物を前提に順位付けする。
 * （すでに買う食材で作れる料理は「追加の買い物なし」で上位に来る）
 */
export function rankAlternatives(
  ctx: EvalContext,
  days: PlannedDay[],
  day: number,
  index: number,
  prefs: { dishPrefs: Record<string, Pref>; foodPrefs: Record<string, Pref> },
  limit = 8,
): Alternative[] {
  const current = getDish(days[day].dishes[index]);
  if (!current) return [];
  const used = new Set(days.flatMap((d) => d.dishes));
  const baseCost = buildShopping(ctx, days).reduce((s, l) => s + l.cost, 0);
  const others = days[day].dishes
    .filter((_, i) => i !== index)
    .map(getDish)
    .filter((x): x is Dish => !!x);
  const baseNutrition = nutritionScore(
    mealNutrition([...others, current], ctx.riceGrams),
    ctx.targets,
  );
  const month = dayDate(ctx.startDate, day).getMonth() + 1;
  const temp = ctx.maxTemps[day] ?? 20;

  const list: Alternative[] = [];
  for (const dish of allDishes()) {
    if (dish.role !== current.role || used.has(dish.id) || isExcluded(dish, prefs)) continue;
    const nextDays = days.map((d, i) =>
      i === day ? { ...d, dishes: d.dishes.map((id, j) => (j === index ? dish.id : id)) } : d,
    );
    const cost = buildShopping(ctx, nextDays).reduce((s, l) => s + l.cost, 0);
    const nutrition = nutritionScore(mealNutrition([...others, dish], ctx.riceGrams), ctx.targets);
    const deltaCost = cost - baseCost;
    const pc = prefCost(dish, prefs.dishPrefs, prefs.foodPrefs);
    const sc = seasonCost(dish, month);
    const wf = weatherFit(dish, temp);
    const score =
      deltaCost + (100 - nutrition) * (COEF.nutrition / 25) + pc + sc - wf * COEF.weather;
    const reasons: string[] = [];
    if (deltaCost <= 0) reasons.push('追加の買い物なし');
    if (nutrition >= baseNutrition + 3) reasons.push(`栄養 +${nutrition - baseNutrition}`);
    if (dishSeasonality(dish, month) >= 0.3) reasons.push('旬');
    if (wf > 0.3) reasons.push(dish.thermal === 'cold' ? '暑い日向き' : '寒い日向き');
    if (pc < 0) reasons.push('好み');
    list.push({
      dish,
      score,
      deltaCost,
      nutrition,
      nutritionDelta: nutrition - baseNutrition,
      reasons,
    });
  }
  return list.sort((a, b) => a.score - b.score).slice(0, limit);
}
