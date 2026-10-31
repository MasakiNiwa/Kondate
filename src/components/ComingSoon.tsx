import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

/** まだ作っていない機能の案内 */
export function ComingSoon({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 [&_svg]:size-7">
        {icon}
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{children}</p>
    </Card>
  );
}
