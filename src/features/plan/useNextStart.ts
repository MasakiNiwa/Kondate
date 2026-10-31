import { addDays, parseISO } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import { toKey, todayKey } from '@/lib/utils/date';

/** 次に献立を作る開始日（今日以降で、献立が入っている最後の日の翌日。なければ今日） */
export function useNextStart(): string {
  return (
    useLiveQuery(async () => {
      const today = todayKey();
      const last = await db.plans.where('date').aboveOrEqual(today).last();
      return last ? toKey(addDays(parseISO(last.date), 1)) : today;
    }, []) ?? todayKey()
  );
}
