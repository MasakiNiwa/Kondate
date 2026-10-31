import type { Activity, AgeBand, Member, Sex } from '@/features/settings/settingsStore';
import type { NutrientKey, Nutrients } from './types';
import { NUTRIENT_KEYS } from './types';

/**
 * 日本人の食事摂取基準（2025 年版）をもとに、アプリ向けに簡略化した 1 日の目安。
 * 推奨量（RDA）・目安量（AI）・目標量（DG）のうち、献立づくりに使いやすいものを選んでいる。
 * 並び: エネルギー(活動ふつう), たんぱく質, 食物繊維(以上), 食塩(未満), Ca, 鉄, V.A, V.D, B1, B2, V.C, K(以上)
 */
type Row = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

const TABLE: Record<Sex, Record<AgeBand, Row>> = {
  m: {
    '6-7': [1550, 30, 10, 4.5, 600, 5.5, 400, 4.5, 0.8, 0.9, 50, 1800],
    '8-9': [1850, 40, 11, 5, 650, 7, 500, 5, 1, 1.1, 60, 2000],
    '10-11': [2250, 45, 13, 6, 700, 8.5, 600, 6.5, 1.2, 1.4, 70, 2200],
    '12-14': [2600, 60, 17, 7, 1000, 10, 800, 8, 1.4, 1.6, 90, 2400],
    '15-17': [2800, 65, 19, 7.5, 800, 10, 900, 9, 1.5, 1.7, 100, 3000],
    '18-29': [2650, 65, 22, 7.5, 800, 7.5, 850, 9, 1.4, 1.6, 100, 3000],
    '30-49': [2700, 65, 22, 7.5, 750, 7.5, 900, 9, 1.4, 1.6, 100, 3000],
    '50-64': [2600, 65, 22, 7.5, 750, 7.5, 900, 9, 1.3, 1.5, 100, 3000],
    '65-74': [2400, 60, 21, 7.5, 750, 7, 850, 9, 1.3, 1.5, 100, 3000],
    '75+': [2100, 60, 20, 7.5, 700, 7, 800, 9, 1.2, 1.3, 100, 3000],
  },
  f: {
    '6-7': [1450, 30, 10, 4.5, 550, 5.5, 400, 4.5, 0.8, 0.9, 50, 1800],
    '8-9': [1700, 40, 11, 5, 750, 7.5, 500, 5, 0.9, 1, 60, 2000],
    '10-11': [2100, 50, 13, 6, 750, 8.5, 600, 6.5, 1.1, 1.3, 70, 2000],
    '12-14': [2400, 55, 16, 6.5, 800, 12, 700, 8, 1.3, 1.4, 90, 2400],
    '15-17': [2300, 55, 18, 6.5, 650, 10.5, 650, 9, 1.2, 1.4, 100, 2600],
    '18-29': [2000, 50, 18, 6.5, 650, 10.5, 650, 9, 1.1, 1.2, 100, 2600],
    '30-49': [2050, 50, 18, 6.5, 650, 10.5, 700, 9, 1.1, 1.2, 100, 2600],
    '50-64': [1950, 50, 18, 6.5, 650, 6.5, 700, 9, 1.1, 1.2, 100, 2600],
    '65-74': [1850, 50, 18, 6.5, 650, 6, 700, 9, 1.1, 1.2, 100, 2600],
    '75+': [1650, 50, 17, 6.5, 600, 6, 650, 9, 0.9, 1, 100, 2600],
  },
};

const ACTIVITY_FACTOR: Record<Activity, number> = { low: 0.86, normal: 1, high: 1.14 };

/** 1 日の目標。lo: 下限（なければ 0）、hi: 上限（なければ Infinity） */
export interface Target {
  lo: number;
  hi: number;
}
export type Targets = Record<NutrientKey, Target>;

/** 1 人の 1 日の目標 */
export function dailyTargets(m: Pick<Member, 'sex' | 'age' | 'activity'>): Targets {
  const [energy, protein, fiber, salt, ca, fe, va, vd, b1, b2, vc, k] = TABLE[m.sex][m.age];
  const e = energy * ACTIVITY_FACTOR[m.activity];
  return {
    energy: { lo: e * 0.9, hi: e * 1.1 },
    protein: { lo: Math.max(protein, (e * 0.13) / 4), hi: (e * 0.2) / 4 },
    fat: { lo: (e * 0.2) / 9, hi: (e * 0.3) / 9 },
    carbs: { lo: (e * 0.5) / 4, hi: (e * 0.65) / 4 },
    fiber: { lo: fiber, hi: Infinity },
    salt: { lo: 0, hi: salt },
    calcium: { lo: ca, hi: 2500 },
    iron: { lo: fe, hi: Infinity },
    vitA: { lo: va, hi: 2700 },
    vitD: { lo: vd, hi: 100 },
    vitB1: { lo: b1, hi: Infinity },
    vitB2: { lo: b2, hi: Infinity },
    vitC: { lo: vc, hi: Infinity },
    potassium: { lo: k, hi: Infinity },
  };
}

/** 家族の平均（1 人分）の 1 日の目標 */
export function householdDailyTargets(
  members: Pick<Member, 'sex' | 'age' | 'activity'>[],
): Targets {
  const list =
    members.length > 0
      ? members
      : [{ sex: 'f' as const, age: '30-49' as const, activity: 'normal' as const }];
  const all = list.map(dailyTargets);
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => {
      const lo = all.reduce((s, t) => s + t[k].lo, 0) / all.length;
      const hi = all.reduce((s, t) => s + t[k].hi, 0) / all.length;
      return [k, { lo, hi }];
    }),
  ) as Targets;
}

/** 夕食 1 回分の目標（1 日の目標 × 割合） */
export function mealTargets(daily: Targets, share: number): Targets {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, { lo: daily[k].lo * share, hi: daily[k].hi * share }]),
  ) as Targets;
}

/** 人数分の量の倍率（エネルギーの目安の比で、子どもは少なめ・よく動く人は多め） */
export function portionFactor(m: Pick<Member, 'sex' | 'age' | 'activity'>): number {
  // 30〜49 歳女性（ふつう）を 1 人前とし、0.1 人前単位に丸める
  const base = 2050;
  return Math.round((TABLE[m.sex][m.age][0] * ACTIVITY_FACTOR[m.activity] * 10) / base) / 10;
}

/** 量の合計（人前）。1 人前 = 1.0 */
export function totalServings(members: Pick<Member, 'sex' | 'age' | 'activity'>[]): number {
  return Math.max(
    0.5,
    members.reduce((s, m) => s + portionFactor(m), 0),
  );
}

/** 達成度（0〜1 を基準。下限に届かないと 1 未満、上限を超えると 1 より大きい） */
export function achievement(value: number, t: Target): number {
  if (t.lo > 0) return value / t.lo;
  if (Number.isFinite(t.hi)) return value / t.hi;
  return 1;
}

export function emptyTargets(): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients;
}
