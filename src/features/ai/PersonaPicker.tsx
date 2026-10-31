import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/features/settings/settingsStore';
import { cn } from '@/lib/utils/cn';
import { PERSONAS } from './personas';
import { PersonaAvatar } from './PersonaAvatar';

/** AI のキャラクター（1〜2 人）を選ぶ */
export function PersonaPicker() {
  const selected = useSettings((s) => s.personas);
  const update = useSettings((s) => s.update);
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length === 1) return toast.info('1 人は選んでください');
      update({ personas: selected.filter((x) => x !== id) });
    } else {
      update({ personas: [...selected, id].slice(-2) });
    }
  };
  return (
    <div className="space-y-2 px-4 py-3.5 sm:px-5">
      <div>
        <div className="text-sm font-medium">AI のキャラクター（2 人まで）</div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          2 人選ぶと、それぞれの得意分野から掛け合いで答えます。
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {PERSONAS.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                on
                  ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                  : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50',
              )}
            >
              <PersonaAvatar id={p.id} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.name}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{p.title}</span>
              </span>
              {on && <Check className="size-4 text-accent-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
