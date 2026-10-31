import { describe, expect, it } from 'vitest';
import { parseReaction } from './prompt';

describe('parseReaction', () => {
  it('reads "name: line" pairs for each persona', () => {
    const r = parseReaction('源さん: いい献立だな！\nみどり先生：野菜もしっかりとれていますね。', [
      'chef',
      'dietitian',
    ]);
    expect(r).toEqual([
      { personaId: 'chef', text: 'いい献立だな！' },
      { personaId: 'dietitian', text: '野菜もしっかりとれていますね。' },
    ]);
  });
  it('falls back to the first persona', () => {
    expect(parseReaction('おいしそう！', ['cheer'])[0].personaId).toBe('cheer');
  });
});
