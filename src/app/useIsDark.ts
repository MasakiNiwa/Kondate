import { useSyncExternalStore } from 'react';
import { useSettings } from '@/features/settings/settingsStore';

/** 今ダークモードで表示しているか（「端末に合わせる」のときは端末の設定） */
export function useIsDark(): boolean {
  const theme = useSettings((s) => s.theme);
  const systemDark = useSyncExternalStore(
    (onChange) => {
      const media = matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
  return theme === 'dark' || (theme === 'system' && systemDark);
}
