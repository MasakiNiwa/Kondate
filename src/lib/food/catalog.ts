import { DISHES } from './dishes';
import { FOODS } from './foods';
import { addNutrients, zeroNutrients } from './nutrients';
import type { Dish, DishRole, Food, Nutrients } from './types';

export const FOOD_MAP: ReadonlyMap<string, Food> = new Map(FOODS.map((f) => [f.id, f]));
const nutritionCache = new Map<string, Nutrients>();

/** 組み込みの料理 + ユーザーが追加した料理 */
let allList: Dish[] = [...DISHES];
const DISH_MAP = new Map<string, Dish>(DISHES.map((d) => [d.id, d]));

/** すべての料理（ユーザーが追加した料理を含む） */
export function allDishes(): readonly Dish[] {
  return allList;
}

/** ユーザーが追加した料理を登録する（同じ ID は置き換える。Worker でも呼ぶ） */
export function registerCustomDishes(list: Dish[]): void {
  const builtIn = new Set(DISHES.map((d) => d.id));
  for (const id of [...DISH_MAP.keys()]) if (!builtIn.has(id)) DISH_MAP.delete(id);
  for (const d of list) {
    if (builtIn.has(d.id)) continue;
    DISH_MAP.set(d.id, d);
    nutritionCache.delete(d.id);
  }
  allList = [...DISHES, ...list.filter((d) => !builtIn.has(d.id))];
}

export function getFood(id: string): Food | undefined {
  return FOOD_MAP.get(id);
}
export function getDish(id: string): Dish | undefined {
  return DISH_MAP.get(id);
}

export const ROLE_LABELS: Record<DishRole, string> = { main: '主菜', side: '副菜', soup: '汁物' };
export const ROLES: DishRole[] = ['main', 'side', 'soup'];

/** 料理 1 人分の栄養 */
export function dishNutrition(dish: Dish): Nutrients {
  const hit = nutritionCache.get(dish.id);
  if (hit) return hit;
  const n = zeroNutrients();
  for (const ing of dish.ingredients) {
    const food = FOOD_MAP.get(ing.foodId);
    if (food) addNutrients(n, food.per100, ing.grams / 100);
  }
  nutritionCache.set(dish.id, n);
  return n;
}

/** 主食（ご飯）1 人分の栄養 */
export function riceNutrition(grams: number): Nutrients {
  const rice = FOOD_MAP.get('rice');
  return rice ? addNutrients(zeroNutrients(), rice.per100, grams / 100) : zeroNutrients();
}

/** 料理の材料のうち、買う食材（常備品以外） */
export function purchasedIngredients(dish: Dish) {
  return dish.ingredients.filter((i) => !FOOD_MAP.get(i.foodId)?.pantry);
}

/** その月が旬の食材か */
export function isInSeason(food: Food, month: number): boolean {
  return food.peakMonths.includes(month);
}

/**
 * 料理の旬の度合い（0〜1）: 買う食材の重さのうち、旬の食材の割合。
 * 通年の食材は数えない（旬の食材が入っているほど高い）。
 */
export function dishSeasonality(dish: Dish, month: number): number {
  let total = 0;
  let inSeason = 0;
  for (const ing of purchasedIngredients(dish)) {
    const food = FOOD_MAP.get(ing.foodId)!;
    total += ing.grams;
    if (isInSeason(food, month)) inSeason += ing.grams;
  }
  return total > 0 ? inSeason / total : 0;
}

/**
 * 料理が旬から外れている度合い（0〜1）: 旬が決まっている食材のうち、旬でないものの重さの割合。
 * （真冬のゴーヤなど、季節外れの料理を避ける）
 */
export function dishOffSeason(dish: Dish, month: number): number {
  let total = 0;
  let off = 0;
  for (const ing of purchasedIngredients(dish)) {
    const food = FOOD_MAP.get(ing.foodId)!;
    total += ing.grams;
    if (food.peakMonths.length > 0 && food.peakMonths.length <= 4 && !isInSeason(food, month)) {
      // 前後 1 か月は「走り・名残」として半分だけ数える
      const near = food.peakMonths.some(
        (m) => Math.min(Math.abs(m - month), 12 - Math.abs(m - month)) === 1,
      );
      off += near ? ing.grams * 0.5 : ing.grams;
    }
  }
  return total > 0 ? off / total : 0;
}

/** 旬の時期の値段（旬は 2 割安い想定） */
export function seasonalPrice(food: Food, month: number): number {
  return isInSeason(food, month) ? Math.round(food.price * 0.8) : food.price;
}

/** 食材が使われている料理 */
export function dishesUsingFood(foodId: string): Dish[] {
  return allList.filter((d) => d.ingredients.some((i) => i.foodId === foodId));
}
