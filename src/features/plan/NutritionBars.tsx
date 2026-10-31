import { NUTRIENTS, NUTRIENT_LIST } from '@/lib/food/nutrients';
import type { Targets } from '@/lib/food/reference';
import type { NutrientKey, Nutrients } from '@/lib/food/types';
import { cn } from '@/lib/utils/cn';
import { formatAmount } from '@/lib/utils/format';
import { nutrientStatus, type NutrientStatus } from './nutritionStatus';

const BAR_CLASS: Record<NutrientStatus, string> = {
  ok: 'bg-emerald-500 dark:bg-emerald-600',
  low: 'bg-amber-400 dark:bg-amber-600',
  high: 'bg-rose-500 dark:bg-rose-600',
};

/**
 * 栄養素ごとの達成度のバー。
 * 目盛り: 下限（または上限）を 100% として、150% までを表示する。
 */
export function NutritionBars({
  nutrients,
  targets,
  keys = NUTRIENT_LIST.map((n) => n.key),
  compact,
}: {
  nutrients: Nutrients;
  targets: Targets;
  keys?: NutrientKey[];
  compact?: boolean;
}) {
  return (
    <ul className={cn('grid gap-x-6', compact ? 'gap-y-1.5' : 'gap-y-2 sm:grid-cols-2')}>
      {keys.map((k) => {
        const info = NUTRIENTS[k];
        const v = nutrients[k];
        const t = targets[k];
        const base = t.lo > 0 ? t.lo : t.hi;
        const ratio = base > 0 && Number.isFinite(base) ? v / base : 0;
        const status = nutrientStatus(k, v, targets);
        const goal =
          info.goal === 'max'
            ? `${formatAmount(t.hi)}${info.unit} 以下`
            : info.goal === 'range'
              ? `${formatAmount(t.lo)}〜${formatAmount(t.hi)}${info.unit}`
              : `${formatAmount(t.lo)}${info.unit} 以上`;
        return (
          <li key={k} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium">{info.label}</span>
              <span className="truncate text-slate-500 tabular-nums dark:text-slate-400">
                {formatAmount(v)}
                {info.unit}
                <span className="ml-1 text-slate-400 dark:text-slate-500">/ {goal}</span>
              </span>
            </div>
            <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={cn('h-full rounded-full transition-all', BAR_CLASS[status])}
                style={{ width: `${Math.min(100, (ratio / 1.5) * 100)}%` }}
              />
              <div className="absolute inset-y-0 left-2/3 w-px bg-slate-400/70 dark:bg-slate-500" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
