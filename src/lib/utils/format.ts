export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

const yenFmt = new Intl.NumberFormat('ja-JP');

/** 金額（円） */
export function formatYen(v: number): string {
  return `${yenFmt.format(Math.round(v))}円`;
}

/** 数値を桁に合わせて丸める（栄養素の表示用） */
export function formatAmount(v: number): string {
  if (!Number.isFinite(v)) return '-';
  const a = Math.abs(v);
  if (a >= 100) return yenFmt.format(Math.round(v));
  if (a >= 10) return v.toFixed(0);
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

/** 割合（0.83 → 83%） */
export function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}
