import { useMemo, useState } from 'react';
import { addDays, subDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChartPie, Info, Lightbulb, TriangleAlert, ThumbsUp } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { ComingSoon } from '@/components/ComingSoon';
import { ANALYSIS_TOOLS } from '@/features/analysis/registry';
import { DayDetailDialog } from '@/features/plan/DayDetailDialog';
import { scoreClass } from '@/features/plan/nutritionStatus';
import { useSettings } from '@/features/settings/settingsStore';
import { buildRows } from '@/lib/analysis/dataset';
import { computeInsights, type Insight } from '@/lib/analysis/insights';
import { getDish } from '@/lib/food/catalog';
import { householdDailyTargets, mealTargets } from '@/lib/food/reference';
import { db } from '@/lib/db/db';
import { cn } from '@/lib/utils/cn';
import { toKey } from '@/lib/utils/date';
import { formatPercent, formatYen } from '@/lib/utils/format';

type Period = 'past7' | 'past30' | 'past90' | 'next14';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'past7', label: '過去 7 日' },
  { id: 'past30', label: '過去 30 日' },
  { id: 'past90', label: '過去 90 日' },
  { id: 'next14', label: 'これから 14 日' },
];

function range(p: Period): [string, string] {
  const now = new Date();
  if (p === 'next14') return [toKey(now), toKey(addDays(now, 13))];
  const days = p === 'past7' ? 7 : p === 'past30' ? 30 : 90;
  return [toKey(subDays(now, days - 1)), toKey(now)];
}

function Tile({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <Card className="p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn('mt-0.5 text-2xl font-bold tabular-nums', className)}>{value}</div>
      {sub && <div className="text-[0.7rem] text-slate-400">{sub}</div>}
    </Card>
  );
}

const TONE = {
  good: { icon: ThumbsUp, cls: 'text-emerald-600 dark:text-emerald-400', label: '良い点' },
  warn: { icon: TriangleAlert, cls: 'text-amber-600 dark:text-amber-400', label: '注意' },
  info: { icon: Info, cls: 'text-sky-600 dark:text-sky-400', label: 'ヒント' },
};

function InsightCard({ insight }: { insight: Insight }) {
  const t = TONE[insight.tone];
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <t.icon className={cn('mt-0.5 size-5 shrink-0', t.cls)} aria-label={t.label} />
      <div className="min-w-0 text-sm">
        <div className="font-semibold">{insight.title}</div>
        <p className="mt-0.5 text-slate-600 dark:text-slate-300">{insight.body}</p>
        {insight.dishes && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {insight.dishes.map((id) => (
              <span
                key={id}
                className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800"
              >
                {getDish(id)?.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export default function AnalysisPage() {
  const [period, setPeriod] = useState<Period>('past30');
  const [tool, setTool] = useState(ANALYSIS_TOOLS[0].id);
  const [picked, setPicked] = useState<string | null>(null);
  const members = useSettings((s) => s.members);
  const share = useSettings((s) => s.dinnerShare);
  const riceGrams = useSettings((s) => s.riceGrams);
  const targets = useMemo(
    () => mealTargets(householdDailyTargets(members), share),
    [members, share],
  );
  const [from, to] = range(period);
  const plans = useLiveQuery(
    () => db.plans.where('date').between(from, to, true, true).toArray(),
    [from, to],
  );
  const rows = useMemo(
    () => buildRows({ plans: plans ?? [], targets, riceGrams }),
    [plans, targets, riceGrams],
  );
  const insights = useMemo(
    () => computeInsights({ rows, targets, month: new Date().getMonth() + 1 }),
    [rows, targets],
  );
  const Tool = ANALYSIS_TOOLS.find((t) => t.id === tool)!;
  const n = rows.length;
  const avgScore = n ? Math.round(rows.reduce((s, r) => s + r.score, 0) / n) : 0;
  const servings = rows.reduce((s, r) => s + r.servings, 0);
  const cost = servings ? rows.reduce((s, r) => s + r.foodCost, 0) / servings : 0;
  const past = rows.filter((r) => r.date <= toKey(new Date()));
  const doneRate = past.length ? past.filter((r) => r.done).length / past.length : 0;
  const season = n ? rows.reduce((s, r) => s + r.seasonality, 0) / n : 0;

  return (
    <>
      <PageHeader title="分析" />
      <PageBody wide>
        <div className="flex flex-wrap gap-2" role="group" aria-label="期間">
          {PERIODS.map((p) => (
            <Chip key={p.id} active={period === p.id} onClick={() => setPeriod(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
        {plans && n === 0 ? (
          <ComingSoon icon={<ChartPie />} title="この期間の献立がありません">
            献立を作ると、栄養・費用・献立の傾向を分析して、気づきをお伝えします。
          </ComingSoon>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile
                label="献立の日数"
                value={`${n}日`}
                sub={period === 'next14' ? '予定' : `作った記録 ${formatPercent(doneRate)}`}
              />
              <Tile
                label="平均の栄養スコア"
                value={`${avgScore}`}
                className={scoreClass(avgScore)}
                sub="100 点満点"
              />
              <Tile
                label="1 食あたりの食材費"
                value={formatYen(cost)}
                sub="1 人前・使った分の目安"
              />
              <Tile label="旬の食材" value={formatPercent(season)} sub="料理に占める割合" />
            </div>
            <Card className="overflow-hidden">
              <h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-semibold sm:px-5 dark:border-slate-800">
                <Lightbulb className="size-4 text-amber-500" />
                気づき
              </h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {insights.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
                {insights.length === 0 && (
                  <li className="px-4 py-3 text-sm text-slate-500">
                    データが増えると、気づきが表示されます。
                  </li>
                )}
              </ul>
            </Card>
            <Card className="space-y-3 p-4 sm:p-5">
              <Tabs
                value={tool}
                onChange={setTool}
                items={ANALYSIS_TOOLS.map((t) => ({
                  value: t.id,
                  label: t.label,
                  icon: <t.icon className="size-4" />,
                }))}
              />
              <p className="text-xs text-slate-400">{Tool.description}</p>
              <Tool.Component
                rows={rows}
                targets={targets}
                riceGrams={riceGrams}
                onPickDay={setPicked}
              />
            </Card>
          </>
        )}
      </PageBody>
      <DayDetailDialog
        date={picked}
        onClose={() => setPicked(null)}
        onGenerate={() => setPicked(null)}
      />
    </>
  );
}
