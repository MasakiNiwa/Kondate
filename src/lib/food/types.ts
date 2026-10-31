/** 栄養素のキー（並び順は NUTRIENTS と同じ） */
export const NUTRIENT_KEYS = [
  'energy',
  'protein',
  'fat',
  'carbs',
  'fiber',
  'salt',
  'calcium',
  'iron',
  'vitA',
  'vitD',
  'vitB1',
  'vitB2',
  'vitC',
  'potassium',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrients = Record<NutrientKey, number>;

export type FoodCategory =
  | 'meat'
  | 'fish'
  | 'egg'
  | 'dairy'
  | 'soy'
  | 'vegetable'
  | 'mushroom'
  | 'tuber'
  | 'fruit'
  | 'grain'
  | 'seaweed'
  | 'processed'
  | 'seasoning';

/** 食材 */
export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  /** 100g あたりの栄養素 */
  per100: Nutrients;
  /** 常備品（調味料・乾物・米など）: 買い物の最適化には入れず、在庫がある前提 */
  pantry: boolean;
  /** 1 パック（売っている単位）の g */
  packGrams: number;
  /** 売っている単位の名前（例: 1パック、1束） */
  packLabel: string;
  /** 1 パックの値段（円、旬でない時期の目安） */
  price: number;
  /** 冷蔵での日持ち（日） */
  shelfDays: number;
  /** 冷凍できる（肉・魚） */
  freezable: boolean;
  /** 旬の月（1〜12。空は通年） */
  peakMonths: number[];
  /** 1 個あたりの g（卵など、個数で表示したいもの） */
  pieceGrams?: number;
  pieceLabel?: string;
}

export type DishRole = 'main' | 'side' | 'soup';
/** 料理の温度感（気温に合わせる） */
export type Thermal = 'hot' | 'neutral' | 'cold';
export type Cuisine = 'japanese' | 'western' | 'chinese' | 'korean' | 'ethnic';
/** 主菜の主なたんぱく源（同じものが続かないようにする） */
export type Protein =
  'chicken' | 'pork' | 'beef' | 'fish' | 'seafood' | 'egg' | 'soy' | 'mixed' | 'none';

export interface Ingredient {
  foodId: string;
  /** 1 人分の g */
  grams: number;
}

/** 料理 */
export interface Dish {
  id: string;
  name: string;
  role: DishRole;
  /** 調理時間（分） */
  minutes: number;
  ingredients: Ingredient[];
  thermal: Thermal;
  cuisine: Cuisine;
  protein: Protein;
  /** 主食を兼ねる（丼・カレー・麺など。ご飯を足さない） */
  includesStaple?: boolean;
  /** 作り方のひとこと */
  howto: string;
  tags?: string[];
}
