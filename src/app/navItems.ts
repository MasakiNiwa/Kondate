import {
  CalendarDays,
  ChartPie,
  CircleHelp,
  House,
  Settings,
  ShoppingBasket,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * メインのナビゲーション（スマホの下部ナビ・PC のサイドバー）。
 * ページを追加するときはここと App.tsx のルートに追加する。
 * スマホの下部ナビは 6 つまでにして、増えるときはページの統合を考える。
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'ホーム', icon: House },
  { to: '/calendar', label: 'カレンダー', icon: CalendarDays },
  { to: '/shopping', label: '買い物', icon: ShoppingBasket },
  { to: '/dishes', label: '料理', icon: UtensilsCrossed },
  { to: '/analysis', label: '分析', icon: ChartPie },
];

export const SETTINGS_ITEM: NavItem = { to: '/settings', label: '設定', icon: Settings };
export const HELP_ITEM: NavItem = { to: '/help', label: 'ヘルプ', icon: CircleHelp };
