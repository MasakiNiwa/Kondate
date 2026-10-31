import { format, isWeekend, parseISO, subDays } from 'date-fns';
import { getSettings } from '@/features/settings/settingsStore';
import { usePrefs } from '@/features/prefs/prefsStore';
import { householdDailyTargets, mealTargets, totalServings } from '@/lib/food/reference';
import { db } from '@/lib/db/db';
import { PRESETS, withUserWeights } from '@/lib/planner/presets';
import { addDays } from 'date-fns';
import type { FixedDish, PlanRequest, PresetId } from '@/lib/planner/types';
import { dailyMaxTemps, type DayTemp } from '@/lib/weather/forecast';

export interface PlanOptions {
  startDate: string;
  days: number;
  trips: number;
  presets: PresetId[];
  fixed?: FixedDish[];
  /** ソルバーの制限時間（秒） */
  timeLimit?: number;
}

export function currentTargets() {
  const s = getSettings();
  return mealTargets(householdDailyTargets(s.members), s.dinnerShare);
}

export function currentServings() {
  return totalServings(getSettings().members);
}

export function minutesFor(date: Date): number {
  const s = getSettings();
  return isWeekend(date) ? s.weekendMinutes : s.weekdayMinutes;
}

/** 設定・好み・過去の献立・在庫・天気から、プリセットごとの計算条件を作る */
export async function buildRequests(
  opts: PlanOptions,
): Promise<{ requests: PlanRequest[]; temps: DayTemp[] }> {
  const s = getSettings();
  const prefs = usePrefs.getState();
  const start = parseISO(opts.startDate);
  const from = format(subDays(start, Math.max(1, s.repeatGapDays)), 'yyyy-MM-dd');
  const history = (
    await db.plans.where('date').between(from, opts.startDate, true, false).toArray()
  ).map((p) => ({ date: p.date, dishes: p.dishes }));
  const stock = (await db.stock.toArray())
    .filter((x) => x.grams > 0)
    .map((x) => ({ foodId: x.foodId, grams: x.grams }));
  const temps = await dailyMaxTemps(opts.startDate, opts.days, s.weatherLocation);
  const base: Omit<PlanRequest, 'preset' | 'weights'> = {
    startDate: opts.startDate,
    days: opts.days,
    trips: opts.trips,
    servings: currentServings(),
    targets: currentTargets(),
    riceGrams: s.riceGrams,
    maxMinutes: Array.from({ length: opts.days }, (_, i) => minutesFor(addDays(start, i))),
    maxTemps: temps.map((t) => t.maxTemp),
    dishPrefs: prefs.dishPrefs,
    foodPrefs: prefs.foodPrefs,
    history,
    repeatGapDays: s.repeatGapDays,
    stock,
    fixed: opts.fixed ?? [],
    useFreezer: s.useFreezer,
    timeLimit: opts.timeLimit ?? 6,
  };
  const requests = opts.presets.map((preset) => ({
    ...base,
    preset,
    weights: withUserWeights(PRESETS[preset].weights, s.seasonWeight, s.weatherWeight),
  }));
  return { requests, temps };
}
