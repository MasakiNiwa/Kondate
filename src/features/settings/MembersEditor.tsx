import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { createId } from '@/lib/utils/id';
import { ACTIVITY_LABELS, AGE_LABELS, SEX_LABELS, options } from './labels';
import { useSettings, type Member } from './settingsStore';

/** 一緒に食べる家族（人数と栄養の基準になる） */
export function MembersEditor() {
  const members = useSettings((s) => s.members);
  const update = useSettings((s) => s.update);
  const patch = (id: string, p: Partial<Member>) =>
    update({ members: members.map((m) => (m.id === id ? { ...m, ...p } : m)) });

  return (
    <div className="space-y-3 px-4 py-3.5 sm:px-5">
      <div>
        <div className="text-sm font-medium">食べる人（{members.length} 人）</div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          人数分の量で買い物を計算し、栄養は全員の基準の平均（1 人分）で評価します
        </p>
      </div>
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-2.5 sm:grid-cols-[1fr_auto_auto_auto_auto] dark:border-slate-800"
          >
            <input
              value={m.name}
              onChange={(e) => patch(m.id, { name: e.target.value })}
              aria-label="名前"
              className="col-span-2 h-10 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm sm:col-span-1 dark:border-slate-700 dark:bg-slate-900"
            />
            <Select
              aria-label="性別"
              value={m.sex}
              options={options(SEX_LABELS)}
              onChange={(sex) => patch(m.id, { sex })}
            />
            <Select
              aria-label="年齢"
              value={m.age}
              options={options(AGE_LABELS)}
              onChange={(age) => patch(m.id, { age })}
            />
            <Select
              aria-label="活動量"
              value={m.activity}
              options={options(ACTIVITY_LABELS)}
              onChange={(activity) => patch(m.id, { activity })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${m.name}を削除`}
              disabled={members.length <= 1}
              onClick={() => update({ members: members.filter((x) => x.id !== m.id) })}
              className="justify-self-end"
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        onClick={() =>
          update({
            members: [
              ...members,
              {
                id: createId(),
                name: `家族 ${members.length + 1}`,
                sex: 'm',
                age: '30-49',
                activity: 'normal',
              },
            ],
          })
        }
        disabled={members.length >= 8}
      >
        <Plus />
        追加
      </Button>
    </div>
  );
}
