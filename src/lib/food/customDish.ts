import { z } from 'zod';
import { FOODS } from './foods';
import { FOOD_MAP, allDishes } from './catalog';
import type { Dish } from './types';

/** 外部 AI が作る料理データの形（アプリの Dish に変換する前） */
const IngredientSchema = z.object({
  food: z.string().min(1),
  grams: z.number().positive().max(1000),
});

export const CustomDishSchema = z.object({
  name: z.string().min(1).max(40),
  role: z.enum(['main', 'side', 'soup']),
  minutes: z.number().int().min(1).max(240),
  thermal: z.enum(['hot', 'neutral', 'cold']).default('neutral'),
  cuisine: z.enum(['japanese', 'western', 'chinese', 'korean', 'ethnic']).default('japanese'),
  protein: z
    .enum(['chicken', 'pork', 'beef', 'fish', 'seafood', 'egg', 'soy', 'mixed', 'none'])
    .default('none'),
  includesStaple: z.boolean().optional(),
  ingredients: z.array(IngredientSchema).min(1).max(20),
  howto: z.string().max(200).default(''),
});

const FileSchema = z.object({ dishes: z.array(CustomDishSchema).min(1).max(30) });

export interface ParseResult {
  dishes: Dish[];
  errors: string[];
}

/** 文章の中から JSON を取り出す（```json ... ``` で囲まれていても読める） */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  if (start < 0) throw new Error('JSON が見つかりません');
  return JSON.parse(body.slice(start, Math.max(body.lastIndexOf('}'), body.lastIndexOf(']')) + 1));
}

function slug(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return `c-${h.toString(36)}`;
}

/**
 * 外部 AI の出力を検証して、アプリの料理データにする。
 * 食材はアプリの食材 ID（または食材名）に限る。知らない食材がある料理は取り込まない。
 */
export function parseCustomDishes(text: string): ParseResult {
  const errors: string[] = [];
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (e) {
    return {
      dishes: [],
      errors: [`JSON として読めません: ${e instanceof Error ? e.message : String(e)}`],
    };
  }
  const parsed = FileSchema.safeParse(Array.isArray(raw) ? { dishes: raw } : raw);
  if (!parsed.success) {
    return {
      dishes: [],
      errors: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  const byName = new Map(FOODS.map((f) => [f.name, f.id]));
  const existing = new Set(allDishes().map((d) => d.name));
  const dishes: Dish[] = [];
  for (const d of parsed.data.dishes) {
    const unknown: string[] = [];
    const ingredients = d.ingredients.flatMap((i) => {
      const id = FOOD_MAP.has(i.food) ? i.food : byName.get(i.food);
      if (!id) {
        unknown.push(i.food);
        return [];
      }
      return [{ foodId: id, grams: i.grams }];
    });
    if (unknown.length) {
      errors.push(`「${d.name}」: 知らない食材があるため取り込みません（${unknown.join('、')}）`);
      continue;
    }
    if (existing.has(d.name)) {
      errors.push(`「${d.name}」: 同じ名前の料理がすでにあります（上書きします）`);
    }
    dishes.push({
      id: slug(d.name),
      name: d.name,
      role: d.role,
      minutes: d.minutes,
      thermal: d.thermal,
      cuisine: d.cuisine,
      protein: d.role === 'main' ? d.protein : 'none',
      includesStaple: d.role === 'main' ? d.includesStaple : undefined,
      ingredients,
      howto: d.howto,
      tags: ['custom'],
    });
  }
  return { dishes, errors };
}

/** 外部 AI に渡すプロンプト（アプリの食材の一覧と、出力の形を含む） */
export function buildDishPrompt(request: string): string {
  const foods = FOODS.map((f) => `${f.id}=${f.name}`).join(', ');
  return `あなたは家庭料理に詳しい料理研究家です。献立アプリ「献立アルゴリズム」に追加する夕食の料理データを作ってください。

## 作ってほしい料理
${request || '手軽に作れて美味しい、家庭の夕食の料理を 5 品（主菜・副菜・汁物をバランスよく）'}

## ルール
- 材料は、下の「使える食材」の ID だけを使う（ない食材は使わない。水・だし汁は書かない）
- 分量は 1 人分のグラム（調味料も含める。しょうゆ大さじ1≒18g、みそ大さじ1≒18g、油大さじ1≒12g、砂糖大さじ1≒9g）
- role: main=主菜, side=副菜, soup=汁物。丼・カレー・麺など主食を兼ねる主菜は includesStaple: true にして、ご飯（rice）や麺を材料に入れる
- thermal: hot=温かい, neutral=どちらでも, cold=冷たい・さっぱり
- cuisine: japanese / western / chinese / korean / ethnic
- protein（主菜のみ）: chicken / pork / beef / fish / seafood / egg / soy / mixed / none
- minutes は調理時間（分）。howto は作り方の要点（60 字程度）
- 出力は JSON だけ（説明文は書かない）

## 出力の形
{"dishes":[{"name":"鶏むねのみぞれ煮","role":"main","minutes":20,"thermal":"hot","cuisine":"japanese","protein":"chicken","ingredients":[{"food":"chicken-breast","grams":100},{"food":"daikon","grams":80},{"food":"soy-sauce","grams":9},{"food":"mirin","grams":9},{"food":"starch","grams":5}],"howto":"片栗粉をまぶした鶏を焼き、大根おろしとしょうゆ・みりんで煮る"}]}

## 使える食材（ID=名前）
${foods}`;
}
