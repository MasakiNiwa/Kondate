import { useCallback, useState, type ReactNode } from 'react';
import type { ToolProps } from './registry';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { FOOD_MAP, getDish } from '@/lib/food/catalog';
import { NUTRIENTS, NUTRIENT_LIST } from '@/lib/food/nutrients';
import type { NutrientKey } from '@/lib/food/types';
import { contributions, foodUsage, type DayRow } from '@/lib/analysis/dataset';
import { formatAmount, formatYen } from '@/lib/utils/format';
import { EChart, type ChartTheme } from './EChart';

const axisCommon = (t: ChartTheme) => ({
  axisLine: { lineStyle: { color: t.grid } },
  axisTick: { show: false },
  axisLabel: { color: t.muted, fontSize: 11 },
  splitLine: { lineStyle: { color: t.grid, type: 'dashed' as const } },
});

function Drill({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <h4 className="flex-1 text-sm font-semibold">{title}</h4>
        <Button size="sm" variant="ghost" onClick={onClose}>
          閉じる
        </Button>
      </div>
      {children}
    </div>
  );
}

function ShareList({
  items,
  unit,
  total,
}: {
  items: [string, number][];
  unit: string;
  total: number;
}) {
  return (
    <ul className="space-y-1 text-xs">
      {items.map(([name, v]) => (
        <li key={name} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate">{name}</span>
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--viz-1)]"
              style={{ width: `${(v / total) * 100}%` }}
            />
          </span>
          <span className="w-24 shrink-0 text-right tabular-nums text-slate-500 dark:text-slate-400">
            {formatAmount(v)}
            {unit}（{Math.round((v / total) * 100)}%）
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---- 栄養 ----
export function NutritionTool({ rows, targets, riceGrams, onPickDay }: ToolProps) {
  const [key, setKey] = useState<NutrientKey | null>(null);
  const list = NUTRIENT_LIST.filter((n) => targets[n.key].lo > 0 || n.goal === 'max');
  const avg = (k: NutrientKey) =>
    rows.reduce((s, r) => s + r.nutrients[k], 0) / Math.max(1, rows.length);
  const pct = (k: NutrientKey) => {
    const t = targets[k];
    const goal = NUTRIENTS[k].goal;
    // 範囲が目標の栄養素（エネルギー・脂質・炭水化物）は、範囲の中央を 100% とする
    const base = goal === 'max' ? t.hi : goal === 'range' ? (t.lo + t.hi) / 2 : t.lo;
    return Math.round((avg(k) / base) * 100);
  };
  const option = useCallback(
    (t: ChartTheme) => ({
      grid: { left: 84, right: 48, top: 8, bottom: 24 },
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number }) => `${p.name}: 目標の ${p.value}%`,
      },
      xAxis: {
        type: 'value',
        max: (v: { max: number }) => Math.max(150, Math.ceil(v.max / 25) * 25),
        ...axisCommon(t),
        axisLabel: { color: t.muted, formatter: '{value}%' },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: list.map(
          (n) => n.label + (n.goal === 'max' ? '（上限）' : n.goal === 'range' ? '（中央）' : ''),
        ),
        ...axisCommon(t),
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: list.map((n) => pct(n.key)),
          barMaxWidth: 14,
          itemStyle: { color: t.series[0], borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: t.muted, fontSize: 11, formatter: '{c}%' },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: t.muted, type: 'solid' },
            label: { show: false },
            data: [{ xAxis: 100 }],
          },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, targets],
  );
  return (
    <>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        期間の平均（1
        人分）を、夕食の目標に対する割合で表示します。縦線が目標（100%）。塩分は上限に対する割合で、100%
        以下が目標です。棒を押すと、日ごとの推移と、どの料理・食材から来ているかを表示します。
      </p>
      <EChart
        ariaLabel="栄養素ごとの達成率"
        option={option}
        height={list.length * 26 + 40}
        onClick={(i) => setKey(list[i].key)}
      />
      {key && (
        <NutrientDrill
          k={key}
          rows={rows}
          targets={targets}
          riceGrams={riceGrams}
          onPickDay={onPickDay}
          onClose={() => setKey(null)}
        />
      )}
    </>
  );
}

function NutrientDrill({
  k,
  rows,
  targets,
  riceGrams,
  onPickDay,
  onClose,
}: ToolProps & { k: NutrientKey; onClose: () => void }) {
  const info = NUTRIENTS[k];
  const t = targets[k];
  const option = useCallback(
    (th: ChartTheme) => ({
      grid: { left: 44, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
      xAxis: {
        type: 'category',
        data: rows.map((r) => format(parseISO(r.date), 'M/d')),
        ...axisCommon(th),
        splitLine: { show: false },
      },
      yAxis: { type: 'value', ...axisCommon(th) },
      series: [
        {
          name: info.label,
          type: 'line',
          data: rows.map((r) => Math.round(r.nutrients[k] * 10) / 10),
          symbolSize: 8,
          lineStyle: { width: 2, color: th.series[0] },
          itemStyle: { color: th.series[0] },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: th.muted, type: 'dashed' },
            label: {
              color: th.muted,
              fontSize: 10,
              formatter: (p: { value: number }) => `目標 ${formatAmount(p.value)}`,
            },
            data: [
              ...(t.lo > 0 ? [{ yAxis: Math.round(t.lo * 10) / 10 }] : []),
              ...(Number.isFinite(t.hi) && info.goal !== 'min'
                ? [{ yAxis: Math.round(t.hi * 10) / 10 }]
                : []),
            ],
          },
        },
      ],
    }),
    [rows, k, t, info],
  );
  const c = contributions(rows, k, riceGrams);
  const totalD = c.dishes.reduce((s, [, v]) => s + v, 0) || 1;
  const totalF = c.foods.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <Drill title={`${info.label}（${info.unit}）の内訳`} onClose={onClose}>
      <EChart
        ariaLabel={`${info.label}の日ごとの推移`}
        option={option}
        height={200}
        onClick={(i) => onPickDay(rows[i].date)}
      />
      <p className="text-xs text-slate-500">点を押すと、その日の献立を開きます。</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h5 className="mb-1.5 text-xs font-semibold">料理から（上位）</h5>
          <ShareList
            items={c.dishes
              .slice(0, 6)
              .map(([id, v]) => [id === 'rice' ? 'ご飯' : (getDish(id)?.name ?? id), v])}
            unit={info.unit}
            total={totalD}
          />
        </div>
        <div>
          <h5 className="mb-1.5 text-xs font-semibold">食材から（上位）</h5>
          <ShareList
            items={c.foods.slice(0, 6).map(([id, v]) => [FOOD_MAP.get(id)?.name ?? id, v])}
            unit={info.unit}
            total={totalF}
          />
        </div>
      </div>
    </Drill>
  );
}

// ---- 献立の傾向 ----
const PROTEIN_LABELS: Record<string, string> = {
  chicken: '鶏肉',
  pork: '豚肉',
  beef: '牛肉',
  fish: '魚介',
  egg: '卵',
  soy: '大豆',
  mixed: 'ひき肉・加工品',
};
const CUISINE_LABELS: Record<string, string> = {
  japanese: '和食',
  western: '洋食',
  chinese: '中華',
  korean: '韓国風',
  ethnic: 'エスニック',
};

function CountBars({
  entries,
  label,
  onPick,
}: {
  entries: [string, number][];
  label: string;
  onPick: (i: number) => void;
}) {
  const option = useCallback(
    (t: ChartTheme) => ({
      grid: { left: 96, right: 36, top: 4, bottom: 4 },
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value} 回`,
      },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: entries.map((e) => e[0]),
        ...axisCommon(t),
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: entries.map((e) => e[1]),
          barMaxWidth: 14,
          itemStyle: { color: t.series[0], borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: 'right',
            color: t.muted,
            fontSize: 11,
            formatter: '{c}回',
          },
        },
      ],
    }),
    [entries],
  );
  return (
    <EChart ariaLabel={label} option={option} height={entries.length * 26 + 12} onClick={onPick} />
  );
}

export function MenuTool({ rows, onPickDay }: ToolProps) {
  const [pick, setPick] = useState<{ kind: 'protein' | 'cuisine'; key: string } | null>(null);
  const count = (fn: (r: DayRow) => string[]) => {
    const m = new Map<string, number>();
    for (const r of rows) for (const k of fn(r)) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const proteins = count((r) => (r.protein ? [r.protein] : []));
  const cuisines = count((r) => r.dishes.filter((d) => d.role === 'main').map((d) => d.cuisine));
  const matched = pick
    ? rows.filter((r) =>
        pick.kind === 'protein'
          ? r.protein === pick.key
          : r.dishes.some((d) => d.role === 'main' && d.cuisine === pick.key),
      )
    : [];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 text-sm font-semibold">主菜のたんぱく源</h4>
          <CountBars
            label="主菜のたんぱく源の回数"
            entries={proteins.map(([k, v]) => [PROTEIN_LABELS[k] ?? k, v])}
            onPick={(i) => setPick({ kind: 'protein', key: proteins[i][0] })}
          />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-semibold">主菜のジャンル</h4>
          <CountBars
            label="主菜のジャンルの回数"
            entries={cuisines.map(([k, v]) => [CUISINE_LABELS[k] ?? k, v])}
            onPick={(i) => setPick({ kind: 'cuisine', key: cuisines[i][0] })}
          />
        </div>
      </div>
      {pick && (
        <Drill
          title={`${pick.kind === 'protein' ? PROTEIN_LABELS[pick.key] : CUISINE_LABELS[pick.key]}の日（${matched.length} 日）`}
          onClose={() => setPick(null)}
        >
          <DayList rows={matched} onPickDay={onPickDay} />
        </Drill>
      )}
    </>
  );
}

function DayList({ rows, onPickDay }: { rows: DayRow[]; onPickDay: (d: string) => void }) {
  return (
    <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      {rows.map((r) => (
        <li key={r.date}>
          <button
            type="button"
            onClick={() => onPickDay(r.date)}
            className="flex w-full gap-3 py-1.5 text-left hover:text-accent-700 dark:hover:text-accent-300"
          >
            <span className="w-10 shrink-0 text-xs text-slate-400 tabular-nums">
              {format(parseISO(r.date), 'M/d')}
            </span>
            <span className="truncate">{r.dishes.map((d) => d.name).join('・')}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---- 食材 ----
export function FoodTool({ rows, onPickDay }: ToolProps) {
  const [pick, setPick] = useState<string | null>(null);
  const usage = foodUsage(rows).slice(0, 15);
  const option = useCallback(
    (t: ChartTheme) => ({
      grid: { left: 104, right: 52, top: 4, bottom: 4 },
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number; dataIndex: number }) =>
          `${p.name}: ${p.value}g（${usage[p.dataIndex].days} 日）`,
      },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: usage.map((u) => FOOD_MAP.get(u.foodId)?.name ?? u.foodId),
        ...axisCommon(t),
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: usage.map((u) => u.grams),
          barMaxWidth: 14,
          itemStyle: { color: t.series[2], borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: t.muted, fontSize: 11, formatter: '{c}g' },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
  const matched = pick
    ? rows.filter((r) => r.dishes.some((d) => d.ingredients.some((i) => i.foodId === pick)))
    : [];
  return (
    <>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        よく使う食材（1 人分の量の合計・常備品を除く）。棒を押すと、その食材を使った日を表示します。
      </p>
      <EChart
        ariaLabel="よく使う食材"
        option={option}
        height={usage.length * 24 + 12}
        onClick={(i) => setPick(usage[i].foodId)}
      />
      {pick && (
        <Drill title={`${FOOD_MAP.get(pick)?.name}を使った日`} onClose={() => setPick(null)}>
          <DayList rows={matched} onPickDay={onPickDay} />
        </Drill>
      )}
    </>
  );
}

// ---- 推移 ----
export function TrendTool({ rows, onPickDay }: ToolProps) {
  const labels = rows.map((r) => format(parseISO(r.date), 'M/d'));
  const scoreOpt = useCallback(
    (t: ChartTheme) => ({
      grid: { left: 36, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: labels, ...axisCommon(t), splitLine: { show: false } },
      yAxis: { type: 'value', min: 0, max: 100, ...axisCommon(t) },
      series: [
        {
          name: '栄養スコア',
          type: 'line',
          data: rows.map((r) => r.score),
          symbolSize: 8,
          lineStyle: { width: 2, color: t.series[0] },
          itemStyle: { color: t.series[0] },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
  const costOpt = useCallback(
    (t: ChartTheme) => ({
      grid: { left: 48, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => formatYen(v) },
      xAxis: { type: 'category', data: labels, ...axisCommon(t), splitLine: { show: false } },
      yAxis: { type: 'value', ...axisCommon(t) },
      series: [
        {
          name: '食材費（使った分）',
          type: 'bar',
          data: rows.map((r) => r.foodCost),
          barMaxWidth: 18,
          itemStyle: { color: t.series[1], borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold">栄養スコア（日ごと）</h4>
        <EChart
          ariaLabel="日ごとの栄養スコア"
          option={scoreOpt}
          height={200}
          onClick={(i) => onPickDay(rows[i].date)}
        />
      </div>
      <div>
        <h4 className="text-sm font-semibold">食材費（使った分の目安・全員）</h4>
        <EChart
          ariaLabel="日ごとの食材費"
          option={costOpt}
          height={180}
          onClick={(i) => onPickDay(rows[i].date)}
        />
      </div>
      <p className="text-xs text-slate-500">
        点や棒を押すと、その日の献立を開きます。食材費はパックの値段を使った量で割り振った目安です。
      </p>
    </div>
  );
}
