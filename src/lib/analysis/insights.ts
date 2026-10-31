import { FOOD_MAP, dishNutrition, getDish, isInSeason, allDishes } from '@/lib/food/catalog';
import { NUTRIENTS, NUTRIENT_LIST } from '@/lib/food/nutrients';
import type { Targets } from '@/lib/food/reference';
import type { NutrientKey } from '@/lib/food/types';
import type { DayRow } from './dataset';

export type InsightTone = 'good' | 'warn' | 'info';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  /** 関連する料理（おすすめなど） */
  dishes?: string[];
}

export interface InsightContext {
  rows: DayRow[];
  targets: Targets;
  month: number;
}

/**
 * 気づきのルール。ルールを足すときは関数を書いて INSIGHT_RULES に加える。
 * 各ルールはデータから決定的に計算する（AI に頼らない）。
 */
export type InsightRule = (ctx: InsightContext) => Insight | Insight[] | null;

/** 栄養素あたりの含有量が多い料理（エネルギー 100kcal あたり） */
export function richDishes(key: NutrientKey, limit = 3): string[] {
  return allDishes()
    .map((d) => {
      const n = dishNutrition(d);
      return { id: d.id, v: n[key] / Math.max(50, n.energy) };
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, limit)
    .map((x) => x.id);
}

const weakestNutrient: InsightRule = ({ rows, targets }) => {
  if (rows.length < 3) return null;
  let worst: { key: NutrientKey; ratio: number } | null = null;
  for (const info of NUTRIENT_LIST) {
    const t = targets[info.key];
    if (info.goal === 'max' || t.lo <= 0) continue;
    const avg = rows.reduce((s, r) => s + r.nutrients[info.key], 0) / rows.length;
    const ratio = avg / t.lo;
    if (!worst || ratio < worst.ratio) worst = { key: info.key, ratio };
  }
  if (!worst || worst.ratio >= 0.95) {
    return {
      id: 'nutrients-ok',
      tone: 'good',
      title: '栄養のバランスは良好です',
      body: 'どの栄養素も、夕食の目標をおおむね満たしています。',
    };
  }
  const info = NUTRIENTS[worst.key];
  return {
    id: 'weak-nutrient',
    tone: 'warn',
    title: `${info.label}が不足ぎみ（目標の ${Math.round(worst.ratio * 100)}%）`,
    body: `${info.label}を多く含む料理を献立に入れると補えます。朝食・昼食で補うのも手です。`,
    dishes: richDishes(worst.key),
  };
};

const saltDays: InsightRule = ({ rows, targets }) => {
  if (rows.length === 0) return null;
  const over = rows.filter((r) => r.nutrients.salt > targets.salt.hi * 1.05).length;
  const ratio = over / rows.length;
  if (ratio < 0.3) return null;
  return {
    id: 'salt',
    tone: 'warn',
    title: `塩分が多い日が ${over} 日（${Math.round(ratio * 100)}%）`,
    body: '汁物を 1 日おきにする、しょうゆ・みそを少し控える、酢やだし・香味野菜で味を補うと減らせます。',
  };
};

const proteinBalance: InsightRule = ({ rows }) => {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.protein) counts.set(r.protein, (counts.get(r.protein) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total < 5) return null;
  const fish = counts.get('fish') ?? 0;
  if (fish / total < 0.2) {
    return {
      id: 'fish',
      tone: 'info',
      title: '魚の日が少なめです',
      body: `主菜 ${total} 回のうち魚は ${fish} 回。魚はビタミン D や良質な脂の大切な供給源です。さば缶なら手軽で日持ちもします。`,
      dishes: ['saba-can-daikon', 'salmon-foil', 'saba-miso'],
    };
  }
  return null;
};

const seasonal: InsightRule = ({ rows, month }) => {
  if (rows.length < 3) return null;
  const avg = rows.reduce((s, r) => s + r.seasonality, 0) / rows.length;
  const used = new Set(
    rows.flatMap((r) => r.dishes.flatMap((d) => d.ingredients.map((i) => i.foodId))),
  );
  const unused = [...FOOD_MAP.values()].filter(
    (f) => !f.pantry && f.peakMonths.length <= 4 && isInSeason(f, month) && !used.has(f.id),
  );
  if (avg >= 0.3) {
    return {
      id: 'season-good',
      tone: 'good',
      title: '旬の食材をよく使えています',
      body: `料理に占める旬の食材の割合は平均 ${Math.round(avg * 100)}% です。`,
    };
  }
  if (unused.length === 0) return null;
  return {
    id: 'season',
    tone: 'info',
    title: `今が旬：${unused
      .slice(0, 3)
      .map((f) => f.name)
      .join('・')}`,
    body: '旬の食材は味が良く、値段も手ごろです。料理ページの「今が旬」から探せます。',
  };
};

const cooking: InsightRule = ({ rows }) => {
  const past = rows.filter((r) => r.date <= new Date().toISOString().slice(0, 10));
  if (past.length < 3) return null;
  const done = past.filter((r) => r.done).length;
  const rate = done / past.length;
  if (rate >= 0.7) {
    return {
      id: 'streak',
      tone: 'good',
      title: `献立どおりに作れた日：${done}/${past.length} 日`,
      body: 'すばらしい継続です。この調子で！',
    };
  }
  return {
    id: 'done-rate',
    tone: 'info',
    title: `記録のある日：${done}/${past.length} 日`,
    body: '作った日に「作ったら記録」を押すと、続けられているかが見えるようになります。忙しい日は時短の案を選ぶのもおすすめです。',
  };
};

const favorites: InsightRule = ({ rows }) => {
  const counts = new Map<string, number>();
  for (const r of rows)
    for (const d of r.dishes) if (d.role === 'main') counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 3) return null;
  return {
    id: 'repeat',
    tone: 'info',
    title: `「${getDish(top[0])?.name}」が ${top[1]} 回登場`,
    body: '好きな料理なら料理ページで「好き」にしておくと、くり返しの間隔を空けつつ優先されます。',
  };
};

export const INSIGHT_RULES: InsightRule[] = [
  weakestNutrient,
  saltDays,
  proteinBalance,
  seasonal,
  cooking,
  favorites,
];

export function computeInsights(ctx: InsightContext): Insight[] {
  return INSIGHT_RULES.flatMap((rule) => {
    const r = rule(ctx);
    return r ? (Array.isArray(r) ? r : [r]) : [];
  });
}
