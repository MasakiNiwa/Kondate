import { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { CITIES, nearestCity } from '@/lib/food/climate';
import { useSettings } from './settingsStore';

const NONE = 'none';
const CURRENT = 'current';

/** 天気予報・平年の気温に使う地域 */
export function WeatherLocationField() {
  const loc = useSettings((s) => s.weatherLocation);
  const update = useSettings((s) => s.update);
  const [busy, setBusy] = useState(false);
  const value = !loc ? NONE : (CITIES.find((c) => c.label === loc.label)?.id ?? CURRENT);

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error('この端末では現在地を使えません');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false);
        // 天気予報に使うだけなので、細かい位置は持たない（小数 2 桁 ≒ 1km）
        const lat = Math.round(p.coords.latitude * 100) / 100;
        const lon = Math.round(p.coords.longitude * 100) / 100;
        update({
          weatherLocation: { lat, lon, label: `現在地（${nearestCity(lat, lon).label}付近）` },
        });
      },
      () => {
        setBusy(false);
        toast.error('現在地を取得できませんでした');
      },
      { maximumAge: 3600_000, timeout: 10_000 },
    );
  };

  return (
    <Field
      label="地域（天気予報）"
      hint="選ぶと、Open-Meteo の天気予報（最高気温）で料理を選びます。未設定のときは東京の平年の気温で計算します"
      stacked
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="min-w-44 flex-1"
          value={value}
          options={[
            { value: NONE, label: '使わない（平年の気温）' },
            ...CITIES.map((c) => ({ value: c.id, label: c.label })),
            ...(value === CURRENT && loc ? [{ value: CURRENT, label: loc.label }] : []),
          ]}
          onChange={(v) => {
            const c = CITIES.find((x) => x.id === v);
            if (v === NONE) update({ weatherLocation: null });
            else if (c) update({ weatherLocation: { lat: c.lat, lon: c.lon, label: c.label } });
          }}
        />
        <Button onClick={locate} disabled={busy}>
          <LocateFixed />
          現在地
        </Button>
      </div>
    </Field>
  );
}
