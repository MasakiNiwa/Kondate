import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { Pref } from '@/lib/planner/types';

interface PrefsState {
  dishPrefs: Record<string, Pref>;
  foodPrefs: Record<string, Pref>;
  setDish: (id: string, pref: Pref) => void;
  setFood: (id: string, pref: Pref) => void;
  reset: () => void;
}

function put(map: Record<string, Pref>, id: string, pref: Pref) {
  const next = { ...map };
  if (pref === 'neutral') delete next[id];
  else next[id] = pref;
  return next;
}

/** 料理・食材の好き嫌い */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      dishPrefs: {},
      foodPrefs: {},
      setDish: (id, pref) => set((s) => ({ dishPrefs: put(s.dishPrefs, id, pref) })),
      setFood: (id, pref) => set((s) => ({ foodPrefs: put(s.foodPrefs, id, pref) })),
      reset: () => set({ dishPrefs: {}, foodPrefs: {} }),
    }),
    { name: `${STORAGE_PREFIX}:prefs`, version: 1 },
  ),
);

export const PREF_LABELS: Record<Pref, string> = {
  like: '好き',
  neutral: 'ふつう',
  dislike: '苦手',
  never: '使わない',
};
