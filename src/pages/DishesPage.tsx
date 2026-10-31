import { useMemo, useState } from 'react';
import { Leaf, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddDishesDialog } from '@/features/custom/AddDishesDialog';
import { useCustomDishes } from '@/features/custom/customDishStore';
import { DISHES } from '@/lib/food/dishes';
import { useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { DishDialog } from '@/features/dishes/DishDialog';
import { RoleBadge } from '@/features/dishes/RoleBadge';
import { PrefToggle } from '@/features/prefs/PrefToggle';
import { usePrefs } from '@/features/prefs/prefsStore';
import {
  ROLE_LABELS,
  allDishes,
  dishNutrition,
  dishSeasonality,
  isInSeason,
  seasonalPrice,
} from '@/lib/food/catalog';
import { FOODS } from '@/lib/food/foods';
import type { Dish, DishRole, FoodCategory } from '@/lib/food/types';
import { cn } from '@/lib/utils/cn';
import { formatYen } from '@/lib/utils/format';

type Tab = 'dishes' | 'foods';

const DISH_COUNT = DISHES.length;

const FOOD_GROUPS: { label: string; cats: FoodCategory[] }[] = [
  { label: '野菜・いも・きのこ', cats: ['vegetable', 'tuber', 'mushroom', 'fruit'] },
  { label: '肉・加工品', cats: ['meat', 'processed'] },
  { label: '魚介', cats: ['fish'] },
  { label: '卵・乳・大豆', cats: ['egg', 'dairy', 'soy'] },
  { label: '麺', cats: ['grain'] },
];

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="名前で探す"
        className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  );
}

function SeasonBar({ months }: { months: number[] }) {
  const now = new Date().getMonth() + 1;
  return (
    <div className="flex gap-px" aria-label={months.length ? `旬: ${months.join('・')}月` : '通年'}>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
        <span
          key={m}
          className={cn(
            'h-2 w-1.5 rounded-[1px]',
            months.includes(m)
              ? 'bg-emerald-500 dark:bg-emerald-600'
              : 'bg-slate-200 dark:bg-slate-800',
            m === now && 'outline outline-1 outline-slate-400',
          )}
        />
      ))}
    </div>
  );
}

function DishList() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<DishRole | 'all'>('all');
  const [seasonOnly, setSeasonOnly] = useState(false);
  const [picked, setPicked] = useState<Dish | null>(null);
  const { dishPrefs, setDish } = usePrefs();
  const month = new Date().getMonth() + 1;
  const custom = useCustomDishes((s) => s.list);
  const list = useMemo(
    () =>
      allDishes().filter(
        (d) =>
          (role === 'all' || d.role === role) &&
          (!q || d.name.includes(q)) &&
          (!seasonOnly || dishSeasonality(d, month) >= 0.3),
      ),
    // custom: 追加した料理が変わったら一覧を作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, role, seasonOnly, month, custom],
  );
  return (
    <>
      <SearchBox value={q} onChange={setQ} />
      <div className="flex flex-wrap gap-2">
        <Chip active={role === 'all'} onClick={() => setRole('all')}>
          すべて
        </Chip>
        {(Object.keys(ROLE_LABELS) as DishRole[]).map((r) => (
          <Chip key={r} active={role === r} onClick={() => setRole(r)}>
            {ROLE_LABELS[r]}
          </Chip>
        ))}
        <Chip active={seasonOnly} onClick={() => setSeasonOnly(!seasonOnly)}>
          <span className="inline-flex items-center gap-1">
            <Leaf className="size-3.5" />
            今が旬
          </span>
        </Chip>
      </div>
      <Card className="divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((d) => (
          <div key={d.id} className="flex items-center gap-2 px-3 py-2 sm:px-4">
            <button
              type="button"
              onClick={() => setPicked(d)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <RoleBadge role={d.role} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{d.name}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {d.minutes}分・{Math.round(dishNutrition(d).energy)}kcal
                  {d.tags?.includes('custom') && (
                    <span className="ml-1 text-sky-700 dark:text-sky-400">追加</span>
                  )}
                  {dishSeasonality(d, month) >= 0.3 && (
                    <span className="ml-1 text-emerald-700 dark:text-emerald-400">旬</span>
                  )}
                </span>
              </span>
            </button>
            <PrefToggle
              value={dishPrefs[d.id] ?? 'neutral'}
              onChange={(p) => setDish(d.id, p)}
              label={d.name}
            />
          </div>
        ))}
        {list.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">見つかりませんでした</p>
        )}
      </Card>
      <DishDialog dish={picked} onClose={() => setPicked(null)} />
    </>
  );
}

function FoodList() {
  const [q, setQ] = useState('');
  const { foodPrefs, setFood } = usePrefs();
  const month = new Date().getMonth() + 1;
  const groups = [
    ...FOOD_GROUPS,
    { label: '常備品（調味料・乾物・米）', cats: [] as FoodCategory[] },
  ];
  return (
    <>
      <SearchBox value={q} onChange={setQ} />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        苦手な食材を「使わない」にすると、その食材を使う料理は献立に出ません。緑の帯は旬の月です。
      </p>
      {groups.map((g) => {
        const foods = FOODS.filter(
          (f) =>
            (g.cats.length ? !f.pantry && g.cats.includes(f.category) : f.pantry) &&
            (!q || f.name.includes(q)),
        );
        if (foods.length === 0) return null;
        return (
          <Card key={g.label} className="overflow-hidden">
            <h2 className="border-b border-slate-100 px-4 py-2 text-sm font-semibold dark:border-slate-800">
              {g.label}
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {foods.map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-3 py-2 sm:px-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{f.name}</span>
                      {isInSeason(f, month) && (
                        <Leaf className="size-3.5 shrink-0 text-emerald-600" />
                      )}
                    </div>
                    {!f.pantry && (
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <SeasonBar months={f.peakMonths} />
                        <span className="truncate">
                          {f.packLabel} {formatYen(seasonalPrice(f, month))}・日持ち {f.shelfDays}日
                        </span>
                      </div>
                    )}
                  </div>
                  <PrefToggle
                    value={foodPrefs[f.id] ?? 'neutral'}
                    onChange={(p) => setFood(f.id, p)}
                    label={f.name}
                  />
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </>
  );
}

export default function DishesPage() {
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const tab: Tab = params.tab === 'foods' ? 'foods' : 'dishes';
  const [adding, setAdding] = useState(false);
  const count = useCustomDishes((s) => s.list.length) + DISH_COUNT;
  return (
    <>
      <PageHeader
        title="料理"
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus />
            <span className="max-sm:sr-only">料理を追加</span>
          </Button>
        }
      />
      <AddDishesDialog open={adding} onClose={() => setAdding(false)} />
      <PageBody>
        <Tabs<Tab>
          value={tab}
          onChange={(t) => navigate(t === 'foods' ? '/dishes/foods' : '/dishes')}
          items={[
            { value: 'dishes', label: `料理（${count}）` },
            { value: 'foods', label: `食材（${FOODS.length}）` },
          ]}
        />
        {tab === 'dishes' ? <DishList /> : <FoodList />}
      </PageBody>
    </>
  );
}
