import { ROLE_LABELS } from '@/lib/food/catalog';
import type { DishRole } from '@/lib/food/types';
import { cn } from '@/lib/utils/cn';

const ROLE_CLASS: Record<DishRole, string> = {
  main: 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200',
  side: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  soup: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
};

export function RoleBadge({ role, className }: { role: DishRole; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[0.68rem] font-medium',
        ROLE_CLASS[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
