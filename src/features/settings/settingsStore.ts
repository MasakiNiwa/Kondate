import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';

export type ThemeSetting = 'system' | 'light' | 'dark';
/** ダークモードの配色。neutral: 色味のないグレーとセージ、warm: 暖かいグレー、vivid: 鮮やかな配色 */
export type DarkPalette = 'neutral' | 'warm' | 'vivid';

export type Sex = 'm' | 'f';
/** 年齢区分（食事摂取基準の区分に合わせる） */
export type AgeBand =
  '6-7' | '8-9' | '10-11' | '12-14' | '15-17' | '18-29' | '30-49' | '50-64' | '65-74' | '75+';
/** 身体活動レベル（低い・ふつう・高い） */
export type Activity = 'low' | 'normal' | 'high';

export interface Member {
  id: string;
  name: string;
  sex: Sex;
  age: AgeBand;
  activity: Activity;
}

export interface Settings {
  // ---- 表示 ----
  theme: ThemeSetting;
  darkPalette: DarkPalette;
  // ---- 家族と栄養 ----
  members: Member[];
  /** 1 日の栄養のうち夕食でとる割合（0.3〜0.5） */
  dinnerShare: number;
  /** 主食のご飯の量（g / 人。0 で主食なし） */
  riceGrams: number;
  // ---- 調理と買い物 ----
  /** 平日の調理時間の目安（分。主菜・副菜・汁物の合計） */
  weekdayMinutes: number;
  /** 休日の調理時間の目安（分） */
  weekendMinutes: number;
  /** 肉・魚は冷凍して日持ちを延ばす */
  useFreezer: boolean;
  /** 献立を作る日数の既定値 */
  planDays: number;
  /** 買い物の回数（計画期間中） */
  shoppingTrips: number;
  /** 同じ料理を出さない日数 */
  repeatGapDays: number;
  // ---- 季節と気候 ----
  /** 旬の重視度（0〜2） */
  seasonWeight: number;
  /** 気温に合わせる重視度（0〜2） */
  weatherWeight: number;
  /** 天気予報を使う（位置。null は使わない） */
  weatherLocation: { lat: number; lon: number; label: string } | null;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  darkPalette: 'neutral',
  members: [{ id: 'me', name: 'わたし', sex: 'f', age: '30-49', activity: 'normal' }],
  dinnerShare: 0.38,
  riceGrams: 150,
  weekdayMinutes: 35,
  weekendMinutes: 60,
  useFreezer: true,
  planDays: 7,
  shoppingTrips: 1,
  repeatGapDays: 10,
  seasonWeight: 1,
  weatherWeight: 1,
  weatherLocation: null,
};

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: `${STORAGE_PREFIX}:settings`,
      version: 1,
      // 新しい設定項目が増えても既定値で補う
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<Settings>) }),
    },
  ),
);

/** React の外から今の設定を読む */
export function getSettings(): Settings {
  return useSettings.getState();
}
