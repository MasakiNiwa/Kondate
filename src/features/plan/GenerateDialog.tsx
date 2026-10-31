import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Clock, Leaf, Loader2, Sparkles, Trash, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { useSettings } from '@/features/settings/settingsStore';
import { getDish } from '@/lib/food/catalog';
import { PRESETS, PRESET_ORDER } from '@/lib/planner/presets';
import type { PlanResult } from '@/lib/planner/types';
import { cn } from '@/lib/utils/cn';
import { errorMessage, formatPercent, formatYen } from '@/lib/utils/format';
import { useGenerate } from './generateStore';
import { scoreClass } from './nutritionStatus';
import { adoptPlan } from './repository';

const QUALITY = [
  { value: '3', label: '速い（3 秒）' },
  { value: '6', label: '標準（6 秒）' },
  { value: '15', label: 'じっくり（15 秒）' },
];

function Metric({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-slate-400 [&_svg]:size-3.5">{icon}</span>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('ml-auto font-semibold tabular-nums', className)}>{value}</span>
    </div>
  );
}

function ResultCard({
  result,
  presetIndex,
  onAdopt,
  busy,
}: {
  result: PlanResult | null;
  presetIndex: number;
  onAdopt: () => void;
  busy: boolean;
}) {
  const preset = PRESETS[PRESET_ORDER[presetIndex]];
  const ev = result?.evaluation;
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2">
        <div className="font-semibold">{preset.label}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{preset.description}</div>
      </div>
      {!result && (
        <div className="flex flex-1 items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          計算中…
        </div>
      )}
      {result && !ev && (
        <p className="flex-1 py-6 text-sm text-rose-600 dark:text-rose-400">
          計算できませんでした。{result.message}
        </p>
      )}
      {ev && (
        <>
          <div className="space-y-1 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <Metric icon={<Wallet />} label="買い物" value={formatYen(ev.totalCost)} />
            <Metric
              icon={<Sparkles />}
              label="栄養スコア"
              value={`${ev.nutritionScore}`}
              className={scoreClass(ev.nutritionScore)}
            />
            <Metric icon={<Clock />} label="調理（平均）" value={`${ev.avgMinutes}分`} />
            <Metric icon={<Trash />} label="余りの目安" value={formatYen(ev.wasteValue)} />
            <Metric icon={<Leaf />} label="旬の食材" value={formatPercent(ev.seasonality)} />
          </div>
          <ol className="mt-2 flex-1 space-y-0.5 text-xs">
            {result.days.map((d) => (
              <li key={d.date} className="flex gap-2">
                <span className="w-9 shrink-0 text-slate-400 tabular-nums">
                  {format(parseISO(d.date), 'M/d')}
                </span>
                <span className="truncate">{getDish(d.dishes[0])?.name}</span>
              </li>
            ))}
          </ol>
          <div className="mt-1 text-[0.65rem] text-slate-400">
            {result.status === 'optimal' ? '最適解' : '時間内の最良解'}・
            {(result.solveMs / 1000).toFixed(1)} 秒
          </div>
          <Button variant="primary" size="sm" className="mt-2" onClick={onAdopt} disabled={busy}>
            <Check />
            この案にする
          </Button>
        </>
      )}
    </div>
  );
}

/** 献立を作る（条件を選んで、複数の案を並列に計算して比べる） */
export function GenerateDialog({
  open,
  onClose,
  defaultStart,
}: {
  open: boolean;
  onClose: () => void;
  defaultStart: string;
}) {
  const settings = useSettings();
  const { running, results, requests, error, generate, cancel, clear } = useGenerate();
  const [start, setStart] = useState(defaultStart);
  const [days, setDays] = useState(settings.planDays);
  const [trips, setTrips] = useState(String(settings.shoppingTrips));
  const [quality, setQuality] = useState('6');
  const [busy, setBusy] = useState(false);
  const [, navigate] = useLocation();

  // 開いたときに開始日を最新にする（effect ではなく描画中に調整する）
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStart(defaultStart);
  }

  const showResults = running || results.length > 0;

  const run = () =>
    void generate({
      startDate: start,
      days,
      trips: Number(trips),
      presets: PRESET_ORDER,
      timeLimit: Number(quality),
    });

  const adopt = async (i: number) => {
    const r = results[i];
    if (!r) return;
    setBusy(true);
    try {
      await adoptPlan(r, requests[i]);
      toast.success(`${PRESETS[r.preset].label}の献立をカレンダーに入れました`);
      clear();
      onClose();
      navigate('/calendar');
    } catch (e) {
      toast.error(`保存できませんでした: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (running) cancel();
        onClose();
      }}
      title="献立を作る"
      wide={showResults}
      footer={
        showResults ? (
          <>
            {running ? (
              <Button onClick={cancel}>中止</Button>
            ) : (
              <Button onClick={clear}>条件を変える</Button>
            )}
          </>
        ) : (
          <Button variant="primary" onClick={run}>
            <Sparkles />
            {PRESET_ORDER.length} つの案を計算
          </Button>
        )
      }
    >
      {!showResults ? (
        <div className="space-y-4 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            重視する点の違う {PRESET_ORDER.length}{' '}
            つの案（バランス・節約・栄養重視・時短）を、数理最適化で並列に計算します。
          </p>
          <label className="flex items-center justify-between gap-4">
            <span className="font-medium">開始日</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">日数</span>
            <Slider
              value={days}
              min={3}
              max={14}
              step={1}
              onChange={setDays}
              format={(v) => `${v}日`}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">買い物の回数</span>
            <Select
              value={trips}
              onChange={setTrips}
              options={[1, 2, 3].map((n) => ({ value: String(n), label: `${n} 回` }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">計算の丁寧さ</span>
            <Select value={quality} onChange={setQuality} options={QUALITY} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            家族構成・調理時間・旬などは設定ページ、好き嫌いは料理ページで変えられます。同じ日の献立は置き換わります。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRESET_ORDER.map((id, i) => (
              <ResultCard
                key={id}
                result={results[i] ?? null}
                presetIndex={i}
                onAdopt={() => void adopt(i)}
                busy={busy}
              />
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}
