import { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CheckCircle2, ChevronRight, Circle, Leaf, ShoppingBasket, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RoleBadge } from '@/features/dishes/RoleBadge';
import { DayDetailDialog } from '@/features/plan/DayDetailDialog';
import { GenerateDialog } from '@/features/plan/GenerateDialog';
import { NutritionBars } from '@/features/plan/NutritionBars';
import { scoreClass } from '@/features/plan/nutritionStatus';
import { setDone } from '@/features/plan/repository';
import { useNextStart } from '@/features/plan/useNextStart';
import { usePlansInRange } from '@/features/plan/usePlans';
import { useShoppingTrips } from '@/features/shopping/useShopping';
import { useSettings } from '@/features/settings/settingsStore';
import { getDish, isInSeason } from '@/lib/food/catalog';
import { SEASON_LABELS, seasonOf } from '@/lib/food/climate';
import { FOODS } from '@/lib/food/foods';
import { householdDailyTargets, mealTargets } from '@/lib/food/reference';
import type { Dish } from '@/lib/food/types';
import { mealNutrition, nutritionScore } from '@/lib/planner/evaluate';
import { APP_TAGLINE } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toKey, todayKey } from '@/lib/utils/date';

export default function HomePage() {
  const today = todayKey();
  const end = toKey(addDays(new Date(), 6));
  const plans = usePlansInRange(today, end);
  const trips = useShoppingTrips();
  const nextStart = useNextStart();
  const [, navigate] = useLocation();
  const [genOpen, setGenOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const members = useSettings((s) => s.members);
  const share = useSettings((s) => s.dinnerShare);
  const riceGrams = useSettings((s) => s.riceGrams);
  const targets = useMemo(
    () => mealTargets(householdDailyTargets(members), share),
    [members, share],
  );

  const todayPlan = plans?.get(today);
  const dishes = (todayPlan?.dishes ?? []).map(getDish).filter((x): x is Dish => !!x);
  const n = mealNutrition(dishes, riceGrams);
  const score = nutritionScore(n, targets);
  const upcoming = [...(plans?.values() ?? [])]
    .filter((p) => p.date > today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextTrip = trips?.find((t) => t.items.some((i) => i.packs > 0 && !i.checked));
  const month = new Date().getMonth() + 1;
  const seasonal = FOODS.filter(
    (f) => !f.pantry && f.peakMonths.length <= 5 && isInSeason(f, month),
  );

  return (
    <>
      <PageHeader title="ホーム" />
      <PageBody>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {format(new Date(), 'M月d日（E）', { locale: ja })}
          </p>
          <h2 className="text-xl font-bold">今日の献立</h2>
        </div>

        {todayPlan ? (
          <Card className="space-y-3 p-4 sm:p-5">
            <ul className="space-y-2">
              {dishes.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(today)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <RoleBadge role={d.role} />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate',
                        d.role === 'main' ? 'text-lg font-bold' : 'font-medium',
                      )}
                    >
                      {d.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{d.minutes}分</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-sm">
                栄養スコア <strong className={cn('text-lg', scoreClass(score))}>{score}</strong>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPicked(today)}>
                くわしく
                <ChevronRight />
              </Button>
              <Button
                size="sm"
                variant={todayPlan.done ? 'secondary' : 'primary'}
                className="ml-auto"
                onClick={() => void setDone(today, !todayPlan.done)}
              >
                {todayPlan.done ? <CheckCircle2 /> : <Circle />}
                {todayPlan.done ? '作った！' : '作ったら記録'}
              </Button>
            </div>
            <NutritionBars
              nutrients={n}
              targets={targets}
              keys={['energy', 'protein', 'fiber', 'salt']}
              compact
            />
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <img src="./favicon.svg" alt="" className="size-14" />
            <p className="font-semibold">{APP_TAGLINE}</p>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              まとめ買い・栄養・旬・好みを同時に満たす数日分の献立を、数理最適化で計算します。
            </p>
            <Button variant="primary" size="lg" onClick={() => setGenOpen(true)}>
              <Sparkles />
              献立を作る
            </Button>
          </Card>
        )}

        {upcoming.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
              <h3 className="text-sm font-semibold">これからの献立</h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/calendar')}>
                カレンダー
                <ChevronRight />
              </Button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcoming.map((p) => (
                <li key={p.date}>
                  <button
                    type="button"
                    onClick={() => setPicked(p.date)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <span className="w-14 shrink-0 text-xs text-slate-500 tabular-nums">
                      {format(parseISO(p.date), 'M/d（E）', { locale: ja })}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {getDish(p.dishes[0])?.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingBasket className="size-4 text-accent-600" />
              買い物
            </div>
            {nextTrip ? (
              <>
                <p className="mt-2 text-sm">
                  {format(parseISO(nextTrip.date), 'M月d日（E）', { locale: ja })}の買い物：あと{' '}
                  <strong>{nextTrip.items.filter((i) => i.packs > 0 && !i.checked).length}</strong>{' '}
                  品
                </p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/shopping')}>
                  リストを見る
                </Button>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                買い物の予定はありません
              </p>
            )}
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Leaf className="size-4 text-emerald-600" />
              {SEASON_LABELS[seasonOf(month)]}の旬（{month}月）
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {seasonal.map((f) => (
                <span
                  key={f.id}
                  className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                >
                  {f.name.replace(/（.*）/, '')}
                </span>
              ))}
            </div>
          </Card>
        </div>
        {todayPlan && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setGenOpen(true)}>
              <Sparkles />
              続きの献立を作る
            </Button>
          </div>
        )}
      </PageBody>
      <GenerateDialog open={genOpen} onClose={() => setGenOpen(false)} defaultStart={nextStart} />
      <DayDetailDialog
        date={picked}
        onClose={() => setPicked(null)}
        onGenerate={() => {
          setPicked(null);
          setGenOpen(true);
        }}
      />
    </>
  );
}
