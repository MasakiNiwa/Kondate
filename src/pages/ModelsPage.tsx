import { Cpu, Power, Share2 } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatBytes, formatDuration } from '@/lib/utils/format';
import { resolveBackend, useEngine } from '@/features/engine/engineStore';
import { WebGpuNotice } from '@/features/engine/WebGpuNotice';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { LoadProgressCard } from '@/features/models/LoadProgressCard';
import { ModelDownload } from '@/features/models/ModelDownload';
import { ModelImport } from '@/features/models/ModelImport';
import { StoredModelList } from '@/features/models/StoredModelList';
import { BACKEND_LABELS, BACKEND_SETTING_LABELS, options } from '@/features/settings/labels';
import { useSettings } from '@/features/settings/settingsStore';

function CurrentModel() {
  const status = useEngine((s) => s.status);
  const model = useEngine((s) => s.model);
  const error = useEngine((s) => s.error);
  const fallbackLog = useEngine((s) => s.fallbackLog);
  const load = useEngine((s) => s.load);
  const backendHints = useSettings((s) => s.backendHints);
  const updateSettings = useSettings((s) => s.update);
  const storedModels = useEngine((s) => s.storedModels);
  const unload = useEngine((s) => s.unload);
  const backendSetting = useSettings((s) => s.backend);
  const webgpu = useEngine((s) => s.webgpu);
  const backend = resolveBackend(backendSetting, webgpu);
  const maxNumTokens = useSettings((s) => s.maxNumTokens);

  if (status === 'error') {
    return (
      <Card className="border-rose-200 p-4 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
        <p className="font-medium">読み込みに失敗しました</p>
        <p className="mt-1 break-all whitespace-pre-line">{error}</p>
      </Card>
    );
  }
  if (status !== 'ready' || !model) return null;

  const isStored = storedModels.some((m) => m.name === model.name);
  // 自動フォールバックで別のバックエンドになった場合は「設定変更」とはみなさない
  const needsReload =
    (fallbackLog.length === 0 && model.backend !== backend) || model.maxNumTokens !== maxNumTokens;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Cpu className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">使用中のモデル</div>
          <div className="truncate font-semibold" title={model.name}>
            {model.name}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatBytes(model.sizeBytes)}</span>
            <span>{BACKEND_LABELS[model.backend]}</span>
            <span>文脈長 {model.maxNumTokens}</span>
            <span>読み込み {formatDuration(model.loadTimeMs)}</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void unload()} title="モデルを解放">
          <Power />
          解放
        </Button>
      </div>
      {fallbackLog.length > 0 && (
        <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <summary className="cursor-pointer font-medium">
            {BACKEND_LABELS[model.backend]} で実行中（ほかの方法では読み込めませんでした）
          </summary>
          <ul className="mt-2 space-y-1.5">
            {fallbackLog.map((f, i) => (
              <li key={i} className="break-all">
                <span className="font-medium">{BACKEND_LABELS[f.backend]}:</span> {f.message}
              </li>
            ))}
          </ul>
        </details>
      )}
      {model.backend === 'cpu' && webgpu && backendHints[model.name] && isStored && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <span>前回 GPU で読み込めなかったため、このモデルは CPU で読み込んでいます</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const rest = { ...backendHints };
              delete rest[model.name];
              updateSettings({ backendHints: rest });
              void load({ kind: 'stored', name: model.name }, 'gpu-artisan');
            }}
          >
            GPU で再試行
          </Button>
        </div>
      )}
      {needsReload && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          エンジン設定が変更されています。反映するにはモデルを読み込み直してください。
        </p>
      )}
    </Card>
  );
}

function EngineSettings() {
  const s = useSettings();
  return (
    <Card className="divide-y divide-slate-100 dark:divide-slate-800">
      <Field label="計算に使う装置" hint="変えたら、モデルを読み込み直すと反映されます">
        <Select
          value={s.backend}
          options={options(BACKEND_SETTING_LABELS)}
          onChange={(backend) => s.update({ backend })}
        />
      </Field>
      <Field label="文脈の長さ（トークン）" hint="長いほど多くの会話を覚えますが、メモリを使います">
        <Select
          value={String(s.maxNumTokens)}
          options={[2048, 4096, 8192].map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => s.update({ maxNumTokens: Number(v) })}
        />
      </Field>
      <Field label="起動時に前回のモデルを読み込む">
        <Switch
          checked={s.autoLoadLastModel}
          onChange={(autoLoadLastModel) => s.update({ autoLoadLastModel })}
          label="起動時に前回のモデルを読み込む"
        />
      </Field>
    </Card>
  );
}

export default function ModelsPage() {
  const loading = useEngine((s) => s.status === 'loading');
  const provider = useSettings((s) => s.aiProvider);
  const update = useSettings((s) => s.update);
  const ready = useEngine((s) => s.status === 'ready');
  return (
    <>
      <PageHeader title="端末内の AI" />
      <PageBody>
        <p className="px-1 text-sm text-slate-600 dark:text-slate-400">
          ブラウザの中で動く AI（LiteRT-LM）です。会話の内容は端末の外に出ません。モデル（Gemma 4 の
          Web 版など、約 2〜3 GB）を一度ダウンロードすると、オフラインでも使えます。AI
          がなくても、献立の計算はすべて使えます。
        </p>
        {ready && provider !== 'local' && (
          <Card className="flex items-center gap-3 p-4 text-sm">
            <span className="flex-1">
              モデルを読み込みました。いつもの AI を「端末内の AI」にしますか？
            </span>
            <Button size="sm" variant="primary" onClick={() => update({ aiProvider: 'local' })}>
              端末内の AI を使う
            </Button>
          </Card>
        )}
        <WebGpuNotice />
        <CurrentModel />
        <LoadProgressCard />
        <StoredModelList />
        {!loading && <ModelImport />}
        <ModelDownload />
        <EngineSettings />
        <Card className="flex gap-3 p-4 text-sm text-slate-600 dark:text-slate-400">
          <Share2 className="mt-0.5 size-5 shrink-0 text-accent-600" />
          <div className="space-y-1">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              モデルは他のサイトと共有されます
            </p>
            <p>
              保存したモデルは、同じ github.io（masakiniwa.github.io）の他のサイト（LLLM Study・Try
              Local
              など）と共通の保存領域に置かれ、どのサイトからでも使えます。他のサイトで保存済みのモデルも上の一覧に表示されます。⤓
              ボタンで端末のファイルとして書き出す（バックアップ）こともでき、書き出したファイルは「ファイルを選択」で戻せます。
            </p>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
