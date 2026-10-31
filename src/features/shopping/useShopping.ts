import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import type { DayPlan, PlanMeta, ShoppingItem } from '@/lib/db/types';
import { todayKey } from '@/lib/utils/date';

export interface ShoppingTrip {
  key: string;
  planId: string;
  trip: number;
  date: string;
  items: ShoppingItem[];
  /** この買い物で作る日 */
  days: DayPlan[];
  meta: PlanMeta;
}

/** これからの献立（今日以降の日を含む計算）の買い物リストを、買い物の回ごとにまとめる */
export function useShoppingTrips(): ShoppingTrip[] | undefined {
  return useLiveQuery(async () => {
    const today = todayKey();
    const upcoming = await db.plans.where('date').aboveOrEqual(today).toArray();
    const planIds = [...new Set(upcoming.map((p) => p.planId))];
    if (planIds.length === 0) return [];
    const [items, metas, plans] = await Promise.all([
      db.shopping.where('planId').anyOf(planIds).toArray(),
      db.planMeta.bulkGet(planIds),
      db.plans.where('planId').anyOf(planIds).toArray(),
    ]);
    const trips = new Map<string, ShoppingTrip>();
    for (const it of items) {
      const meta = metas.find((m) => m?.planId === it.planId);
      if (!meta) continue;
      const key = `${it.planId}:${it.trip}`;
      if (!trips.has(key)) {
        trips.set(key, {
          key,
          planId: it.planId,
          trip: it.trip,
          date: it.date,
          items: [],
          days: [],
          meta,
        });
      }
      trips.get(key)!.items.push(it);
    }
    // 各回で作る日: 次の回の買い物の日の前日まで
    const list = [...trips.values()].sort((a, b) => a.date.localeCompare(b.date));
    for (const t of list) {
      const next = list.find((x) => x.planId === t.planId && x.trip === t.trip + 1);
      t.days = plans
        .filter((p) => p.planId === t.planId && p.date >= t.date && (!next || p.date < next.date))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    return list.filter((t) => t.days.some((d) => d.date >= today) || t.date >= today);
  }, []);
}
