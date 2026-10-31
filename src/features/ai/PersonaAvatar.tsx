import { cn } from '@/lib/utils/cn';
import { getPersona } from './personas';

export function PersonaAvatar({ id, className }: { id: string; className?: string }) {
  const p = getPersona(id);
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        p.color,
        className,
      )}
    >
      {p.avatar}
    </span>
  );
}
