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
