import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeftRight,
  Check,
  Eraser,
  Loader2,
  SendHorizontal,
  Settings2,
  Square,
  Wrench,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { routeLabel, useAiReady } from '@/features/ai/aiClient';
import { useAiBusy } from '@/features/ai/aiTask';
import { useChat, type ChatMessage } from '@/features/ai/chatStore';
import { PersonaAvatar } from '@/features/ai/PersonaAvatar';
import { getPersona } from '@/features/ai/personas';
import { swapDish } from '@/features/plan/repository';
import { useSettings } from '@/features/settings/settingsStore';
import { ROLE_LABELS, getDish } from '@/lib/food/catalog';
import { cn } from '@/lib/utils/cn';

const TOOL_LABELS: Record<string, string> = {
  get_menu: '献立を確認',
  get_day_nutrition: '栄養を確認',
  search_dishes: '料理を検索',
  suggest_swaps: '差し替え候補を計算',
  propose_swap: '差し替えを提案',
  get_shopping_list: '買い物リストを確認',
  get_insights: '気づきを確認',
};

const SUGGESTIONS = [
  '今日の献立のポイントを教えて',
  '今週の献立で足りない栄養は？',
  '買い物をラクにするコツは？',
  '疲れて作る気が出ない…',
];

function Message({ m }: { m: ChatMessage }) {
  const markApplied = useChat((s) => s.markApplied);
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-accent-600 px-3.5 py-2 text-sm whitespace-pre-wrap text-white">
          {m.text}
        </div>
      </div>
    );
  }
  const p = getPersona(m.personaId ?? '');
  return (
    <div className="flex items-start gap-2">
      <PersonaAvatar id={p.id} />
      <div className="min-w-0 max-w-[88%] space-y-1.5">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {p.name}
          <span className="ml-1 text-slate-400">・{p.title}</span>
        </div>
        {m.tools && m.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {[...new Set(m.tools)].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.68rem] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                <Wrench className="size-3" />
                {TOOL_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        )}
        <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 shadow-sm dark:bg-slate-900">
          {m.text ? (
            <div className={cn('prose-chat', m.streaming && 'streaming-caret')}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
            </div>
          ) : m.streaming ? (
            <Loader2 className="size-4 animate-spin text-slate-400" />
          ) : null}
          {m.error && <p className="text-sm text-rose-600 dark:text-rose-400">{m.error}</p>}
        </div>
        {m.proposals?.map((pr, i) => {
          const dish = getDish(pr.dishId);
          return (
            <Card key={i} className="flex items-center gap-2 p-2.5 text-sm">
              <ArrowLeftRight className="size-4 shrink-0 text-accent-600" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {format(parseISO(pr.date), 'M/d')}の{ROLE_LABELS[dish?.role ?? 'main']}を「
                  {dish?.name}」に
                </div>
                {pr.reason && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">{pr.reason}</div>
                )}
              </div>
              <Button
                size="sm"
                variant={pr.applied ? 'secondary' : 'primary'}
                disabled={pr.applied}
                onClick={() =>
                  void swapDish(pr.date, pr.index, pr.dishId).then(() => {
                    markApplied(m.id, i);
                    toast.success(`${dish?.name}に差し替えました`);
                  })
                }
              >
                {pr.applied ? <Check /> : null}
                {pr.applied ? '差し替え済み' : '差し替える'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const messages = useChat((s) => s.messages);
  const send = useChat((s) => s.send);
  const stop = useChat((s) => s.stop);
  const clear = useChat((s) => s.clear);
  const busy = useAiBusy((s) => s.task === 'chat');
  const ready = useAiReady('chat');
  const personas = useSettings((s) => s.personas);
  const [text, setText] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [, navigate] = useLocation();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const submit = (t: string) => {
    const v = t.trim();
    if (!v || busy) return;
    setText('');
    void send(v);
  };

  return (
    <>
      <PageHeader
        title="AI に相談"
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label="会話を消す"
            title="会話を消す"
            onClick={() => setConfirmClear(true)}
            disabled={messages.length === 0 || busy}
          >
            <Eraser />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
          {!ready && (
            <Card className="space-y-3 p-4 text-sm">
              <p>
                AI
                に相談するには、設定の「AI」で接続先（Gemini・OpenAI・Claude・OpenRouter）を選んで
                API キーを登録するか、キーのロックを解除してください。
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                AI がなくても、献立の計算・買い物・分析はすべて使えます。
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/settings')}>
                <Settings2 />
                設定を開く
              </Button>
            </Card>
          )}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex -space-x-2">
                {personas.slice(0, 2).map((id) => (
                  <PersonaAvatar
                    key={id}
                    id={id}
                    className="size-12 text-lg ring-2 ring-slate-50 dark:ring-slate-950"
                  />
                ))}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {personas
                  .slice(0, 2)
                  .map((id) => getPersona(id).name)
                  .join('と')}
                が、献立の計算結果をもとに相談にのります。
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="secondary"
                    onClick={() => submit(s)}
                    disabled={!ready || busy}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
          <div ref={bottom} />
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/90"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(text);
              }
            }}
            rows={1}
            placeholder={ready ? 'メッセージ（Shift+Enter で改行）' : 'AI の設定が必要です'}
            disabled={!ready}
            aria-label="メッセージ"
            className="max-h-36 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900"
          />
          {busy ? (
            <Button size="icon" onClick={stop} aria-label="止める">
              <Square />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="icon"
              aria-label="送る"
              disabled={!ready || !text.trim()}
            >
              <SendHorizontal />
            </Button>
          )}
        </div>
        {ready && (
          <p className="mx-auto mt-1 max-w-3xl text-[0.65rem] text-slate-400">
            接続先: {routeLabel('chat')}
          </p>
        )}
      </form>
      <ConfirmDialog
        open={confirmClear}
        title="会話を消しますか？"
        confirmLabel="消す"
        danger
        onConfirm={() => clear()}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
