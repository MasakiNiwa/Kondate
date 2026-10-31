import { DISHES } from '@/lib/food/dishes';
import { FOOD_MAP, dishNutrition, getDish, riceNutrition, seasonalPrice } from '@/lib/food/catalog';
import type { Dish, DishRole, NutrientKey } from '@/lib/food/types';
import { NUTRIENT_KEYS } from '@/lib/food/types';
import { LpModel, type Term } from './lp';
import {
  COEF,
  NUTRIENT_WEIGHTS,
  dayDate,
  dayKey,
  effectiveMinutes,
  freshEnough,
  isExcluded,
  isPerishable,
  keyIngredient,
  prefCost,
  proteinGroup,
  repeatFactor,
  seasonCost,
  tripOfDay,
  weatherFit,
} from './scoring';
import type { PlanRequest } from './types';

export interface BuiltModel {
  lp: string;
  /** x 変数の名前 → [日, 料理 ID] */
  xVars: Map<string, [number, string]>;
  variables: number;
  constraints: number;
}

const ROLES: DishRole[] = ['main', 'side', 'soup'];

/** 候補の料理（作れないもの・苦手なもの・日持ちしないものを除いたもの） */
export function candidatesFor(req: PlanRequest, day: number, role: DishRole): Dish[] {
  const trips = tripOfDay(req.days, req.trips);
  const age = day - trips[day].start;
  const fixed = req.fixed.find((f) => f.day === day && getDish(f.dishId)?.role === role);
  if (fixed) return [getDish(fixed.dishId)!];
  return DISHES.filter(
    (d) => d.role === role && !isExcluded(d, req) && freshEnough(d, age, req.useFreezer),
  );
}

/**
 * 献立の混合整数計画モデルを作る。
 *
 * 変数:
 *   x[d,r] ∈ {0,1}  d 日目に料理 r を作る
 *   p[f,t] ∈ ℤ≥0     t 回目の買い物で食材 f を何パック買うか
 *   u[f]   ≥ 0      手元の在庫から使う量（g）
 *   lo/hi[d,k] ≥ 0  d 日目の栄養素 k の不足・超過（目標に対する割合で罰する）
 *   tm[d] ≥ 0       調理時間の超過（分）
 *   pr[d,c] ≥ 0     同じたんぱく源の主菜が続いた分
 */
export function buildModel(req: PlanRequest): BuiltModel {
  const m = new LpModel();
  const w = req.weights;
  const trips = tripOfDay(req.days, req.trips);
  const xVars = new Map<string, [number, string]>();
  const dishIndex = new Map(DISHES.map((d, i) => [d.id, i]));
  /** x[d][role] = [{ name, dish }] */
  const xs: { name: string; dish: Dish }[][][] = [];

  // ---- 料理の選択（毎日、主菜・副菜・汁物を 1 品ずつ） ----
  for (let d = 0; d < req.days; d++) {
    const date = dayKey(req.startDate, d);
    const month = dayDate(req.startDate, d).getMonth() + 1;
    const temp = req.maxTemps[d] ?? 20;
    xs[d] = [];
    ROLES.forEach((role, ri) => {
      const list = candidatesFor(req, d, role).map((dish) => {
        const name = m.binary(`x${d}_${dishIndex.get(dish.id)}`);
        xVars.set(name, [d, dish.id]);
        let c = 0;
        c += w.pref * prefCost(dish, req.dishPrefs, req.foodPrefs);
        c += w.season * seasonCost(dish, month);
        c -= w.weather * COEF.weather * weatherFit(dish, temp);
        c += w.variety * COEF.repeat * repeatFactor(dish.id, date, req.history, req.repeatGapDays);
        m.addObjective(c, name);
        return { name, dish };
      });
      xs[d][ri] = list;
      m.constraint(
        list.map((x) => [1, x.name] as Term),
        '=',
        1,
      );
    });
  }

  // ---- 同じ料理は期間中にくり返さない（候補が足りないときは回数を緩める） ----
  const uses = new Map<string, string[]>();
  for (const day of xs)
    for (const role of day)
      for (const x of role) {
        const arr = uses.get(x.dish.id) ?? [];
        arr.push(x.name);
        uses.set(x.dish.id, arr);
      }
  ROLES.forEach((role, ri) => {
    const distinct = new Set(xs.flatMap((day) => day[ri].map((x) => x.dish.id))).size;
    const maxUse = Math.max(1, Math.ceil(req.days / Math.max(1, distinct)));
    for (const [id, names] of uses) {
      if (getDish(id)?.role !== role || names.length <= maxUse) continue;
      m.constraint(
        names.map((n) => [1, n] as Term),
        '<=',
        maxUse,
      );
    }
  });

  // ---- 同じ日に、同じ主役の食材を使う料理を重ねない（肉じゃが＋ポテサラ、かぼちゃの煮物＋ポタージュなど） ----
  for (let d = 0; d < req.days; d++) {
    for (const [a, b] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      for (const x of xs[d][a]) {
        for (const y of xs[d][b]) {
          if (sharesKeyIngredient(x.dish, y.dish)) {
            m.constraint(
              [
                [1, x.name],
                [1, y.name],
              ],
              '<=',
              1,
            );
          }
        }
      }
    }
  }

  // ---- 同じたんぱく源の主菜が続かない ----
  const groupsOf = (list: { name: string; dish: Dish }[]) => {
    const g = new Map<string, string[]>();
    for (const x of list) {
      const p = proteinGroup(x.dish.protein);
      if (!p) continue;
      g.set(p, [...(g.get(p) ?? []), x.name]);
    }
    return g;
  };
  const lastHistory = [...req.history].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (lastHistory && lastHistory.date === dayKey(req.startDate, -1)) {
    const prevMain = lastHistory.dishes.map(getDish).find((x) => x?.role === 'main');
    const pg = prevMain && proteinGroup(prevMain.protein);
    if (pg)
      for (const x of xs[0]?.[0] ?? []) {
        if (proteinGroup(x.dish.protein) === pg)
          m.addObjective(w.variety * COEF.sameProtein, x.name);
      }
  }
  for (let d = 0; d + 1 < req.days; d++) {
    const a = groupsOf(xs[d][0]);
    const b = groupsOf(xs[d + 1][0]);
    for (const [g, names] of a) {
      const next = b.get(g);
      if (!next) continue;
      const slack = m.real(`pr${d}_${g}`);
      m.addObjective(w.variety * COEF.sameProtein, slack);
      m.constraint(
        [...names.map((n) => [1, n] as Term), ...next.map((n) => [1, n] as Term), [-1, slack]],
        '<=',
        1,
      );
    }
  }

  // ---- 栄養（1 日ごと・1 人分） ----
  const rice = riceNutrition(req.riceGrams);
  for (let d = 0; d < req.days; d++) {
    const all = xs[d].flat();
    for (const k of NUTRIENT_KEYS as readonly NutrientKey[]) {
      const t = req.targets[k];
      const wt = NUTRIENT_WEIGHTS[k];
      // 主食を兼ねる料理を選んだ日はご飯を足さない: V = Σ n_r x_r + rice × (1 − Σ_{丼} x_r)
      const terms: Term[] = all.map((x) => [
        dishNutrition(x.dish)[k] - (x.dish.includesStaple ? rice[k] : 0),
        x.name,
      ]);
      const constant = rice[k];
      if (wt.lo > 0 && t.lo > 0) {
        const s = m.real(`lo${d}_${k}`, t.lo);
        m.addObjective((w.nutrition * COEF.nutrition * wt.lo) / t.lo, s);
        m.constraint([...terms, [1, s]], '>=', t.lo - constant);
      }
      if (wt.hi > 0 && Number.isFinite(t.hi) && t.hi > 0) {
        const s = m.real(`hi${d}_${k}`);
        m.addObjective((w.nutrition * COEF.nutrition * wt.hi) / t.hi, s);
        m.constraint([...terms, [-1, s]], '<=', t.hi - constant);
      }
    }
  }

  // ---- 調理時間 ----
  for (let d = 0; d < req.days; d++) {
    const s = m.real(`tm${d}`);
    m.addObjective(w.time * COEF.timePerMinute, s);
    const terms: Term[] = xs[d].flat().map((x) => [effectiveMinutes([x.dish]), x.name]);
    m.constraint([...terms, [-1, s]], '<=', req.maxMinutes[d] ?? 40);
  }

  // ---- 買い物（パック単位）と在庫 ----
  const stock = new Map(req.stock.map((s) => [s.foodId, s.grams]));
  const nTrips = Math.max(...trips.map((t) => t.trip)) + 1;
  for (let t = 0; t < nTrips; t++) {
    const tripStart = trips.findIndex((x) => x.trip === t);
    const month = dayDate(req.startDate, tripStart).getMonth() + 1;
    /** 食材 → 使う量の項 */
    const usage = new Map<string, Term[]>();
    for (let d = 0; d < req.days; d++) {
      if (trips[d].trip !== t) continue;
      for (const x of xs[d].flat()) {
        for (const ing of x.dish.ingredients) {
          const food = FOOD_MAP.get(ing.foodId);
          if (!food || food.pantry) continue;
          const arr = usage.get(food.id) ?? [];
          arr.push([ing.grams * req.servings, x.name]);
          usage.set(food.id, arr);
        }
      }
    }
    for (const [foodId, terms] of usage) {
      const food = FOOD_MAP.get(foodId)!;
      const price = seasonalPrice(food, month);
      const p = m.integer(`p${t}_${dishSafe(foodId)}`, 40);
      // 費用 + 余り（傷むもの）: 余り = pack × p − 使用量
      const perishable = isPerishable(food);
      const wasteCoef = perishable ? (w.waste * COEF.waste * price) / food.packGrams : 0;
      m.addObjective(w.cost * price + wasteCoef * food.packGrams, p);
      for (const [g, n] of terms) m.addObjective(-wasteCoef * g, n);
      const have = t === 0 ? (stock.get(foodId) ?? 0) : 0;
      m.constraint([...terms, [-food.packGrams, p]], '<=', have);
      if (have > 0) {
        // 在庫を使うほどうれしい（使い切りたい）
        const u = m.real(`u_${dishSafe(foodId)}`, have);
        m.addObjective((-w.waste * COEF.stockUse * food.price) / food.packGrams, u);
        m.constraint([[1, u], ...terms.map(([g, n]) => [-g, n] as Term)], '<=', 0);
      }
    }
  }

  return {
    lp: m.toString(),
    xVars,
    variables: m.variableCount,
    constraints: m.constraintCount,
  };
}

/** どちらかの主役の食材（いちばん多い買う食材）を、もう一方も 30g 以上使う */
function sharesKeyIngredient(a: Dish, b: Dish): boolean {
  const check = (x: Dish, y: Dish) => {
    const key = keyIngredient(y);
    return !!key && x.ingredients.some((i) => i.foodId === key && i.grams >= 30);
  };
  return check(a, b) || check(b, a);
}

function dishSafe(id: string): string {
  return id.replace(/[^A-Za-z0-9]/g, '_');
}
