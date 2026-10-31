/**
 * 季節と気候。天気予報が使えないときは、地域の平年の気温（月ごとの日最高気温の平均・概数）で計算する。
 * 出典: 気象庁 平年値（1991〜2020 年）をもとに丸めた値。
 */
export interface CityClimate {
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** 1〜12 月の日最高気温の平年値（℃） */
  maxTemp: number[];
}

export const CITIES: CityClimate[] = [
  {
    id: 'sapporo',
    label: '札幌',
    lat: 43.06,
    lon: 141.35,
    maxTemp: [-0.4, 0.4, 4.5, 11.7, 17.9, 21.8, 25.4, 26.4, 22.8, 16.4, 8.7, 2.1],
  },
  {
    id: 'sendai',
    label: '仙台',
    lat: 38.27,
    lon: 140.87,
    maxTemp: [5.6, 6.5, 10.1, 15.5, 20.3, 23.2, 26.7, 28.2, 25.0, 19.8, 14.0, 8.3],
  },
  {
    id: 'tokyo',
    label: '東京',
    lat: 35.69,
    lon: 139.69,
    maxTemp: [9.8, 10.9, 14.2, 19.4, 23.6, 26.1, 29.9, 31.3, 27.5, 22.0, 16.7, 12.0],
  },
  {
    id: 'nagoya',
    label: '名古屋',
    lat: 35.18,
    lon: 136.91,
    maxTemp: [9.4, 10.8, 14.7, 20.4, 24.9, 27.8, 31.8, 33.4, 29.3, 23.3, 17.3, 11.8],
  },
  {
    id: 'osaka',
    label: '大阪',
    lat: 34.69,
    lon: 135.5,
    maxTemp: [9.7, 10.5, 14.1, 19.9, 24.6, 27.5, 31.5, 33.4, 29.3, 23.6, 17.7, 12.3],
  },
  {
    id: 'hiroshima',
    label: '広島',
    lat: 34.39,
    lon: 132.46,
    maxTemp: [9.8, 11.0, 14.6, 20.0, 24.7, 27.4, 31.1, 32.9, 29.1, 23.6, 17.6, 12.0],
  },
  {
    id: 'fukuoka',
    label: '福岡',
    lat: 33.59,
    lon: 130.4,
    maxTemp: [10.2, 11.5, 14.9, 19.8, 24.1, 26.9, 31.1, 32.5, 28.6, 23.6, 18.1, 12.7],
  },
  {
    id: 'naha',
    label: '那覇',
    lat: 26.21,
    lon: 127.68,
    maxTemp: [19.8, 20.2, 21.7, 24.1, 26.7, 29.4, 31.8, 31.6, 30.4, 27.9, 24.8, 21.4],
  },
];

export const DEFAULT_CITY = CITIES[2];

/** 位置からいちばん近い都市（平年の気温を借りる） */
export function nearestCity(lat: number, lon: number): CityClimate {
  let best = DEFAULT_CITY;
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** その日の平年の最高気温（月の中で前後の月となめらかにつなぐ） */
export function normalMaxTemp(date: Date, city: CityClimate = DEFAULT_CITY): number {
  const m = date.getMonth();
  const day = date.getDate();
  const days = new Date(date.getFullYear(), m + 1, 0).getDate();
  // 月の中旬を基準に、前後の月と線形補間
  const t = (day - 0.5) / days - 0.5;
  const other = t < 0 ? (m + 11) % 12 : (m + 1) % 12;
  return city.maxTemp[m] + (city.maxTemp[other] - city.maxTemp[m]) * Math.abs(t);
}

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASON_LABELS: Record<SeasonId, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

export function seasonOf(month: number): SeasonId {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** 気温の体感区分 */
export type Climate = 'hot' | 'warm' | 'mild' | 'cool' | 'cold';

export function climateOf(maxTemp: number): Climate {
  if (maxTemp >= 29) return 'hot';
  if (maxTemp >= 24) return 'warm';
  if (maxTemp >= 16) return 'mild';
  if (maxTemp >= 10) return 'cool';
  return 'cold';
}

export const CLIMATE_LABELS: Record<Climate, string> = {
  hot: '暑い',
  warm: '暖かい',
  mild: 'おだやか',
  cool: '肌寒い',
  cold: '寒い',
};
