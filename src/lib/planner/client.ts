import * as Comlink from 'comlink';
import type { PlannerWorkerApi } from './planner.worker';
import type { PlanRequest, PlanResult } from './types';

interface Slot {
  worker: Worker;
  api: Comlink.Remote<PlannerWorkerApi>;
}

let pool: Slot[] = [];

function create(): Slot {
  const worker = new Worker(new URL('./planner.worker.ts', import.meta.url), { name: 'planner' });
  return { worker, api: Comlink.wrap<PlannerWorkerApi>(worker) };
}

/** 同時に動かす Worker の数（CPU のコア数に合わせ、最大 4） */
export function poolSize(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
  return Math.max(1, Math.min(4, cores - 1));
}

/**
 * 複数の計算条件を Worker で並列に解く。
 * 終わった順に onResult を呼び、すべての結果を条件と同じ順で返す。
 */
export async function solveParallel(
  requests: PlanRequest[],
  onResult?: (r: PlanResult, index: number) => void,
): Promise<PlanResult[]> {
  const size = Math.min(poolSize(), requests.length);
  while (pool.length < size) pool.push(create());
  const results: PlanResult[] = new Array(requests.length);
  let next = 0;
  const run = async (slotIndex: number) => {
    while (next < requests.length) {
      const i = next++;
      try {
        results[i] = await pool[slotIndex].api.solve(requests[i]);
      } catch (e) {
        // Wasm が壊れた可能性があるので、Worker を作り直す
        pool[slotIndex].worker.terminate();
        pool[slotIndex] = create();
        results[i] = {
          preset: requests[i].preset,
          status: 'failed',
          message: e instanceof Error ? e.message : String(e),
          days: [],
          evaluation: null,
          solveMs: 0,
          stats: { variables: 0, constraints: 0 },
        };
      }
      onResult?.(results[i], i);
    }
  };
  await Promise.all(Array.from({ length: size }, (_, s) => run(s)));
  return results;
}

/** Worker を止める（計算の中止） */
export function terminatePlanner(): void {
  for (const s of pool) s.worker.terminate();
  pool = [];
}
