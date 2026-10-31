import { useState } from 'react';
import { ClipboardCopy, FileJson, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { RoleBadge } from '@/features/dishes/RoleBadge';
import { ai, useAiReady } from '@/features/ai/aiClient';
import { useAiBusy } from '@/features/ai/aiTask';
import { dishNutrition } from '@/lib/food/catalog';
import { buildDishPrompt, parseCustomDishes, type ParseResult } from '@/lib/food/customDish';
import { copyText } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/format';
import { useCustomDishes } from './customDishStore';

const TEXTAREA =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

/**
 * 料理を追加する。アプリがプロンプトを作り、外部 AI（またはアプリの AI）に料理データ（JSON）を作ってもらって取り込む。
 * 食材はアプリの食材に限り、栄養はアプリが食材から計算する（AI に数字を作らせない）。
 */
export function AddDishesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [request, setRequest] = useState('');
  const [json, setJson] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const ready = useAiReady('generate');
  const add = useCustomDishes((s) => s.add);

  const copyPrompt = async () => {
    const ok = await copyText(buildDishPrompt(request));
    if (ok)
      toast.success('プロンプトをコピーしました。ChatGPT・Gemini・Claude などに貼り付けてください');
    else toast.error('コピーできませんでした');
  };

  const generate = async () => {
    if (useAiBusy.getState().task) return;
    setGenerating(true);
    useAiBusy.setState({ task: 'generate' });
    let text = '';
    try {
      await ai.generate(
        {
          settings: {
            systemPrompt: '指示どおりの JSON だけを出力する。',
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4000,
            enableThinking: false,
          },
          history: [],
          message: { id: 'gen', role: 'user', text: buildDishPrompt(request) },
          assistantId: 'gen-a',
          mode: 'oneshot',
        },
        (e) => {
          if (e.type === 'delta' && e.channel !== 'thought') text += e.text;
        },
        undefined,
        'generate',
      );
      setJson(text);
      setResult(parseCustomDishes(text));
    } catch (e) {
      toast.error(`作れませんでした: ${errorMessage(e)}`);
    } finally {
      setGenerating(false);
      useAiBusy.setState({ task: null });
    }
  };

  const save = async () => {
    if (!result?.dishes.length) return;
    await add(result.dishes);
    toast.success(`${result.dishes.length} 品を追加しました。次の献立の計算から候補に入ります`);
    setJson('');
    setResult(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="料理を追加"
      footer={
        <Button variant="primary" onClick={() => void save()} disabled={!result?.dishes.length}>
          {result?.dishes.length ? `${result.dishes.length} 品を追加` : '追加'}
        </Button>
      }
    >
      <div className="space-y-4 text-sm">
        <section className="space-y-2">
          <h3 className="font-semibold">1. どんな料理がほしいか</h3>
          <textarea
            rows={2}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="例: 鶏むね肉を使った 15 分でできる主菜を 3 品、冬の汁物を 2 品"
            className={TEXTAREA}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void copyPrompt()}>
              <ClipboardCopy />
              外部 AI 用のプロンプトをコピー
            </Button>
            {ready && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => void generate()}
                disabled={generating}
              >
                {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                アプリの AI で作る
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            プロンプトにはアプリの食材の一覧と出力の形が入っています。ChatGPT・Gemini・Claude
            などに貼り付けると、料理データ（JSON）を作ってくれます。
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">2. できた JSON を貼り付け</h3>
          <textarea
            rows={5}
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setResult(null);
            }}
            placeholder='{"dishes":[ ... ]}'
            className={`${TEXTAREA} font-mono text-xs`}
          />
          <Button
            size="sm"
            onClick={() => setResult(parseCustomDishes(json))}
            disabled={!json.trim()}
          >
            <FileJson />
            読み込んで確認
          </Button>
        </section>
        {result && (
          <section className="space-y-2">
            <h3 className="font-semibold">3. 確認</h3>
            {result.errors.map((e) => (
              <p key={e} className="text-xs text-amber-700 dark:text-amber-400">
                {e}
              </p>
            ))}
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {result.dishes.map((d) => {
                const n = dishNutrition(d);
                return (
                  <li key={d.id} className="flex items-center gap-2 px-3 py-2">
                    <RoleBadge role={d.role} />
                    <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
                    <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                      {d.minutes}分・{Math.round(n.energy)}kcal・塩分 {n.salt.toFixed(1)}g
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              栄養はアプリが食材から計算しています。
            </p>
          </section>
        )}
      </div>
    </Dialog>
  );
}
