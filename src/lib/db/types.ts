/** 1 日分の夕食の献立 */
export interface DayPlan {
  /** yyyy-MM-dd */
  date: string;
  /** どの計算で作られたか（買い物リストとひも付ける） */
  planId: string;
  /** 主菜・副菜・汁物の料理 ID */
  dishes: string[];
  /** 人数（作る量） */
  servings: number;
  /** 作った（食べた）記録 */
  done?: boolean;
  createdAt: number;
}

/** 買い物リストの 1 行 */
export interface ShoppingItem {
  id: string;
  planId: string;
  foodId: string;
  /** 何回目の買い物か（0 始まり） */
  trip: number;
  /** 買い物の予定日 yyyy-MM-dd */
  date: string;
  packs: number;
  /** 献立で使う量（g） */
  usedGrams: number;
  checked: boolean;
}

/** 手元にある食材（使い切りたいもの） */
export interface StockItem {
  foodId: string;
  grams: number;
  updatedAt: number;
}

/** 計算 1 回分の条件（買い物リストを作り直すときに使う） */
export interface PlanMeta {
  planId: string;
  preset: string;
  startDate: string;
  days: number;
  trips: number;
  servings: number;
  riceGrams: number;
  /** 計算したときの在庫 */
  stock: { foodId: string; grams: number }[];
  /** 日ごとの最高気温（計算に使ったもの） */
  maxTemps?: number[];
  createdAt: number;
}
