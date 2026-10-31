import { Ban, Heart, Minus, ThumbsDown } from 'lucide-react';
import type { Pref } from '@/lib/planner/types';
import { cn } from '@/lib/utils/cn';
import { PREF_LABELS } from './prefsStore';

const ITEMS: { value: Pref; icon: typeof Heart; active: string }[] = [
  {
    value: 'like',
    icon: Heart,
    active: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  {
    value: 'neutral',
    icon: Minus,
    active: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
  {
    value: 'dislike',
    icon: ThumbsDown,
    active: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    value: 'never',
    icon: Ban,
    active: 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900',
  },
];

/** 好き・ふつう・苦手・使わない の切り替え */
export function PrefToggle({
  value,
  onChange,
  label,
}: {
  value: Pref;
  onChange: (p: Pref) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`${label}の好み`}
      className="flex shrink-0 rounded-xl border border-slate-200 p-0.5 dark:border-slate-700"
    >
      {ITEMS.map(({ value: v, icon: Icon, active }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={PREF_LABELS[v]}
          title={PREF_LABELS[v]}
          onClick={() => onChange(v)}
          className={cn(
            'flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200',
            value === v && active,
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
