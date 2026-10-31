import type { Highs } from 'highs';
import { evaluatePlan } from './evaluate';
import { buildModel } from './model';
import { dayKey } from './scoring';
import type { PlanRequest, PlanResult, PlannedDay } from './types';
import { getDish, registerCustomDishes, ROLES } from '@/lib/food/catalog';

type LegacySolve = Pick<Highs, 'solve'>;

/** 献立を計算する（HiGHS のインスタンスを受け取るので、Worker でもテストでも使える） */
export function solvePlan(req: PlanRequest, highs: LegacySolve): PlanResult {
  const t0 = performance.now();
  // Worker は別のメモリなので、追加した料理をここで登録する
  if (req.customDishes) registerCustomDishes(req.customDishes);
  const model = buildModel(req);
  const stats = { variables: model.variables, constraints: model.constraints };
  let solution;
  try {
    solution = highs.solve(model.lp, {
      time_limit: req.timeLimit,
      mip_rel_gap: 0.03,
      // 時間内に良い解を見つけやすくする（既定 0.05）
      mip_heuristic_effort: 0.3,
      presolve: 'on',
      output_flag: false,
    } as Parameters<Highs['solve']>[1]);
  } catch (e) {
    return fail(req, e instanceof Error ? e.message : String(e), t0, stats);
  }
  const ok = solution.Status === 'Optimal';
  if (solution.Status !== 'Optimal' && solution.Status !== 'Time limit reached') {
    return fail(req, `解が見つかりませんでした（${solution.Status}）`, t0, stats);
  }
  const columns = solution.Columns ?? {};
  const chosen: string[][] = Array.from({ length: req.days }, () => []);
  for (const [name, [d, dishId]] of model.xVars) {
    const col = columns[name] as { Primal?: number } | undefined;
    if (col?.Primal !== undefined && col.Primal > 0.5) chosen[d].push(dishId);
  }
  const complete = chosen.every((c) => c.length === 3);
  if (!complete) {
    return fail(req, `解が見つかりませんでした（${solution.Status}）`, t0, stats);
  }
  const days: PlannedDay[] = chosen.map((dishes, d) => ({
    date: dayKey(req.startDate, d),
    // 主菜・副菜・汁物の順に並べる
    dishes: ROLES.map((r) => dishes.find((id) => getDish(id)?.role === r)!),
  }));
  return {
    preset: req.preset,
    status: ok ? 'optimal' : 'feasible',
    days,
    evaluation: evaluatePlan(req, days),
    solveMs: Math.round(performance.now() - t0),
    stats,
  };
}

function fail(
  req: PlanRequest,
  message: string,
  t0: number,
  stats: PlanResult['stats'],
): PlanResult {
  return {
    preset: req.preset,
    status: 'failed',
    message,
    days: [],
    evaluation: null,
    solveMs: Math.round(performance.now() - t0),
    stats,
  };
}
