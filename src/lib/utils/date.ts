import { format } from 'date-fns';

export function toKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function todayKey(): string {
  return toKey(new Date());
}
