import { NUTRIENT_KEYS, type NutrientKey, type Nutrients } from './types';

export interface NutrientInfo {
  key: NutrientKey;
  label: string;
  short: string;
  unit: string;
  /** 目標の向き。min: これ以上、max: これ以下、range: 範囲内 */
  goal: 'min' | 'max' | 'range';
}

export const NUTRIENTS: Record<NutrientKey, NutrientInfo> = {
  energy: { key: 'energy', label: 'エネルギー', short: 'エネ', unit: 'kcal', goal: 'range' },
  protein: { key: 'protein', label: 'たんぱく質', short: 'たん', unit: 'g', goal: 'min' },
  fat: { key: 'fat', label: '脂質', short: '脂質', unit: 'g', goal: 'range' },
  carbs: { key: 'carbs', label: '炭水化物', short: '炭水', unit: 'g', goal: 'range' },
  fiber: { key: 'fiber', label: '食物繊維', short: '繊維', unit: 'g', goal: 'min' },
  salt: { key: 'salt', label: '食塩相当量', short: '塩分', unit: 'g', goal: 'max' },
  calcium: { key: 'calcium', label: 'カルシウム', short: 'Ca', unit: 'mg', goal: 'min' },
  iron: { key: 'iron', label: '鉄', short: '鉄', unit: 'mg', goal: 'min' },
  vitA: { key: 'vitA', label: 'ビタミンA', short: 'V.A', unit: 'µg', goal: 'min' },
  vitD: { key: 'vitD', label: 'ビタミンD', short: 'V.D', unit: 'µg', goal: 'min' },
  vitB1: { key: 'vitB1', label: 'ビタミンB1', short: 'B1', unit: 'mg', goal: 'min' },
  vitB2: { key: 'vitB2', label: 'ビタミンB2', short: 'B2', unit: 'mg', goal: 'min' },
  vitC: { key: 'vitC', label: 'ビタミンC', short: 'V.C', unit: 'mg', goal: 'min' },
  potassium: { key: 'potassium', label: 'カリウム', short: 'K', unit: 'mg', goal: 'min' },
};

export const NUTRIENT_LIST = NUTRIENT_KEYS.map((k) => NUTRIENTS[k]);

export function zeroNutrients(): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients;
}

/** a += b × scale */
export function addNutrients(a: Nutrients, b: Nutrients, scale = 1): Nutrients {
  for (const k of NUTRIENT_KEYS) a[k] += b[k] * scale;
  return a;
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce((acc, n) => addNutrients(acc, n), zeroNutrients());
}
