/** CSS 変数の色を読む（ダークモードで切り替わる） */
export function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export interface ChartTheme {
  series: string[];
  text: string;
  muted: string;
  grid: string;
  surface: string;
}

export function readTheme(): ChartTheme {
  return {
    series: Array.from({ length: 8 }, (_, i) => cssColor(`--viz-${i + 1}`)),
    text: cssColor('--color-slate-700') || '#334155',
    muted: cssColor('--viz-axis'),
    grid: cssColor('--viz-grid'),
    surface: getComputedStyle(document.body).backgroundColor,
  };
}
