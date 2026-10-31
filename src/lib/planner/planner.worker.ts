/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import highsLoader, { type Highs } from 'highs';
import wasmUrl from 'highs/runtime?url';
import { solvePlan } from './solve';
import type { PlanRequest, PlanResult } from './types';

let highs: Promise<Highs> | null = null;

function load(): Promise<Highs> {
  highs ??= highsLoader({ locateFile: () => wasmUrl });
  return highs;
}

const api = {
  async solve(req: PlanRequest): Promise<PlanResult> {
    return solvePlan(req, await load());
  },
};

export type PlannerWorkerApi = typeof api;

Comlink.expose(api);
