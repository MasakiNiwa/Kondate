import { create } from 'zustand';
import { solveParallel, terminatePlanner } from '@/lib/planner/client';
import type { PlanRequest, PlanResult } from '@/lib/planner/types';
import type { DayTemp } from '@/lib/weather/forecast';
import { buildRequests, type PlanOptions } from './planRequest';

interface GenerateState {
  running: boolean;
  startedAt: number;
  requests: PlanRequest[];
  results: (PlanResult | null)[];
  temps: DayTemp[];
  error: string | null;
  generate: (opts: PlanOptions) => Promise<void>;
  cancel: () => void;
  clear: () => void;
}

/** 献立の計算（複数の案を並列に） */
export const useGenerate = create<GenerateState>()((set, get) => ({
  running: false,
  startedAt: 0,
  requests: [],
  results: [],
  temps: [],
  error: null,
  async generate(opts) {
    if (get().running) return;
    set({ running: true, startedAt: Date.now(), results: [], requests: [], error: null });
    try {
      const { requests, temps } = await buildRequests(opts);
      set({ requests, temps, results: requests.map(() => null) });
      await solveParallel(requests, (r, i) => {
        if (!get().running) return;
        set((s) => {
          const results = [...s.results];
          results[i] = r;
          return { results };
        });
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ running: false });
    }
  },
  cancel() {
    terminatePlanner();
    set({ running: false, error: '計算を中止しました' });
  },
  clear() {
    set({ results: [], requests: [], temps: [], error: null });
  },
}));
