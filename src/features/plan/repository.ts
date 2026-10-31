import { addDays, format, parseISO } from 'date-fns';
import { db } from '@/lib/db/db';
import type { DayPlan, PlanMeta, ShoppingItem } from '@/lib/db/types';
import { buildShopping, type EvalContext } from '@/lib/planner/evaluate';
import type { PlanRequest, PlanResult } from '@/lib/planner/types';
import { createId } from '@/lib/utils/id';
import { minutesFor, currentTargets } from './planRequest';

/** 計算結果を献立カレンダーに採用する（同じ日の献立は置き換える） */
export async function adoptPlan(result: PlanResult, req: PlanRequest): Promise<string> {
  const planId = createId();
  const now = Date.now();
  const plans: DayPlan[] = result.days.map((d) => ({
    date: d.date,
    planId,
    dishes: d.dishes,
    servings: req.servings,
    createdAt: now,
  }));
  const meta: PlanMeta = {
    planId,
    preset: req.preset,
    startDate: req.startDate,
    days: req.days,
    trips: req.trips,
    servings: req.servings,
    riceGrams: req.riceGrams,
    stock: req.stock,
    maxTemps: req.maxTemps,
    createdAt: now,
  };
  const shopping: ShoppingItem[] = (result.evaluation?.shopping ?? []).map((l) => ({
    id: `${planId}:${l.trip}:${l.foodId}`,
    planId,
    foodId: l.foodId,
    trip: l.trip,
    date: l.date,
    packs: l.packs,
    usedGrams: l.usedGrams,
    checked: false,
  }));
  await db.transaction('rw', [db.plans, db.planMeta, db.shopping], async () => {
    await db.plans.bulkPut(plans);
    await db.planMeta.put(meta);
    await db.shopping.bulkPut(shopping);
    await cleanupOrphans();
  });
  return planId;
}

/** どの日からも使われなくなった計算の買い物リスト・条件を消す */
async function cleanupOrphans() {
  const used = new Set((await db.plans.toArray()).map((p) => p.planId));
  const metas = await db.planMeta.toArray();
  const orphan = metas.filter((m) => !used.has(m.planId)).map((m) => m.planId);
  if (orphan.length === 0) return;
  await db.planMeta.bulkDelete(orphan);
  await db.shopping.where('planId').anyOf(orphan).delete();
}

/** 献立を変えたあとに、その計算の買い物リストを作り直す（チェック済みは引き継ぐ） */
export async function recomputeShopping(planId: string): Promise<void> {
  const loaded = await loadPlanContext(planId);
  if (!loaded) return;
  const lines = buildShopping(loaded.ctx, loaded.days);
  const old = new Map(
    (await db.shopping.where('planId').equals(planId).toArray()).map((s) => [s.id, s]),
  );
  const next: ShoppingItem[] = lines.map((l) => {
    const id = `${planId}:${l.trip}:${l.foodId}`;
    const prev = old.get(id);
    return {
      id,
      planId,
      foodId: l.foodId,
      trip: l.trip,
      date: l.date,
      packs: l.packs,
      usedGrams: l.usedGrams,
      checked: prev ? prev.checked && prev.packs >= l.packs : false,
    };
  });
  await db.transaction('rw', db.shopping, async () => {
    await db.shopping.where('planId').equals(planId).delete();
    await db.shopping.bulkPut(next);
  });
}

/** 計算の条件と、その計算の献立（差し替え候補の計算に使う） */
export async function loadPlanContext(planId: string) {
  const meta = await db.planMeta.get(planId);
  if (!meta) return null;
  const start = parseISO(meta.startDate);
  const dates = Array.from({ length: meta.days }, (_, i) =>
    format(addDays(start, i), 'yyyy-MM-dd'),
  );
  const plans = await db.plans.where('date').anyOf(dates).toArray();
  const byDate = new Map(plans.filter((p) => p.planId === planId).map((p) => [p.date, p]));
  const days = dates.map((date) => ({ date, dishes: byDate.get(date)?.dishes ?? [] }));
  const ctx: EvalContext = {
    startDate: meta.startDate,
    days: meta.days,
    trips: meta.trips,
    servings: meta.servings,
    targets: currentTargets(),
    riceGrams: meta.riceGrams,
    maxMinutes: dates.map((d) => minutesFor(parseISO(d))),
    maxTemps: meta.maxTemps ?? [],
    stock: meta.stock,
  };
  return { meta, ctx, days, dates };
}

/** 1 品を差し替える */
export async function swapDish(date: string, index: number, dishId: string): Promise<void> {
  const plan = await db.plans.get(date);
  if (!plan) return;
  const dishes = [...plan.dishes];
  dishes[index] = dishId;
  await db.plans.put({ ...plan, dishes });
  await recomputeShopping(plan.planId);
}

export async function setDone(date: string, done: boolean): Promise<void> {
  await db.plans.update(date, { done });
}

/** 期間の献立を消す（買い物リストも作り直す） */
export async function clearPlans(from: string, to: string): Promise<number> {
  const list = await db.plans.where('date').between(from, to, true, true).toArray();
  const planIds = new Set(list.map((p) => p.planId));
  await db.plans.bulkDelete(list.map((p) => p.date));
  for (const id of planIds) await recomputeShopping(id);
  await db.transaction('rw', [db.plans, db.planMeta, db.shopping], cleanupOrphans);
  return list.length;
}
