import { addDays, format, parseISO, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getSettings } from '@/features/settings/settingsStore';
import { usePrefs } from '@/features/prefs/prefsStore';
import { buildRows, type DayRow } from '@/lib/analysis/dataset';
import { computeInsights } from '@/lib/analysis/insights';
import { FOOD_MAP, getDish, isInSeason } from '@/lib/food/catalog';
import { NUTRIENTS } from '@/lib/food/nutrients';
import { householdDailyTargets, mealTargets, type Targets } from '@/lib/food/reference';
import { NUTRIENT_KEYS } from '@/lib/food/types';
import { db } from '@/lib/db/db';
import { toKey } from '@/lib/utils/date';

export function aiTargets(): Targets {
  const s = getSettings();
  return mealTargets(householdDailyTargets(s.members), s.dinnerShare);
}

export async function rowsBetween(from: string, to: string): Promise<DayRow[]> {
  const plans = await db.plans.where('date').between(from, to, true, true).toArray();
  return buildRows({ plans, targets: aiTargets(), riceGrams: getSettings().riceGrams });
}

/** 1 日の献立を AI に渡す形 */
export function dayForAi(r: DayRow) {
  const t = aiTargets();
  const lacking = NUTRIENT_KEYS.filter((k) => t[k].lo > 0 && r.nutrients[k] < t[k].lo * 0.9).map(
    (k) => NUTRIENTS[k].label,
  );
  const over = NUTRIENT_KEYS.filter(
    (k) => Number.isFinite(t[k].hi) && r.nutrients[k] > t[k].hi * 1.05,
  ).map((k) => NUTRIENTS[k].label);
  return {
    date: r.date,
    weekday: format(parseISO(r.date), 'E', { locale: ja }),
    dishes: r.dishes.map((d) => ({ id: d.id, name: d.name, role: d.role, minutes: d.minutes })),
    nutritionScore: r.score,
    lacking,
    over,
    cooked: r.done,
  };
}

/**
 * AI に渡すアプリの状態（構造化データ）。AI はこれを読んで状況を把握し、
 * 細かいことはツールで調べる。数字はすべてアプリの計算結果。
 */
export async function buildAppSnapshot() {
  const s = getSettings();
  const prefs = usePrefs.getState();
  const today = new Date();
  const todayKey = toKey(today);
  const upcoming = await rowsBetween(todayKey, toKey(addDays(today, 6)));
  const past = await rowsBetween(toKey(subDays(today, 13)), toKey(subDays(today, 1)));
  const month = today.getMonth() + 1;
  const insights = computeInsights({ rows: [...past, ...upcoming], targets: aiTargets(), month });
  const nextTrip = (await db.shopping.toArray()).filter((i) => i.date >= todayKey);
  return {
    today: `${todayKey}（${format(today, 'E', { locale: ja })}）`,
    household: s.members.map((m) => ({
      name: m.name,
      sex: m.sex === 'f' ? '女性' : '男性',
      age: m.age,
    })),
    todaysDinner: upcoming.find((r) => r.date === todayKey)
      ? dayForAi(upcoming.find((r) => r.date === todayKey)!)
      : null,
    upcomingMenu: upcoming
      .filter((r) => r.date !== todayKey)
      .map((r) => ({ date: r.date, main: r.dishes[0]?.name })),
    recentDays: past.length,
    recentCookedDays: past.filter((r) => r.done).length,
    insights: insights.map((i) => i.title),
    shopping: {
      itemsLeft: nextTrip.filter((i) => i.packs > 0 && !i.checked).length,
      nextDate: nextTrip.map((i) => i.date).sort()[0] ?? null,
    },
    inSeason: [...FOOD_MAP.values()]
      .filter((f) => !f.pantry && f.peakMonths.length <= 4 && isInSeason(f, month))
      .map((f) => f.name),
    likes: Object.entries(prefs.dishPrefs)
      .filter(([, v]) => v === 'like')
      .map(([id]) => getDish(id)?.name),
    dislikes: [
      ...Object.entries(prefs.foodPrefs)
        .filter(([, v]) => v === 'dislike' || v === 'never')
        .map(([id]) => FOOD_MAP.get(id)?.name),
    ],
  };
}
