import type { Activity, AgeBand, DarkPalette, Sex, ThemeSetting } from './settingsStore';

export const AGE_LABELS: Record<AgeBand, string> = {
  '6-7': '6〜7 歳',
  '8-9': '8〜9 歳',
  '10-11': '10〜11 歳',
  '12-14': '12〜14 歳',
  '15-17': '15〜17 歳',
  '18-29': '18〜29 歳',
  '30-49': '30〜49 歳',
  '50-64': '50〜64 歳',
  '65-74': '65〜74 歳',
  '75+': '75 歳以上',
};

export const SEX_LABELS: Record<Sex, string> = { f: '女性', m: '男性' };

export const ACTIVITY_LABELS: Record<Activity, string> = {
  low: '低い（座りがち）',
  normal: 'ふつう',
  high: '高い（よく動く）',
};

export const THEME_LABELS: Record<ThemeSetting, string> = {
  system: '端末に合わせる',
  light: 'ライト',
  dark: 'ダーク',
};

export const PALETTE_LABELS: Record<DarkPalette, string> = {
  neutral: 'ニュートラル（グレーとセージ）',
  warm: 'ウォーム（暖かいグレー）',
  vivid: 'ビビッド（鮮やか）',
};

export function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
