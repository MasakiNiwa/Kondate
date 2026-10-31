/**
 * AI への入口。設定の接続先（いつもの AI・応答ごとの AI）に応じて、クラウド AI か端末内の AI に振り分ける。
 * 呼び出し側は接続先を区別しない。端末内の AI は registerLocalBackend で登録する（Phase 4）。
 */
import { useSyncExternalStore } from 'react';
import { CLOUD_PROVIDERS } from '@/lib/cloud/providers';
import { getUnlockedKey, subscribeVault, type CloudProviderId } from '@/lib/cloud/keyVault';
import type {
  GenerateEvent,
  GenerateRequest,
  GenerateResult,
  JsonValue,
  ToolCallInfo,
} from '@/lib/llm/types';
import { getSettings, useSettings, type AiProvider } from '@/features/settings/settingsStore';
import { rememberRecentModel } from '@/features/cloud/cloudStore';
import type { AiTask } from './aiTask';

export interface LocalBackend {
  ready: () => boolean;
  generate: (
    req: GenerateRequest,
    onEvent: (e: GenerateEvent) => void,
    onToolCall?: (call: ToolCallInfo) => Promise<JsonValue>,
  ) => Promise<GenerateResult>;
  cancel: () => void;
  /** 端末内の AI の名前（画面用） */
  label: () => string;
}

let local: LocalBackend | null = null;
const listeners = new Set<() => void>();

export function registerLocalBackend(b: LocalBackend) {
  local = b;
  notifyAiChanged();
}

/** 端末内の AI の状態が変わったとき（読み込み完了など）に呼ぶ */
export function notifyAiChanged() {
  listeners.forEach((l) => l());
}

type Route = { kind: 'local' } | { kind: 'cloud'; provider: CloudProviderId; model: string };

function resolve(provider: AiProvider, model?: string): Route | null {
  if (provider === 'none') return null;
  if (provider === 'local') return local?.ready() ? { kind: 'local' } : null;
  const m = model || getSettings().cloudModels[provider];
  return m && getUnlockedKey(provider) ? { kind: 'cloud', provider, model: m } : null;
}

/** その応答の種類で使う AI（決めていない・使えないときは、いつもの AI） */
export function routeFor(task?: AiTask): Route | null {
  const s = getSettings();
  const t = task ? s.taskModels[task] : undefined;
  return (t && resolve(t.provider, t.model)) || resolve(s.aiProvider);
}

/** 今の接続先の名前（画面用） */
export function routeLabel(task?: AiTask): string | null {
  const r = routeFor(task);
  if (!r) return null;
  if (r.kind === 'local') return local?.label() ?? '端末内の AI';
  return `${CLOUD_PROVIDERS[r.provider].label}（${CLOUD_PROVIDERS[r.provider].shortModel(r.model)}）`;
}

/** 画面用: AI を使えるか（設定・キーの解除・端末内のモデルの変化に追従する） */
export function useAiReady(task?: AiTask): boolean {
  // 設定が変わったら読み直す（値そのものは routeFor が読む）
  useSettings((s) => s.aiProvider);
  useSettings((s) => s.cloudModels);
  useSettings((s) => s.taskModels);
  const version = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const off = subscribeVault(cb);
      return () => {
        listeners.delete(cb);
        off();
      };
    },
    () => (routeFor(task) ? 1 : 0),
  );
  return version === 1;
}

let current: AbortController | null = null;

export const ai = {
  async generate(
    req: GenerateRequest,
    onEvent: (e: GenerateEvent) => void,
    onToolCall?: (call: ToolCallInfo) => Promise<JsonValue>,
    task?: AiTask,
  ): Promise<GenerateResult> {
    const route = routeFor(task);
    if (!route) {
      throw new Error(
        'AI が使えません。設定の「AI」で接続先を選び、API キーを登録（またはロックを解除）してください。',
      );
    }
    if (route.kind === 'local') return local!.generate(req, onEvent, onToolCall);
    const info = CLOUD_PROVIDERS[route.provider];
    const ctrl = new AbortController();
    current = ctrl;
    try {
      const result = await info.generate(
        req,
        { apiKey: getUnlockedKey(route.provider)!, model: route.model, signal: ctrl.signal },
        onEvent,
        onToolCall,
      );
      if (result.status === 'done') rememberRecentModel(route.provider, route.model);
      return result;
    } finally {
      if (current === ctrl) current = null;
    }
  },
  cancel() {
    current?.abort();
    local?.cancel();
  },
};
