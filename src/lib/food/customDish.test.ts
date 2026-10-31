import { describe, expect, it } from 'vitest';
import { buildDishPrompt, parseCustomDishes } from './customDish';

describe('custom dishes', () => {
  it('parses AI output (with code fences) into dishes', () => {
    const text =
      '```json\n{"dishes":[{"name":"鶏むねのみぞれ煮","role":"main","minutes":20,"protein":"chicken","ingredients":[{"food":"chicken-breast","grams":100},{"food":"大根（1/2 本）","grams":80}],"howto":"煮る"}]}\n```';
    const r = parseCustomDishes(text);
    expect(r.errors).toEqual([]);
    expect(r.dishes[0].ingredients.map((i) => i.foodId)).toEqual(['chicken-breast', 'daikon']);
    expect(r.dishes[0].id.startsWith('c-')).toBe(true);
  });
  it('rejects dishes with unknown foods', () => {
    const r = parseCustomDishes(
      '{"dishes":[{"name":"謎の料理","role":"side","minutes":5,"ingredients":[{"food":"dragon-fruit","grams":50}]}]}',
    );
    expect(r.dishes).toHaveLength(0);
    expect(r.errors[0]).toContain('dragon-fruit');
  });
  it('reports schema errors', () => {
    expect(parseCustomDishes('{"dishes":[{"name":"x"}]}').errors.length).toBeGreaterThan(0);
    expect(parseCustomDishes('not json').errors[0]).toContain('JSON');
  });
  it('builds a prompt with the food list', () => {
    const p = buildDishPrompt('魚の主菜を 3 品');
    expect(p).toContain('魚の主菜を 3 品');
    expect(p).toContain('chicken-breast=鶏むね肉');
  });
});
