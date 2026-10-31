import { CalendarDays } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { ComingSoon } from '@/components/ComingSoon';

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="カレンダー" />
      <PageBody>
        <ComingSoon icon={<CalendarDays />} title="献立カレンダー">
          準備中です。次の更新で使えるようになります。
        </ComingSoon>
      </PageBody>
    </>
  );
}
