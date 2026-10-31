import { create } from 'zustand';
import { registerCustomDishes } from '@/lib/food/catalog';
import type { Dish } from '@/lib/food/types';
import { db } from '@/lib/db/db';

interface CustomDishState {
  list: Dish[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (dishes: Dish[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/** ユーザーが追加した料理（IndexedDB に保存し、料理の一覧に登録する） */
export const useCustomDishes = create<CustomDishState>()((set, get) => ({
  list: [],
  loaded: false,
  async load() {
    const list = await db.customDishes.toArray();
    registerCustomDishes(list);
    set({ list, loaded: true });
  },
  async add(dishes) {
    await db.customDishes.bulkPut(dishes);
    await get().load();
  },
  async remove(id) {
    await db.customDishes.delete(id);
    await get().load();
  },
}));
