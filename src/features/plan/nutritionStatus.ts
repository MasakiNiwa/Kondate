import type { Targets } from '@/lib/food/reference';
import type { NutrientKey } from '@/lib/food/types';

export type NutrientStatus = 'ok' | 'low' | 'high';

export function nutrientStatus(key: NutrientKey, value: number, t: Targets): NutrientStatus {
  const { lo, hi } = t[key];
  if (lo > 0 && value < lo * 0.9) return 'low';
  if (Number.isFinite(hi) && value > hi * 1.05) return 'high';
  return 'ok';
}

/** 栄養スコアの色 */
export function scoreClass(score: number): string {
  if (score >= 85) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 70) return 'text-amber-700 dark:text-amber-400';
  return 'text-rose-700 dark:text-rose-400';
}
