import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { CloudProviderId } from '@/lib/cloud/keyVault';
import type { AiTask } from '@/features/ai/aiTask';

export type ThemeSetting = 'system' | 'light' | 'dark';
/** ダークモードの配色。neutral: 色味のないグレーとセージ、warm: 暖かいグレー、vivid: 鮮やかな配色 */
export type DarkPalette = 'neutral' | 'warm' | 'vivid';

export type Sex = 'm' | 'f';
/** 年齢区分（食事摂取基準の区分に合わせる） */
export type AgeBand =
  '6-7' | '8-9' | '10-11' | '12-14' | '15-17' | '18-29' | '30-49' | '50-64' | '65-74' | '75+';
/** 身体活動レベル（低い・ふつう・高い） */
export type Activity = 'low' | 'normal' | 'high';

/** AI の接続先（none: 使わない。local: 端末内のモデル） */
export type AiProvider = 'none' | 'local' | CloudProviderId;

/** 応答の種類ごとの接続先（cloud のときはモデルも） */
export interface TaskRoute {
  provider: Exclude<AiProvider, 'none'>;
  model?: string;
}

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
  // ---- AI ----
  /** いつもの AI の接続先 */
  aiProvider: AiProvider;
  /** クラウド AI ごとの使うモデル */
  cloudModels: Partial<Record<CloudProviderId, string>>;
  /** クラウド AI ごとに、送る内容の説明に同意したか */
  cloudConsents: Partial<Record<CloudProviderId, boolean>>;
  /** 最近使ったクラウド AI のモデル（「接続先|モデル」。新しい順） */
  recentCloudModels: string[];
  /** ★ を付けた OpenRouter のモデル */
  openrouterFavorites: string[];
  /** 応答の種類ごとの AI */
  taskModels: Partial<Record<AiTask, TaskRoute>>;
  /** AI のキャラクター（1〜2 人） */
  personas: string[];
  /** 献立を見たときに AI のひとことを出す */
  autoReaction: boolean;
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
  aiProvider: 'none',
  cloudModels: {},
  cloudConsents: {},
  recentCloudModels: [],
  openrouterFavorites: [],
  taskModels: {},
  personas: ['chef', 'dietitian'],
  autoReaction: false,
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
