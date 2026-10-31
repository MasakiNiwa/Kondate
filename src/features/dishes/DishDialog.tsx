import { useMemo } from 'react';
import { Clock, Leaf, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCustomDishes } from '@/features/custom/customDishStore';
import { Dialog } from '@/components/ui/Dialog';
import { NutritionBars } from '@/features/plan/NutritionBars';
import { PrefToggle } from '@/features/prefs/PrefToggle';
import { usePrefs } from '@/features/prefs/prefsStore';
import { useSettings } from '@/features/settings/settingsStore';
import { FOOD_MAP, dishNutrition, dishSeasonality } from '@/lib/food/catalog';
import { householdDailyTargets, mealTargets } from '@/lib/food/reference';
import type { Dish } from '@/lib/food/types';
import { formatAmount } from '@/lib/utils/format';
import { RoleBadge } from './RoleBadge';

const THERMAL = { hot: '温かい', neutral: '', cold: '冷たい・さっぱり' };
const CUISINE = {
  japanese: '和食',
  western: '洋食',
  chinese: '中華',
  korean: '韓国風',
  ethnic: 'エスニック',
};

/** 料理の詳細（材料・栄養・好み） */
export function DishDialog({ dish, onClose }: { dish: Dish | null; onClose: () => void }) {
  const pref = usePrefs((s) => (dish ? (s.dishPrefs[dish.id] ?? 'neutral') : 'neutral'));
  const setDish = usePrefs((s) => s.setDish);
  const removeCustom = useCustomDishes((s) => s.remove);
  const members = useSettings((s) => s.members);
  const share = useSettings((s) => s.dinnerShare);
  // 1 品の栄養なので、夕食の目標の 1/3 を目安として表示する
  const targets = useMemo(
    () => mealTargets(householdDailyTargets(members), share / 3),
    [members, share],
  );
  const month = new Date().getMonth() + 1;
  return (
    <Dialog open={dish !== null} onClose={onClose} title={dish?.name ?? ''}>
      {dish && (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={dish.role} />
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="size-4" />
              {dish.minutes}分
            </span>
            <span className="text-slate-500">{CUISINE[dish.cuisine]}</span>
            {THERMAL[dish.thermal] && (
              <span className="text-slate-500">{THERMAL[dish.thermal]}</span>
            )}
            {dish.includesStaple && <span className="text-slate-500">主食を兼ねる</span>}
            {dishSeasonality(dish, month) >= 0.3 && (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Leaf className="size-4" />
                今が旬
              </span>
            )}
            <span className="ml-auto">
              <PrefToggle value={pref} onChange={(p) => setDish(dish.id, p)} label={dish.name} />
            </span>
          </div>
          <p>{dish.howto}</p>
          {dish.tags?.includes('custom') && (
            <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-900/20 dark:text-sky-300">
              <span className="flex-1">追加した料理です</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void removeCustom(dish.id);
                  onClose();
                }}
              >
                <Trash2 />
                削除
              </Button>
            </div>
          )}
          <div>
            <h3 className="mb-1 font-semibold">材料（1 人分）</h3>
            <ul className="grid grid-cols-2 gap-x-4 text-slate-600 dark:text-slate-300">
              {dish.ingredients.map((i) => (
                <li
                  key={i.foodId}
                  className="flex justify-between gap-2 border-b border-slate-100 py-1 dark:border-slate-800"
                >
                  <span className="truncate">{FOOD_MAP.get(i.foodId)?.name}</span>
                  <span className="tabular-nums text-slate-500">{formatAmount(i.grams)}g</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">栄養（1 人分）</h3>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              目安は夕食の目標の 1/3（主菜・副菜・汁物で分ける想定）です。
            </p>
            <NutritionBars nutrients={dishNutrition(dish)} targets={targets} />
          </div>
        </div>
      )}
    </Dialog>
  );
}
