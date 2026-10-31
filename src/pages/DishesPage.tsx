import { UtensilsCrossed } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { ComingSoon } from '@/components/ComingSoon';

export default function DishesPage() {
  return (
    <>
      <PageHeader title="料理" />
      <PageBody>
        <ComingSoon icon={<UtensilsCrossed />} title="料理と食材">
          準備中です。次の更新で使えるようになります。
        </ComingSoon>
      </PageBody>
    </>
  );
}
