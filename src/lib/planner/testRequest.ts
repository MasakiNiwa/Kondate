import { householdDailyTargets, mealTargets } from '@/lib/food/reference';
import { PRESETS } from './presets';
import type { PlanRequest } from './types';

/** テスト用の計算条件 */
export function sampleRequest(patch: Partial<PlanRequest> = {}): PlanRequest {
  return {
    preset: 'balanced',
    startDate: '2026-11-02',
    days: 7,
    trips: 1,
    servings: 2,
    targets: mealTargets(
      householdDailyTargets([
        { sex: 'f', age: '30-49', activity: 'normal' },
        { sex: 'm', age: '30-49', activity: 'normal' },
      ]),
      0.38,
    ),
    riceGrams: 150,
    maxMinutes: [35, 35, 35, 35, 35, 60, 60],
    maxTemps: [18, 17, 16, 18, 19, 17, 16],
    weights: PRESETS.balanced.weights,
    dishPrefs: {},
    foodPrefs: {},
    history: [],
    repeatGapDays: 10,
    stock: [],
    fixed: [],
    useFreezer: true,
    timeLimit: 4,
    ...patch,
  };
}
