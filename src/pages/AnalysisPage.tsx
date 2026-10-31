import { ChartPie } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { ComingSoon } from '@/components/ComingSoon';

export default function AnalysisPage() {
  return (
    <>
      <PageHeader title="分析" />
      <PageBody>
        <ComingSoon icon={<ChartPie />} title="栄養と献立の分析">
          準備中です。次の更新で使えるようになります。
        </ComingSoon>
      </PageBody>
    </>
  );
}
