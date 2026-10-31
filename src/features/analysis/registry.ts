import type { ReactNode } from 'react';
import { Apple, ChartLine, Drumstick, HeartPulse, type LucideIcon } from 'lucide-react';
import type { DayRow } from '@/lib/analysis/dataset';
import type { Targets } from '@/lib/food/reference';
import { FoodTool, MenuTool, NutritionTool, TrendTool } from './toolViews';

export interface ToolProps {
  rows: DayRow[];
  targets: Targets;
  riceGrams: number;
  onPickDay: (date: string) => void;
}

/**
 * 分析ツール。ツールを足すときはコンポーネントを書いて ANALYSIS_TOOLS に加える。
 * どのツールも同じ行データ（DayRow）を受け取り、クリックで詳細に掘り下げられるようにする。
 */
export interface AnalysisTool {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  Component: (p: ToolProps) => ReactNode;
}

export const ANALYSIS_TOOLS: AnalysisTool[] = [
  {
    id: 'nutrition',
    label: '栄養',
    icon: HeartPulse,
    description: '栄養素ごとの達成率と内訳',
    Component: NutritionTool,
  },
  {
    id: 'trend',
    label: '推移',
    icon: ChartLine,
    description: '栄養スコアと食材費の推移',
    Component: TrendTool,
  },
  {
    id: 'menu',
    label: '献立の傾向',
    icon: Drumstick,
    description: 'たんぱく源・ジャンルのかたより',
    Component: MenuTool,
  },
  { id: 'foods', label: '食材', icon: Apple, description: 'よく使う食材', Component: FoodTool },
];
