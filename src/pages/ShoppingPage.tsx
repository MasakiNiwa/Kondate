import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronDown, PackageOpen, ShoppingBasket, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StockSection } from '@/features/shopping/StockSection';
import { useShoppingTrips, type ShoppingTrip } from '@/features/shopping/useShopping';
import { FOOD_MAP, dishesUsingFood, getDish, seasonalPrice } from '@/lib/food/catalog';
import type { FoodCategory } from '@/lib/food/types';
import { addToStock, db } from '@/lib/db/db';
import { categoryOrder } from '@/lib/planner/evaluate';
import { isPerishable } from '@/lib/planner/scoring';
import { cn } from '@/lib/utils/cn';
import { formatAmount, formatYen } from '@/lib/utils/format';

const CATEGORY_LABELS: Partial<Record<FoodCategory, string>> = {
  vegetable: '野菜',
  tuber: '野菜',
  mushroom: 'きのこ',
  fruit: '果物',
  meat: '肉',
  processed: '加工品',
  fish: '魚介',
  egg: '卵・乳製品',
  dairy: '卵・乳製品',
  soy: '豆腐・大豆',
  grain: '麺',
};

function amountLabel(foodId: string, grams: number): string {
  const f = FOOD_MAP.get(foodId);
  if (f?.pieceGrams)
    return `${formatAmount(Math.round((grams / f.pieceGrams) * 10) / 10)}${f.pieceLabel}`;
  return `${formatAmount(grams)}g`;
}

/** この買い物の献立で使う常備品の名前 */
function pantryNames(trip: ShoppingTrip): string[] {
  const ids = new Set<string>();
  for (const d of trip.days) {
    for (const id of d.dishes) {
      for (const ing of getDish(id)?.ingredients ?? []) {
        if (FOOD_MAP.get(ing.foodId)?.pantry) ids.add(ing.foodId);
      }
    }
  }
  return [...ids].map((id) => FOOD_MAP.get(id)!.name);
}

function TripCard({ trip }: { trip: ShoppingTrip }) {
  const [showPantry, setShowPantry] = useState(false);
  const month = parseISO(trip.date).getMonth() + 1;
  const buy = trip.items
    .filter((i) => i.packs > 0)
    .sort((a, b) => categoryOrder(a.foodId) - categoryOrder(b.foodId));
  const total = buy.reduce(
    (s, i) => s + i.packs * seasonalPrice(FOOD_MAP.get(i.foodId)!, month),
    0,
  );
  const done = buy.filter((i) => i.checked).length;
  const groupMap = new Map<string, typeof buy>();
  for (const it of buy) {
    const label = CATEGORY_LABELS[FOOD_MAP.get(it.foodId)?.category ?? 'processed'] ?? 'その他';
    groupMap.set(label, [...(groupMap.get(label) ?? []), it]);
  }
  const groups = [...groupMap.entries()];
  const leftovers = buy
    .map((i) => {
      const f = FOOD_MAP.get(i.foodId)!;
      return { item: i, food: f, rest: i.packs * f.packGrams - i.usedGrams };
    })
    .filter((x) => x.rest >= x.food.packGrams * 0.15 && isPerishable(x.food));
  const pantry = pantryNames(trip);
  const range =
    trip.days.length > 0
      ? `${format(parseISO(trip.days[0].date), 'M/d')}〜${format(parseISO(trip.days[trip.days.length - 1].date), 'M/d')}の ${trip.days.length} 日分`
      : '';

  const addLeftoversToStock = async () => {
    await addToStock(leftovers.map((l) => ({ foodId: l.food.id, grams: Math.round(l.rest) })));
    toast.success('余る食材を「手元にある食材」に登録しました');
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">
        <h2 className="font-semibold">
          {format(parseISO(trip.date), 'M月d日（E）', { locale: ja })}の買い物
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{range}</span>
        <span className="ml-auto text-sm tabular-nums">
          {done}/{buy.length}・<strong>{formatYen(total)}</strong>
        </span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {groups.map(([label, items]) => (
          <div key={label} className="px-4 py-2 sm:px-5">
            <div className="py-1 text-xs font-semibold text-slate-400">{label}</div>
            <ul>
              {items.map((it) => {
                const f = FOOD_MAP.get(it.foodId)!;
                return (
                  <li key={it.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={it.checked}
                        onChange={(e) =>
                          void db.shopping.update(it.id, { checked: e.target.checked })
                        }
                        className="size-5 shrink-0 accent-accent-600"
                      />
                      <span
                        className={cn(
                          'min-w-0 flex-1',
                          it.checked && 'text-slate-400 line-through',
                        )}
                      >
                        <span className="font-medium">{f.name}</span>
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          使う量 {amountLabel(f.id, it.usedGrams)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm tabular-nums">
                        {it.packs > 1 ? `${it.packs} × ` : ''}
                        {f.packLabel}
                        <span className="block text-xs text-slate-400">
                          {formatYen(it.packs * seasonalPrice(f, month))}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {leftovers.length > 0 && (
          <div className="space-y-2 bg-amber-50/60 px-4 py-3 text-sm sm:px-5 dark:bg-amber-900/10">
            <div className="flex items-center gap-2 font-medium">
              <PackageOpen className="size-4 text-amber-600" />
              余る見込みの食材
            </div>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {leftovers.map((l) => (
                <li key={l.food.id}>
                  <strong>{l.food.name}</strong> 約{amountLabel(l.food.id, l.rest)} — 使い道:{' '}
                  {dishesUsingFood(l.food.id)
                    .filter((d) => !trip.days.some((p) => p.dishes.includes(d.id)))
                    .slice(0, 3)
                    .map((d) => d.name)
                    .join('、')}
                </li>
              ))}
            </ul>
            <Button size="sm" onClick={() => void addLeftoversToStock()}>
              手元にある食材に登録
            </Button>
          </div>
        )}
        <div className="px-4 py-2 sm:px-5">
          <button
            type="button"
            onClick={() => setShowPantry(!showPantry)}
            aria-expanded={showPantry}
            className="flex w-full items-center gap-2 py-1 text-xs font-semibold text-slate-500"
          >
            常備品の確認（{pantry.length} 品）
            <ChevronDown
              className={cn('size-4 transition-transform', showPantry && 'rotate-180')}
            />
          </button>
          {showPantry && (
            <p className="pb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {pantry.join('、')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ShoppingPage() {
  const trips = useShoppingTrips();
  const [, navigate] = useLocation();
  return (
    <>
      <PageHeader title="買い物" />
      <PageBody>
        {trips && trips.length === 0 && (
          <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <ShoppingBasket className="size-10 text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              これからの献立がありません。献立を作ると、まとめ買いのリストができます。
            </p>
            <Button variant="primary" onClick={() => navigate('/calendar')}>
              <Sparkles />
              カレンダーへ
            </Button>
          </Card>
        )}
        {trips?.map((t) => (
          <TripCard key={t.key} trip={t} />
        ))}
        <StockSection />
      </PageBody>
    </>
  );
}
