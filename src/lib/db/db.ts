import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { DayPlan, PlanMeta, ShoppingItem, StockItem } from './types';

/**
 * 端末内のデータベース（IndexedDB）。
 * テーブルを増やす・索引を変えるときは version を上げて stores を足す（既存の定義は消さない）。
 */
export class KondateDB extends Dexie {
  plans!: EntityTable<DayPlan, 'date'>;
  shopping!: EntityTable<ShoppingItem, 'id'>;
  stock!: EntityTable<StockItem, 'foodId'>;
  planMeta!: EntityTable<PlanMeta, 'planId'>;

  constructor(name = STORAGE_PREFIX) {
    super(name);
    this.version(1).stores({
      plans: 'date, planId',
      shopping: 'id, planId, foodId',
      stock: 'foodId',
    });
    this.version(2).stores({
      planMeta: 'planId, startDate',
    });
  }
}

export const db = new KondateDB();

/** 献立・買い物・在庫をすべて消す（設定は残す） */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.plans, db.shopping, db.stock, db.planMeta], async () => {
    await Promise.all([
      db.plans.clear(),
      db.shopping.clear(),
      db.stock.clear(),
      db.planMeta.clear(),
    ]);
  });
}

/** 手元の食材に足す（同じ食材は量を合計する） */
export async function addToStock(entries: { foodId: string; grams: number }[]): Promise<void> {
  await db.transaction('rw', db.stock, async () => {
    for (const e of entries) {
      const prev = await db.stock.get(e.foodId);
      await db.stock.put({
        foodId: e.foodId,
        grams: (prev?.grams ?? 0) + e.grams,
        updatedAt: Date.now(),
      });
    }
  });
}

export async function updateStock(foodId: string, grams: number): Promise<void> {
  await db.stock.update(foodId, { grams: Math.max(0, grams), updatedAt: Date.now() });
}
