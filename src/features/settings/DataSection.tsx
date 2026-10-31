import { useState } from 'react';
import { Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { clearAllData } from '@/lib/db/db';
import { STORAGE_PREFIX } from '@/lib/constants';
import { errorMessage } from '@/lib/utils/format';
import { useSettings } from './settingsStore';

/** データの管理（クリア・初期化） */
export function DataSection() {
  const [confirm, setConfirm] = useState<'data' | 'all' | null>(null);
  const resetSettings = useSettings((s) => s.reset);

  const run = async () => {
    try {
      await clearAllData();
      if (confirm === 'all') {
        resetSettings();
        Object.keys(localStorage)
          .filter((k) => k.startsWith(`${STORAGE_PREFIX}:`) && k !== `${STORAGE_PREFIX}:settings`)
          .forEach((k) => localStorage.removeItem(k));
        toast.success('すべてのデータと設定を初期化しました');
      } else {
        toast.success('献立・買い物リスト・在庫をクリアしました');
      }
    } catch (e) {
      toast.error(`消せませんでした: ${errorMessage(e)}`);
    }
  };

  return (
    <Section
      title="データ"
      description="この端末に保存しているデータ"
      icon={<Database />}
      collapsible
    >
      <Field
        label="献立・買い物をクリア"
        hint="献立カレンダー・買い物リスト・在庫を消します。設定と好みは残ります"
      >
        <Button variant="secondary" onClick={() => setConfirm('data')}>
          <Trash2 />
          クリア
        </Button>
      </Field>
      <Field label="すべて初期化" hint="データに加えて、設定・好き嫌いも最初の状態に戻します">
        <Button variant="danger" onClick={() => setConfirm('all')}>
          初期化
        </Button>
      </Field>
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'all' ? 'すべて初期化しますか？' : '献立と買い物をクリアしますか？'}
        description="この操作は取り消せません。"
        confirmLabel={confirm === 'all' ? '初期化する' : 'クリアする'}
        danger
        onConfirm={() => void run()}
        onClose={() => setConfirm(null)}
      />
    </Section>
  );
}
