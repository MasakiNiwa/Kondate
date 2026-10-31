import type { Targets } from '@/lib/food/reference';
import type { NutrientKey, Nutrients } from '@/lib/food/types';

/** 好み。never は計算から外す */
export type Pref = 'like' | 'neutral' | 'dislike' | 'never';

/** 計算の方針（重視する点の違う案） */
export type PresetId = 'balanced' | 'budget' | 'nutrition' | 'quick';

export interface PlannerWeights {
  /** 費用（円）の重み */
  cost: number;
  /** 買ったのに余る食材（傷むもの）の重み */
  waste: number;
  /** 栄養の過不足の重み */
  nutrition: number;
  /** 調理時間の超過の重み */
  time: number;
  /** 好みの重み */
  pref: number;
  /** 旬の重み */
  season: number;
  /** 気温に合わせる重み */
  weather: number;
  /** くり返し・同じたんぱく源の連続を避ける重み */
  variety: number;
}

export interface FixedDish {
  day: number;
  dishId: string;
}

/** Worker に渡す計算の条件（すべて JSON にできる値） */
export interface PlanRequest {
  preset: PresetId;
  /** 開始日 yyyy-MM-dd */
  startDate: string;
  days: number;
  /** 買い物の回数（期間を等分した各区間の最初の日に買う） */
  trips: number;
  /** 作る量（人前の合計） */
  servings: number;
  /** 1 人分・夕食 1 回分の栄養の目標 */
  targets: Targets;
  /** 主食のご飯（g / 人） */
  riceGrams: number;
  /** 日ごとの調理時間の目安（分） */
  maxMinutes: number[];
  /** 日ごとの最高気温（℃） */
  maxTemps: number[];
  weights: PlannerWeights;
  dishPrefs: Record<string, Pref>;
  foodPrefs: Record<string, Pref>;
  /** 開始日より前の献立（くり返しを避ける） */
  history: { date: string; dishes: string[] }[];
  repeatGapDays: number;
  /** 手元にある食材（最初の買い物の区間で使える） */
  stock: { foodId: string; grams: number }[];
  /** 決めておく料理（その日・その役割はこれに固定） */
  fixed: FixedDish[];
  useFreezer: boolean;
  /** ソルバーの制限時間（秒） */
  timeLimit: number;
}

export interface PlannedDay {
  date: string;
  dishes: string[];
}

export interface ShoppingLine {
  foodId: string;
  trip: number;
  /** 買い物の日 yyyy-MM-dd */
  date: string;
  packs: number;
  /** 献立で使う量（g） */
  usedGrams: number;
  /** 手元の在庫から使う量（g） */
  fromStock: number;
  /** 余る量（g） */
  leftover: number;
  cost: number;
}

export interface DayEvaluation {
  date: string;
  nutrients: Nutrients;
  /** 栄養の達成度（下限に対する割合。塩分などは上限に対する割合） */
  achievement: Record<NutrientKey, number>;
  /** 栄養スコア（0〜100） */
  nutritionScore: number;
  minutes: number;
  maxMinutes: number;
  maxTemp: number;
}

export interface PlanEvaluation {
  days: DayEvaluation[];
  shopping: ShoppingLine[];
  totalCost: number;
  costPerServing: number;
  /** 余る食材の金額の目安 */
  wasteValue: number;
  nutritionScore: number;
  /** 旬の食材を使う割合（0〜1） */
  seasonality: number;
  avgMinutes: number;
  /** 献立に出てくる食材の種類 */
  foodVariety: number;
}

export interface PlanResult {
  preset: PresetId;
  status: 'optimal' | 'feasible' | 'failed';
  message?: string;
  days: PlannedDay[];
  evaluation: PlanEvaluation | null;
  solveMs: number;
  /** モデルの大きさ（ヘルプ・デバッグ用） */
  stats: { variables: number; constraints: number };
}
