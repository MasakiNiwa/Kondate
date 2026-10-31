import { ShoppingBasket } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { ComingSoon } from '@/components/ComingSoon';

export default function ShoppingPage() {
  return (
    <>
      <PageHeader title="買い物" />
      <PageBody>
        <ComingSoon icon={<ShoppingBasket />} title="買い物リスト">
          準備中です。次の更新で使えるようになります。
        </ComingSoon>
      </PageBody>
    </>
  );
}
