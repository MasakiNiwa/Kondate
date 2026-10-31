import { House } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { ComingSoon } from '@/components/ComingSoon';

export default function HomePage() {
  return (
    <>
      <PageHeader title="ホーム" />
      <PageBody>
        <ComingSoon icon={<House />} title="献立アルゴリズム">
          準備中です。次の更新で使えるようになります。
        </ComingSoon>
      </PageBody>
    </>
  );
}
