import { addDays, format, parseISO } from 'date-fns';
import { usePrefs } from '@/features/prefs/prefsStore';
import { loadPlanContext } from '@/features/plan/repository';
import { computeInsights } from '@/lib/analysis/insights';
import { DISHES } from '@/lib/food/dishes';
import { ROLES, dishNutrition, dishSeasonality, getDish } from '@/lib/food/catalog';
import { NUTRIENTS } from '@/lib/food/nutrients';
import type { DishRole, NutrientKey } from '@/lib/food/types';
import { NUTRIENT_KEYS } from '@/lib/food/types';
import type { JsonValue, ToolCallInfo, ToolDeclaration } from '@/lib/llm/types';
import { rankAlternatives } from '@/lib/planner/alternatives';
import { db } from '@/lib/db/db';
import { FOOD_MAP } from '@/lib/food/catalog';
import { formatAmount } from '@/lib/utils/format';
import { aiTargets, dayForAi, rowsBetween } from './appContext';

/** AI が差し替えを提案したもの（チャットにカードで出し、押したら差し替える） */
export interface SwapProposal {
  date: string;
  index: number;
  dishId: string;
  reason: string;
}

const NUTRIENT_ENUM = [...NUTRIENT_KEYS];
const ROLE_ENUM = ['main', 'side', 'soup'];

/**
 * AI に使わせるツール。AI は判断材料をツールで調べ、献立を変えるときは「提案」までにとどめる
 * （実際に変えるのはユーザーがカードを押したとき）。
 */
export const AI_TOOLS: ToolDeclaration[] = [
  {
    name: 'get_menu',
    description:
      '指定した日から数日分の献立（料理・栄養スコア・不足/過多の栄養素・作ったか）を取得する',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'yyyy-MM-dd' },
        days: { type: 'integer', description: '日数（1〜14）' },
      },
      required: ['start_date'],
    },
  },
  {
    name: 'get_day_nutrition',
    description: 'その日の夕食の栄養素ごとの量と目標（1 人分）を取得する',
    parameters: {
      type: 'object',
      properties: { date: { type: 'string', description: 'yyyy-MM-dd' } },
      required: ['date'],
    },
  },
  {
    name: 'search_dishes',
    description: 'アプリの料理データから料理を探す。名前・役割・多く含む栄養素・旬で絞り込める',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '名前の一部（任意）' },
        role: { type: 'string', enum: ROLE_ENUM, description: 'main=主菜, side=副菜, soup=汁物' },
        rich_in: { type: 'string', enum: NUTRIENT_ENUM, description: '多く含む栄養素' },
        in_season: { type: 'boolean', description: '今が旬の料理だけ' },
      },
    },
  },
  {
    name: 'suggest_swaps',
    description:
      'その日の主菜・副菜・汁物の差し替え候補を、追加の買い物・栄養・旬・好みで順位付けして取得する',
    parameters: {
      type: 'object',
      properties: { date: { type: 'string' }, role: { type: 'string', enum: ROLE_ENUM } },
      required: ['date', 'role'],
    },
  },
  {
    name: 'propose_swap',
    description:
      '差し替えをユーザーに提案する（チャットにボタンが出て、ユーザーが押すと差し替わる）。dish_id は search_dishes か suggest_swaps で得た ID を使う',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        role: { type: 'string', enum: ROLE_ENUM },
        dish_id: { type: 'string' },
        reason: { type: 'string', description: '提案の理由（短く）' },
      },
      required: ['date', 'role', 'dish_id'],
    },
  },
  {
    name: 'get_shopping_list',
    description: 'これからの買い物リスト（買う食材・パック数・買ったか）を取得する',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_insights',
    description: '直近 30 日の献立から計算した気づき（不足しがちな栄養素など）を取得する',
    parameters: { type: 'object', properties: {} },
  },
];

const str = (v: JsonValue | undefined) => (typeof v === 'string' ? v : '');

/** ツールを実行する。onProposal で提案をチャットに渡す */
export async function runTool(
  call: ToolCallInfo,
  onProposal: (p: SwapProposal) => void,
): Promise<JsonValue> {
  const a = call.arguments;
  switch (call.name) {
    case 'get_menu': {
      const start = str(a.start_date) || format(new Date(), 'yyyy-MM-dd');
      const days = Math.max(1, Math.min(14, Number(a.days) || 7));
      const rows = await rowsBetween(
        start,
        format(addDays(parseISO(start), days - 1), 'yyyy-MM-dd'),
      );
      return rows.length ? rows.map(dayForAi) : '献立がありません';
    }
    case 'get_day_nutrition': {
      const [row] = await rowsBetween(str(a.date), str(a.date));
      if (!row) return 'その日の献立はありません';
      const t = aiTargets();
      return NUTRIENT_KEYS.map((k) => ({
        nutrient: NUTRIENTS[k].label,
        amount: `${formatAmount(row.nutrients[k])}${NUTRIENTS[k].unit}`,
        target:
          NUTRIENTS[k].goal === 'max'
            ? `${formatAmount(t[k].hi)} 以下`
            : `${formatAmount(t[k].lo)}${Number.isFinite(t[k].hi) && NUTRIENTS[k].goal === 'range' ? `〜${formatAmount(t[k].hi)}` : ' 以上'}`,
      }));
    }
    case 'search_dishes': {
      const month = new Date().getMonth() + 1;
      const rich = str(a.rich_in) as NutrientKey;
      let list = DISHES.filter(
        (d) =>
          (!a.query || d.name.includes(str(a.query))) &&
          (!a.role || d.role === a.role) &&
          (!a.in_season || dishSeasonality(d, month) >= 0.3),
      );
      if (NUTRIENT_KEYS.includes(rich)) {
        list = [...list].sort((x, y) => dishNutrition(y)[rich] - dishNutrition(x)[rich]);
      }
      return list.slice(0, 8).map((d) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        minutes: d.minutes,
        kcal: Math.round(dishNutrition(d).energy),
        ...(NUTRIENT_KEYS.includes(rich) && {
          [NUTRIENTS[rich].label]: formatAmount(dishNutrition(d)[rich]),
        }),
      }));
    }
    case 'suggest_swaps': {
      const date = str(a.date);
      const index = ROLES.indexOf(str(a.role) as DishRole);
      const plan = await db.plans.get(date);
      if (!plan || index < 0) return 'その日の献立はありません';
      const loaded = await loadPlanContext(plan.planId);
      if (!loaded) return '計算の情報が見つかりません';
      return rankAlternatives(
        loaded.ctx,
        loaded.days,
        loaded.dates.indexOf(date),
        index,
        usePrefs.getState(),
        6,
      ).map((x) => ({
        id: x.dish.id,
        name: x.dish.name,
        extraCostYen: x.deltaCost,
        nutritionScore: x.nutrition,
        reasons: x.reasons,
      }));
    }
    case 'propose_swap': {
      const date = str(a.date);
      const index = ROLES.indexOf(str(a.role) as DishRole);
      const dish = getDish(str(a.dish_id));
      const plan = await db.plans.get(date);
      if (!plan) return 'その日の献立はありません';
      if (!dish || index < 0 || dish.role !== ROLES[index])
        return 'dish_id が正しくありません。search_dishes で ID を確かめてください';
      onProposal({ date, index, dishId: dish.id, reason: str(a.reason) });
      return `${date} の${getDish(plan.dishes[index])?.name ?? ''}を${dish.name}に替える提案を表示しました。ユーザーが押すと差し替わります`;
    }
    case 'get_shopping_list': {
      const items = await db.shopping
        .where('date')
        .aboveOrEqual(format(addDays(new Date(), -7), 'yyyy-MM-dd'))
        .toArray();
      return items
        .filter((i) => i.packs > 0)
        .map((i) => ({
          date: i.date,
          food: FOOD_MAP.get(i.foodId)?.name ?? i.foodId,
          packs: i.packs,
          unit: FOOD_MAP.get(i.foodId)?.packLabel ?? '',
          bought: i.checked,
        }));
    }
    case 'get_insights': {
      const to = format(new Date(), 'yyyy-MM-dd');
      const from = format(addDays(new Date(), -29), 'yyyy-MM-dd');
      const rows = await rowsBetween(from, to);
      return computeInsights({ rows, targets: aiTargets(), month: new Date().getMonth() + 1 }).map(
        (i) => ({
          title: i.title,
          body: i.body,
          dishes: (i.dishes ?? []).map((id) => getDish(id)?.name ?? id),
        }),
      );
    }
    default:
      return `不明なツール: ${call.name}`;
  }
}
