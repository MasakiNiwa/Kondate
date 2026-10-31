import { useEffect } from 'react';
import { setupLocalBackend } from '@/features/ai/localBackend';
import { useCustomDishes } from '@/features/custom/customDishStore';
import { useEngine } from '@/features/engine/engineStore';
import { useSettings } from '@/features/settings/settingsStore';
import { subscribeSharedModels } from '@/lib/llm/modelStorage';

let setup = false;

/** 起動時の処理（端末内の AI の準備・前回のモデルの読み込み・共通モデル保存領域の監視） */
export function useStartup() {
  useEffect(() => {
    if (!setup) {
      setup = true;
      setupLocalBackend();
    }
    let cancelled = false;
    void useCustomDishes.getState().load();
    void useEngine.getState().detectWebGpu();
    (async () => {
      const { autoLoadLastModel, lastModelName } = useSettings.getState();
      await useEngine.getState().refreshStoredModels();
      if (cancelled) return;
      const stored = useEngine.getState().storedModels;
      if (autoLoadLastModel && lastModelName && stored.some((m) => m.name === lastModelName)) {
        void useEngine.getState().load({ kind: 'stored', name: lastModelName });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 同じ github.io の他のサイト・タブでモデルが保存・削除されたら一覧を更新する
  useEffect(() => {
    const refresh = () => void useEngine.getState().refreshStoredModels();
    const unsubscribe = subscribeSharedModels(refresh);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
