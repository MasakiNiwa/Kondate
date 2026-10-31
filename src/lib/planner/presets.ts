import type { PlannerWeights, PresetId } from './types';

export interface PresetInfo {
  id: PresetId;
  label: string;
  description: string;
  weights: PlannerWeights;
}

const BASE: PlannerWeights = {
  cost: 1,
  waste: 1,
  nutrition: 1,
  time: 1,
  pref: 1,
  season: 1,
  weather: 1,
  variety: 1,
};

export const PRESETS: Record<PresetId, PresetInfo> = {
  balanced: {
    id: 'balanced',
    label: 'バランス',
    description: '費用・栄養・手間・旬をバランスよく',
    weights: BASE,
  },
  budget: {
    id: 'budget',
    label: '節約',
    description: '買う量と余りを最小に。食材を使い回す',
    weights: { ...BASE, cost: 2, waste: 2, nutrition: 0.7 },
  },
  nutrition: {
    id: 'nutrition',
    label: '栄養重視',
    description: '栄養の基準を最優先。野菜をしっかり',
    weights: { ...BASE, nutrition: 2.2, cost: 0.6 },
  },
  quick: {
    id: 'quick',
    label: '時短',
    description: '調理時間を短く。平日もラクに',
    weights: { ...BASE, time: 4, cost: 0.8 },
  },
};

export const PRESET_ORDER: PresetId[] = ['balanced', 'budget', 'nutrition', 'quick'];

/** 設定の「旬・気温の重視度」を重みに反映する */
export function withUserWeights(
  w: PlannerWeights,
  seasonWeight: number,
  weatherWeight: number,
): PlannerWeights {
  return { ...w, season: w.season * seasonWeight, weather: w.weather * weatherWeight };
}
