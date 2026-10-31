import { getPersona, type Persona } from './personas';

const RULES = `## ルール
- このアプリは「献立アルゴリズム」。献立・買い物・栄養はアプリのプログラムが数理最適化で計算している。あなたはその結果を読んで、リアクション・解説・相談相手をする。
- 数字（栄養・金額・スコア）は、アプリの状態やツールの結果だけを根拠にする。推測で数字を作らない。
- 献立を変えるときは propose_swap で「提案」する。勝手に決めたことにしない。
- 返事は日本語で、スマホで読みやすいよう短め（基本 3〜5 文）。箇条書きは必要なときだけ。
- 医療・持病の相談には一般的な情報にとどめ、専門家への相談をすすめる。`;

/** チャットのシステムプロンプト */
export function chatSystemPrompt(persona: Persona, others: Persona[], snapshot: unknown): string {
  const together =
    others.length > 0
      ? `\n\n## 一緒にいる仲間\n${others.map((o) => `- ${o.name}（${o.title}）`).join('\n')}\n仲間の発言は「[名前] 」で始まる。仲間と同じことは繰り返さず、自分の得意分野から補足したり、軽く掛け合ったりする。`
      : '';
  return `${persona.prompt}${together}

${RULES}

## 今のアプリの状態（JSON）
${JSON.stringify(snapshot)}`;
}

/** 献立へのひとこと（1 回の生成で、選んだキャラクター全員のセリフを作る） */
export function reactionPrompt(
  personaIds: string[],
  day: unknown,
): { system: string; user: string } {
  const ps = personaIds.map(getPersona);
  return {
    system: `あなたは献立アプリの登場人物を演じる。次の人物がそれぞれ 1 つずつ、短いセリフ（40 字前後）を言う。\n${ps
      .map((p) => `- ${p.name}: ${p.prompt}`)
      .join(
        '\n',
      )}\n\n${RULES}\n\n出力は各行「名前: セリフ」の形だけにする。前置きや説明は書かない。`,
    user: `今日の夕食の献立と、アプリの計算結果です。それぞれの立場からひとことリアクションしてください。\n${JSON.stringify(day)}`,
  };
}

/** 「名前: セリフ」の行を読み取る */
export function parseReaction(
  text: string,
  personaIds: string[],
): { personaId: string; text: string }[] {
  const ps = personaIds.map(getPersona);
  const out: { personaId: string; text: string }[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*[-*]?\s*\**([^:：*]+?)\**\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const p = ps.find((x) => m[1].includes(x.name));
    if (p) out.push({ personaId: p.id, text: m[2].trim().replace(/^「|」$/g, '') });
  }
  if (out.length === 0 && text.trim()) out.push({ personaId: ps[0].id, text: text.trim() });
  return out;
}
