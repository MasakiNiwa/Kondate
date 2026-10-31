import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { DayPlan, ShoppingItem, StockItem } from './types';

/**
 * 端末内のデータベース（IndexedDB）。
 * テーブルを増やす・索引を変えるときは version を上げて stores を足す（既存の定義は消さない）。
 */
export class KondateDB extends Dexie {
  plans!: EntityTable<DayPlan, 'date'>;
  shopping!: EntityTable<ShoppingItem, 'id'>;
  stock!: EntityTable<StockItem, 'foodId'>;

  constructor(name = STORAGE_PREFIX) {
    super(name);
    this.version(1).stores({
      plans: 'date, planId',
      shopping: 'id, planId, foodId',
      stock: 'foodId',
    });
  }
}

export const db = new KondateDB();

/** 献立・買い物・在庫をすべて消す（設定は残す） */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.plans, db.shopping, db.stock, async () => {
    await Promise.all([db.plans.clear(), db.shopping.clear(), db.stock.clear()]);
  });
}
