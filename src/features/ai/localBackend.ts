import { llm } from '@/lib/llm/client';
import { useEngine } from '@/features/engine/engineStore';
import { notifyAiChanged, registerLocalBackend } from './aiClient';

/** 端末内の AI（LiteRT-LM）を AI の入口に登録する */
export function setupLocalBackend() {
  registerLocalBackend({
    ready: () => useEngine.getState().status === 'ready',
    generate: (req, onEvent, onToolCall) => llm.generate(req, onEvent, onToolCall),
    cancel: () => llm.cancel(),
    label: () =>
      `端末内の AI（${useEngine.getState().model?.name.replace(/\.litertlm$/, '') ?? 'モデル'}）`,
  });
  // 読み込み・解放で「使えるか」が変わるので知らせる
  useEngine.subscribe((s, prev) => {
    if (s.status !== prev.status) notifyAiChanged();
  });
}
