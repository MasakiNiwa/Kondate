import { useState } from 'react';
import { Plus, Refrigerator, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FOODS } from '@/lib/food/foods';
import { FOOD_MAP } from '@/lib/food/catalog';
import { addToStock, db, updateStock } from '@/lib/db/db';

const BUYABLE = FOODS.filter((f) => !f.pantry).sort((a, b) => a.name.localeCompare(b.name, 'ja'));

/** 手元にある食材（次の献立の計算で優先して使い切る） */
export function StockSection() {
  const stock = useLiveQuery(() => db.stock.toArray(), []) ?? [];
  const [foodId, setFoodId] = useState(BUYABLE[0].id);
  const [grams, setGrams] = useState(100);

  const add = () => addToStock([{ foodId, grams }]);

  return (
    <Section
      title="手元にある食材"
      description="登録すると、次に献立を作るときに優先して使い切ります"
      icon={<Refrigerator />}
      collapsible
    >
      <div className="space-y-3 px-4 py-3.5 sm:px-5">
        {stock.length === 0 && <p className="text-sm text-slate-500">まだありません。</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {stock.map((s) => (
            <li key={s.foodId} className="flex items-center gap-2 py-2 text-sm">
              <span className="flex-1">{FOOD_MAP.get(s.foodId)?.name ?? s.foodId}</span>
              <input
                type="number"
                min={0}
                step={10}
                value={s.grams}
                aria-label="量（g）"
                onChange={(e) => void updateStock(s.foodId, Number(e.target.value))}
                className="h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-right tabular-nums dark:border-slate-700 dark:bg-slate-900"
              />
              <span className="text-slate-500">g</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="削除"
                onClick={() => void db.stock.delete(s.foodId)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="min-w-40 flex-1"
            aria-label="食材"
            value={foodId}
            onChange={setFoodId}
            options={BUYABLE.map((f) => ({ value: f.id, label: f.name }))}
          />
          <input
            type="number"
            min={10}
            step={10}
            value={grams}
            aria-label="量（g）"
            onChange={(e) => setGrams(Math.max(10, Number(e.target.value)))}
            className="h-10 w-24 rounded-xl border border-slate-300 bg-white px-2 text-right tabular-nums dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="text-sm text-slate-500">g</span>
          <Button onClick={() => void add()}>
            <Plus />
            追加
          </Button>
        </div>
      </div>
    </Section>
  );
}
