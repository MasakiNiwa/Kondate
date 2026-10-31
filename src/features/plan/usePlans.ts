import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import type { DayPlan } from '@/lib/db/types';

/** 期間の献立（日付 → 献立） */
export function usePlansInRange(from: string, to: string): Map<string, DayPlan> | undefined {
  return useLiveQuery(async () => {
    const list = await db.plans.where('date').between(from, to, true, true).toArray();
    return new Map(list.map((p) => [p.date, p]));
  }, [from, to]);
}

export function usePlan(date: string): DayPlan | undefined | null {
  return useLiveQuery(async () => (await db.plans.get(date)) ?? null, [date]);
}
