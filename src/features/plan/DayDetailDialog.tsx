import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeftRight, CheckCircle2, Circle, Clock, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { RoleBadge } from '@/features/dishes/RoleBadge';
import { usePrefs } from '@/features/prefs/prefsStore';
import { useSettings } from '@/features/settings/settingsStore';
import { FOOD_MAP, dishNutrition, getDish } from '@/lib/food/catalog';
import { householdDailyTargets, mealTargets } from '@/lib/food/reference';
import type { Dish } from '@/lib/food/types';
import { rankAlternatives, type Alternative } from '@/lib/planner/alternatives';
import { mealNutrition, nutritionScore } from '@/lib/planner/evaluate';
import { effectiveMinutes } from '@/lib/planner/scoring';
import { cn } from '@/lib/utils/cn';
import { formatAmount, formatYen } from '@/lib/utils/format';
import { NutritionBars } from './NutritionBars';
import { scoreClass } from './nutritionStatus';
import { loadPlanContext, setDone, swapDish } from './repository';
import { usePlan } from './usePlans';

function grams(foodId: string, g: number): string {
  const f = FOOD_MAP.get(foodId);
  if (f?.pieceGrams && g >= f.pieceGrams * 0.4) {
    const n = Math.round((g / f.pieceGrams) * 2) / 2;
    return `${n}${f.pieceLabel}`;
  }
  return `${formatAmount(g)}g`;
}

function Alternatives({
  date,
  index,
  onDone,
}: {
  date: string;
  index: number;
  onDone: () => void;
}) {
  const plan = usePlan(date);
  const prefs = usePrefs();
  const [list, setList] = useState<Alternative[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!plan) return;
    void loadPlanContext(plan.planId).then((loaded) => {
      if (!alive || !loaded) return;
      const day = loaded.dates.indexOf(date);
      setList(rankAlternatives(loaded.ctx, loaded.days, day, index, prefs));
    });
    return () => {
      alive = false;
    };
  }, [plan, date, index, prefs]);

  if (!list)
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
        <Loader2 className="size-3.5 animate-spin" />
        候補を計算中…
      </div>
    );
  return (
    <ul className="mt-2 space-y-1">
      {list.map((a) => (
        <li key={a.dish.id}>
          <button
            type="button"
            onClick={() => {
              void swapDish(date, index, a.dish.id).then(() => {
                toast.success(`${a.dish.name}に差し替えました`);
                onDone();
              });
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.dish.name}</span>
              <span className="flex flex-wrap gap-1 pt-0.5">
                {a.reasons.map((r) => (
                  <span
                    key={r}
                    className="rounded bg-emerald-50 px-1 text-[0.65rem] text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    {r}
                  </span>
                ))}
              </span>
            </span>
            <span className="shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {a.deltaCost > 0
                ? `+${formatYen(a.deltaCost)}`
                : a.deltaCost < 0
                  ? `−${formatYen(-a.deltaCost)}`
                  : '±0円'}
              <br />
              {a.dish.minutes}分
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DishBlock({
  dish,
  servings,
  date,
  index,
}: {
  dish: Dish;
  servings: number;
  date: string;
  index: number;
}) {
  const [swap, setSwap] = useState(false);
  const n = dishNutrition(dish);
  return (
    <li className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start gap-2">
        <RoleBadge role={dish.role} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{dish.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {dish.minutes}分・{Math.round(n.energy)}kcal・たんぱく質 {formatAmount(n.protein)}
            g・塩分 {formatAmount(n.salt)}g
          </div>
        </div>
        <Button
          size="sm"
          variant={swap ? 'secondary' : 'ghost'}
          onClick={() => setSwap(!swap)}
          aria-expanded={swap}
        >
          <ArrowLeftRight />
          差し替え
        </Button>
      </div>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{dish.howto}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        材料（{formatAmount(servings)}人前）:{' '}
        {dish.ingredients
          .map(
            (i) =>
              `${FOOD_MAP.get(i.foodId)?.name ?? i.foodId} ${grams(i.foodId, i.grams * servings)}`,
          )
          .join('、')}
      </p>
      {swap && <Alternatives date={date} index={index} onDone={() => setSwap(false)} />}
    </li>
  );
}

/** 1 日の献立の詳細（料理・材料・栄養・差し替え） */
export function DayDetailDialog({
  date,
  onClose,
  onGenerate,
}: {
  date: string | null;
  onClose: () => void;
  onGenerate: (date: string) => void;
}) {
  const plan = usePlan(date ?? '');
  const members = useSettings((s) => s.members);
  const share = useSettings((s) => s.dinnerShare);
  const riceGrams = useSettings((s) => s.riceGrams);
  const targets = useMemo(
    () => mealTargets(householdDailyTargets(members), share),
    [members, share],
  );
  const dishes = (plan?.dishes ?? []).map(getDish).filter((x): x is Dish => !!x);
  const n = mealNutrition(dishes, riceGrams);
  const score = nutritionScore(n, targets);
  const title = date ? format(parseISO(date), 'M月d日（E）', { locale: ja }) : '';

  return (
    <Dialog open={date !== null} onClose={onClose} title={title}>
      {plan === null && date && (
        <div className="space-y-3 py-6 text-center text-sm">
          <p className="text-slate-500">この日の献立はまだありません。</p>
          <Button variant="primary" onClick={() => onGenerate(date)}>
            この日から献立を作る
          </Button>
        </div>
      )}
      {plan && date && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              栄養スコア <strong className={cn('text-lg', scoreClass(score))}>{score}</strong>
            </span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="size-4" />約 {Math.round(effectiveMinutes(dishes))}分
            </span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Users className="size-4" />
              {plan.servings}人前
            </span>
            <Button
              size="sm"
              variant={plan.done ? 'secondary' : 'ghost'}
              className="ml-auto"
              onClick={() => void setDone(date, !plan.done)}
            >
              {plan.done ? <CheckCircle2 className="text-emerald-600" /> : <Circle />}
              {plan.done ? '作った' : '作ったら記録'}
            </Button>
          </div>
          <ul className="space-y-2">
            {dishes.map((d, i) => (
              <DishBlock key={d.id} dish={d} servings={plan.servings} date={date} index={i} />
            ))}
          </ul>
          {!dishes.some((d) => d.includesStaple) && riceGrams > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ＋ ご飯 {riceGrams}g（1 人分）を含めて栄養を計算しています
            </p>
          )}
          <div>
            <h3 className="mb-2 text-sm font-semibold">栄養（1 人分・夕食の目標に対して）</h3>
            <NutritionBars nutrients={n} targets={targets} />
          </div>
        </div>
      )}
    </Dialog>
  );
}
