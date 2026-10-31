import { Loader2, MessageCircleHeart, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getPersona } from './personas';
import { PersonaAvatar } from './PersonaAvatar';
import { useAiReady } from './aiClient';
import { useReactions } from './reactionStore';

/** 献立へのキャラクターのひとこと（AI が使えるときだけ表示） */
export function ReactionCard({ date }: { date: string }) {
  const ready = useAiReady('reaction');
  const lines = useReactions((s) => s.byDate[date]);
  const loading = useReactions((s) => s.loading === date);
  const error = useReactions((s) => s.error);
  const react = useReactions((s) => s.react);
  if (!ready) return null;
  if (!lines) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void react(date)} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <MessageCircleHeart />}
          AI のひとこと
        </Button>
        {error && !loading && (
          <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex items-start gap-2">
          <PersonaAvatar id={l.personaId} className="size-7 text-xs" />
          <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">
            <span className="mr-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {getPersona(l.personaId).name}
            </span>
            {l.text}
          </div>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => void react(date)} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <RotateCcw />}
        もう一度
      </Button>
    </div>
  );
}
