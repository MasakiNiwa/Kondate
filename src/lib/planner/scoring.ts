import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { FOOD_MAP, dishOffSeason, dishSeasonality, purchasedIngredients } from '@/lib/food/catalog';
import type { Dish, Food, NutrientKey, Protein } from '@/lib/food/types';
import type { PlanRequest, Pref } from './types';

/**
 * 計算に使う係数（円に換算した「うれしさ・困りごと」）。
 * 目的関数は「費用 + 困りごと − うれしさ」を最小にする。値を変えると献立の傾向が変わる。
 */
export const COEF = {
  /** 栄養: 1 日のある栄養素が目標から 100% 外れたときの困りごと（円） */
  nutrition: 260,
  /** 調理時間: 目安を 1 分超えるごとの困りごと */
  timePerMinute: 18,
  /** 好き・苦手（料理） */
  dishLike: 220,
  dishDislike: 450,
  /** 好き・苦手（食材。料理に含まれるごと） */
  foodLike: 70,
  foodDislike: 260,
  /** 旬の食材を使う料理のうれしさ（旬の割合 100% のとき） */
  seasonBonus: 160,
  /** 季節外れの料理の困りごと */
  offSeason: 420,
  /** 気温に合う・合わない料理 */
  weather: 140,
  /** くり返し（最近食べた料理） */
  repeat: 380,
  /** 同じたんぱく源の主菜が 2 日続く */
  sameProtein: 160,
  /** 余った食材（傷むもの）の値段に掛ける割合 */
  waste: 1,
  /** 手元の在庫を使う価値（値段に対する割合） */
  stockUse: 1.2,
};

/** 栄養素ごとの重み（下限・上限）。0 は使わない */
export const NUTRIENT_WEIGHTS: Record<NutrientKey, { lo: number; hi: number }> = {
  energy: { lo: 1, hi: 1 },
  protein: { lo: 1.2, hi: 0.2 },
  fat: { lo: 0.3, hi: 0.8 },
  carbs: { lo: 0.3, hi: 0.3 },
  fiber: { lo: 1, hi: 0 },
  salt: { lo: 0, hi: 1.2 },
  calcium: { lo: 0.7, hi: 0 },
  iron: { lo: 0.7, hi: 0 },
  vitA: { lo: 0.6, hi: 0 },
  vitD: { lo: 0.5, hi: 0 },
  vitB1: { lo: 0.6, hi: 0 },
  vitB2: { lo: 0.5, hi: 0 },
  vitC: { lo: 0.8, hi: 0 },
  potassium: { lo: 0.6, hi: 0 },
};

export function dayDate(start: string, day: number): Date {
  return addDays(parseISO(start), day);
}

export function dayKey(start: string, day: number): string {
  return format(dayDate(start, day), 'yyyy-MM-dd');
}

/** 買い物の区間: 各日が何回目の買い物の分か、その区間の最初の日 */
export function tripOfDay(days: number, trips: number): { trip: number; start: number }[] {
  const n = Math.max(1, Math.min(trips, days));
  const size = days / n;
  return Array.from({ length: days }, (_, d) => {
    const trip = Math.min(n - 1, Math.floor(d / size));
    return { trip, start: Math.ceil(trip * size) };
  });
}

/** 食材の実際の日持ち（冷凍を使うなら肉・魚は 14 日） */
export function effectiveShelf(food: Food, useFreezer: boolean): number {
  return useFreezer && food.freezable ? Math.max(food.shelfDays, 14) : food.shelfDays;
}

/** その料理を、買い物から age 日後（0 = 買った日）に作れるか */
export function freshEnough(dish: Dish, age: number, useFreezer: boolean): boolean {
  return purchasedIngredients(dish).every((i) => {
    const f = FOOD_MAP.get(i.foodId)!;
    return age < effectiveShelf(f, useFreezer);
  });
}

/** 余りを気にする食材（日持ちが 2 週間未満） */
export function isPerishable(food: Food): boolean {
  return food.shelfDays < 14;
}

/** 苦手（never）が含まれていて作れない料理か */
export function isExcluded(dish: Dish, req: Pick<PlanRequest, 'dishPrefs' | 'foodPrefs'>): boolean {
  if (req.dishPrefs[dish.id] === 'never') return true;
  return dish.ingredients.some((i) => req.foodPrefs[i.foodId] === 'never');
}

/** 好みのスコア（円換算。マイナスほど良い） */
export function prefCost(
  dish: Dish,
  dishPrefs: Record<string, Pref>,
  foodPrefs: Record<string, Pref>,
): number {
  let c = 0;
  const dp = dishPrefs[dish.id];
  if (dp === 'like') c -= COEF.dishLike;
  if (dp === 'dislike') c += COEF.dishDislike;
  for (const i of dish.ingredients) {
    const fp = foodPrefs[i.foodId];
    if (fp === 'like') c -= COEF.foodLike;
    if (fp === 'dislike') c += COEF.foodDislike;
  }
  return c;
}

/**
 * 気温への合い方（-1〜1）。暑い日（最高気温 28℃ 以上）は冷たい料理 +1・温かい料理 -1、
 * 寒い日（12℃ 以下）はその逆。間はなめらかにつなぐ。
 */
export function weatherFit(dish: Dish, maxTemp: number): number {
  const h = Math.max(-1, Math.min(1, (maxTemp - 20) / 8));
  const roleScale = dish.role === 'soup' ? 0.6 : 1;
  if (dish.thermal === 'cold') return h * roleScale * (h < 0 ? 1.2 : 1);
  if (dish.thermal === 'hot') return -h * roleScale;
  return 0;
}

/** 旬と季節外れのスコア（円換算。マイナスほど良い） */
export function seasonCost(dish: Dish, month: number): number {
  return (
    -COEF.seasonBonus * dishSeasonality(dish, month) + COEF.offSeason * dishOffSeason(dish, month)
  );
}

/** 最近食べた料理のくり返しの困りごと（0〜1。食べたのが最近ほど大きい） */
export function repeatFactor(
  dishId: string,
  date: string,
  history: PlanRequest['history'],
  gap: number,
): number {
  if (gap <= 0) return 0;
  let best = 0;
  const target = parseISO(date);
  for (const h of history) {
    if (!h.dishes.includes(dishId)) continue;
    const diff = differenceInCalendarDays(target, parseISO(h.date));
    if (diff > 0 && diff <= gap) best = Math.max(best, 1 - (diff - 1) / gap);
  }
  return best;
}

/** 主菜のたんぱく源のまとまり（魚と魚介はまとめる） */
export function proteinGroup(p: Protein): string | null {
  if (p === 'none') return null;
  if (p === 'seafood') return 'fish';
  return p;
}

/** 調理時間の実感（主菜 + 副菜・汁物は並行して作れるので 6 割） */
export function effectiveMinutes(dishes: Dish[]): number {
  return dishes.reduce((s, d) => s + (d.role === 'main' ? d.minutes : d.minutes * 0.6), 0);
}

/** 料理の中で、いちばん量の多い「買う食材」 */
export function keyIngredient(dish: Dish): string | null {
  const list = purchasedIngredients(dish);
  if (list.length === 0) return null;
  return list.reduce((a, b) => (b.grams > a.grams ? b : a)).foodId;
}
