/**
 * 「応答ごとの AI」: 応答の種類ごとに、使う AI（接続先とモデル）を変える。
 * たとえば、回数の多い「ひとこと」は安いモデルや無料のモデル、解説は賢いモデル、のように分けられる。
 * 決めていない種類は、いつもの AI（「AI の接続先」）で答える。
 */
import { SlidersHorizontal } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { CLOUD_PROVIDERS, CLOUD_PROVIDER_IDS } from '@/lib/cloud/providers';
import type { AiTask } from '@/features/ai/aiTask';
import { useSettings, type AiProvider, type TaskRoute } from '@/features/settings/settingsStore';
import { useCloud } from './cloudStore';
import { ModelPicker } from './ModelPicker';

const TASKS: { task: AiTask; label: string; hint: string }[] = [
  {
    task: 'reaction',
    label: 'ひとこと',
    hint: '献立へのリアクション。回数が多いので、安いモデル・無料のモデルがおすすめ',
  },
  {
    task: 'chat',
    label: 'チャット',
    hint: 'AI に相談の会話（ツールで献立を調べたり、差し替えを提案したり）',
  },
  { task: 'generate', label: 'データづくり', hint: '料理のデータを作るなど、長めの生成' },
];

const DEFAULT = 'default';

function TaskRow({ task, label, hint }: (typeof TASKS)[number]) {
  const route = useSettings((s) => s.taskModels[task]);
  const taskModels = useSettings((s) => s.taskModels);
  const cloudModels = useSettings((s) => s.cloudModels);
  const consents = useSettings((s) => s.cloudConsents);
  const update = useSettings((s) => s.update);
  const stored = useCloud((s) => s.stored);
  const unlocked = useCloud((s) => s.unlocked);

  const available = CLOUD_PROVIDER_IDS.filter((p) => (stored[p] || unlocked[p]) && consents[p]);
  const options: { value: string; label: string }[] = [
    { value: DEFAULT, label: 'いつもの AI' },
    ...available.map((p) => ({ value: p, label: CLOUD_PROVIDERS[p].label })),
  ];
  // 選んであった接続先のキーを消したときも、選択肢に残して分かるようにする
  if (route && !options.some((o) => o.value === route.provider))
    options.push({
      value: route.provider,
      label: `${route.provider === 'local' ? '端末内の AI' : CLOUD_PROVIDERS[route.provider].label}（キーがありません）`,
    });

  const set = (next: TaskRoute | null) => {
    const copy = { ...taskModels };
    if (next) copy[task] = next;
    else delete copy[task];
    update({ taskModels: copy });
  };
  const chooseProvider = (v: string) => {
    if (v === DEFAULT) return set(null);
    const provider = v as Exclude<AiProvider, 'none'>;
    set(provider === 'local' ? { provider } : { provider, model: cloudModels[provider] });
  };
  const cloud = route && route.provider !== 'local' ? route.provider : null;

  return (
    <li className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-40">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
        </div>
        <Select
          value={route?.provider ?? DEFAULT}
          onChange={chooseProvider}
          options={options}
          aria-label={`${label}に使う AI`}
          className="w-40"
        />
      </div>
      {cloud &&
        (unlocked[cloud] ? (
          <ModelPicker
            provider={cloud}
            value={route?.model ?? cloudModels[cloud] ?? ''}
            onChange={(model) => set({ provider: cloud, model })}
          />
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {CLOUD_PROVIDERS[cloud].label} のキーがロック中です。解除するまでは、いつもの AI
            で答えます。
          </p>
        ))}
    </li>
  );
}

export function TaskModels() {
  const any = useCloud((s) => CLOUD_PROVIDER_IDS.some((p) => s.stored[p] || s.unlocked[p]));
  if (!any) return null;
  return (
    <div className="space-y-3 px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          <SlidersHorizontal className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold">応答ごとの AI（任意）</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            応答の種類ごとに、使う AI
            とモデルを変えられます。たとえば「ひとこと」は安いモデルや無料のモデル、解説は賢いモデルにすると、料金を抑えながら使えます。決めていない種類は、いつもの
            AI で答えます。
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {TASKS.map((t) => (
          <TaskRow key={t.task} {...t} />
        ))}
      </ul>
    </div>
  );
}
