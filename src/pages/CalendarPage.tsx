import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DayDetailDialog } from '@/features/plan/DayDetailDialog';
import { GenerateDialog } from '@/features/plan/GenerateDialog';
import { clearPlans } from '@/features/plan/repository';
import { useNextStart } from '@/features/plan/useNextStart';
import { usePlansInRange } from '@/features/plan/usePlans';
import { getDish } from '@/lib/food/catalog';
import type { DayPlan } from '@/lib/db/types';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils/cn';
import { toKey, todayKey } from '@/lib/utils/date';

const WEEK_OPTS = { weekStartsOn: 1 as const };

function dayLabelClass(d: Date) {
  const w = d.getDay();
  return w === 0
    ? 'text-rose-600 dark:text-rose-400'
    : w === 6
      ? 'text-sky-600 dark:text-sky-400'
      : '';
}

/** PC: 月のカレンダー */
function MonthGrid({
  anchor,
  plans,
  onPick,
}: {
  anchor: Date;
  plans: Map<string, DayPlan>;
  onPick: (d: string) => void;
}) {
  const start = startOfWeek(startOfMonth(anchor), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(anchor), WEEK_OPTS);
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const today = todayKey();
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-medium text-slate-500 dark:border-slate-800">
        {['月', '火', '水', '木', '金', '土', '日'].map((w, i) => (
          <div
            key={w}
            className={cn('py-2', i === 5 && 'text-sky-600', i === 6 && 'text-rose-600')}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = toKey(d);
          const plan = plans.get(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={cn(
                'min-h-28 border-r border-b border-slate-100 p-1.5 text-left align-top transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40',
                !isSameMonth(d, anchor) && 'opacity-40',
              )}
            >
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                    dayLabelClass(d),
                    key === today && 'bg-accent-600 text-white dark:bg-accent-500',
                  )}
                >
                  {d.getDate()}
                </span>
                {plan?.done && <CheckCircle2 className="size-3.5 text-emerald-600" />}
              </div>
              {plan && (
                <ul className="mt-1 space-y-0.5 text-[0.7rem] leading-tight">
                  {plan.dishes.map((id, i) => (
                    <li
                      key={id}
                      className={cn(
                        'truncate',
                        i === 0 ? 'font-semibold' : 'text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {getDish(id)?.name}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** スマホ: 週のリスト */
function WeekList({
  anchor,
  plans,
  onPick,
}: {
  anchor: Date;
  plans: Map<string, DayPlan>;
  onPick: (d: string) => void;
}) {
  const start = startOfWeek(anchor, WEEK_OPTS);
  const today = todayKey();
  return (
    <ul className="space-y-2">
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
        const key = toKey(d);
        const plan = plans.get(key);
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onPick(key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50',
                key === today
                  ? 'border-accent-400 dark:border-accent-600'
                  : 'border-slate-200 dark:border-slate-800',
              )}
            >
              <div className={cn('w-10 shrink-0 text-center', dayLabelClass(d))}>
                <div className="text-lg leading-none font-bold tabular-nums">{d.getDate()}</div>
                <div className="text-[0.7rem]">{format(d, 'E', { locale: ja })}</div>
              </div>
              {plan ? (
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{getDish(plan.dishes[0])?.name}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {plan.dishes
                      .slice(1)
                      .map((id) => getDish(id)?.name)
                      .join('・')}
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-sm text-slate-400">献立なし</div>
              )}
              {plan?.done && <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function CalendarPage() {
  const wide = useMediaQuery('(min-width: 768px)');
  const [anchor, setAnchor] = useState(() => new Date());
  const [picked, setPicked] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genStart, setGenStart] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const nextStart = useNextStart();

  const range = useMemo(() => {
    const s = wide ? startOfWeek(startOfMonth(anchor), WEEK_OPTS) : startOfWeek(anchor, WEEK_OPTS);
    const e = wide ? endOfWeek(endOfMonth(anchor), WEEK_OPTS) : endOfWeek(anchor, WEEK_OPTS);
    return { from: toKey(s), to: toKey(e) };
  }, [anchor, wide]);
  const plans = usePlansInRange(range.from, range.to) ?? new Map<string, DayPlan>();

  const move = (dir: number) => setAnchor((a) => (wide ? addMonths(a, dir) : addDays(a, dir * 7)));
  const title = wide
    ? format(anchor, 'yyyy年M月')
    : `${format(parseISO(range.from), 'M/d')} 〜 ${format(parseISO(range.to), 'M/d')}`;

  return (
    <>
      <PageHeader
        title="カレンダー"
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="表示中の献立をクリア"
              title="表示中の献立をクリア"
              onClick={() => setConfirmClear(true)}
              disabled={plans.size === 0}
            >
              <Trash2 />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setGenStart(null);
                setGenOpen(true);
              }}
            >
              <Sparkles />
              <span className="max-sm:sr-only">献立を作る</span>
            </Button>
          </>
        }
      />
      <PageBody wide>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="前へ" onClick={() => move(-1)}>
            <ChevronLeft />
          </Button>
          <h2 className="min-w-0 flex-1 text-center font-semibold tabular-nums">{title}</h2>
          <Button size="sm" onClick={() => setAnchor(new Date())}>
            今日
          </Button>
          <Button variant="ghost" size="icon" aria-label="次へ" onClick={() => move(1)}>
            <ChevronRight />
          </Button>
        </div>
        {wide ? (
          <MonthGrid anchor={anchor} plans={plans} onPick={setPicked} />
        ) : (
          <WeekList anchor={anchor} plans={plans} onPick={setPicked} />
        )}
        {plans.size === 0 && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            右上の「献立を作る」で、数日分の献立をまとめて計算できます。
          </p>
        )}
      </PageBody>
      <DayDetailDialog
        date={picked}
        onClose={() => setPicked(null)}
        onGenerate={(d) => {
          setPicked(null);
          setGenStart(d);
          setGenOpen(true);
        }}
      />
      <GenerateDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        defaultStart={genStart ?? nextStart}
      />
      <ConfirmDialog
        open={confirmClear}
        title="表示中の献立をクリアしますか？"
        description={`${title} の献立（${plans.size} 日分）と、関係する買い物リストを消します。`}
        confirmLabel="クリアする"
        danger
        onConfirm={() =>
          void clearPlans(range.from, range.to).then((n) =>
            toast.success(`${n} 日分の献立をクリアしました`),
          )
        }
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
