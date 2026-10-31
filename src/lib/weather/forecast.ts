import { addDays, format, parseISO } from 'date-fns';
import { nearestCity, normalMaxTemp, DEFAULT_CITY } from '@/lib/food/climate';

export interface DayTemp {
  date: string;
  maxTemp: number;
  source: 'forecast' | 'normal';
}

const cache = new Map<string, { at: number; data: Record<string, number> }>();

/** Open-Meteo の天気予報（最高気温）。失敗したら空 */
async function fetchForecast(lat: number, lon: number): Promise<Record<string, number>> {
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 3 * 3600_000) return hit.data;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=Asia%2FTokyo&forecast_days=16`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return {};
    const json = (await res.json()) as {
      daily?: { time: string[]; temperature_2m_max: (number | null)[] };
    };
    const data: Record<string, number> = {};
    json.daily?.time.forEach((t, i) => {
      const v = json.daily!.temperature_2m_max[i];
      if (typeof v === 'number') data[t] = v;
    });
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return {};
  }
}

/** 期間の日ごとの最高気温（予報があれば予報、なければ平年値） */
export async function dailyMaxTemps(
  startDate: string,
  days: number,
  location: { lat: number; lon: number } | null,
): Promise<DayTemp[]> {
  const city = location ? nearestCity(location.lat, location.lon) : DEFAULT_CITY;
  const forecast = location ? await fetchForecast(location.lat, location.lon) : {};
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(parseISO(startDate), i);
    const date = format(d, 'yyyy-MM-dd');
    const f = forecast[date];
    return f !== undefined
      ? { date, maxTemp: Math.round(f * 10) / 10, source: 'forecast' as const }
      : { date, maxTemp: Math.round(normalMaxTemp(d, city) * 10) / 10, source: 'normal' as const };
  });
}
