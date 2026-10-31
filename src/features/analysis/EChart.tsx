import { useEffect, useRef } from 'react';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import { useIsDark } from '@/app/useIsDark';
import { cn } from '@/lib/utils/cn';
import { readTheme, type ChartTheme } from './chartTheme';

export type { ChartTheme };

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  LegendComponent,
  CanvasRenderer,
]);

/**
 * ECharts の薄いラッパー。option は今のテーマの色を受け取って作る。
 * サイズの変化に追従し、クリックしたデータの番号を返す（ドリルダウン用）。
 */
export function EChart({
  option,
  height = 260,
  onClick,
  className,
  ariaLabel,
}: {
  option: (t: ChartTheme) => EChartsCoreOption;
  height?: number;
  onClick?: (dataIndex: number, seriesIndex: number) => void;
  className?: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const dark = useIsDark();
  const clickRef = useRef(onClick);
  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chart.current = c;
    c.on('click', (p) => clickRef.current?.(p.dataIndex, p.seriesIndex ?? 0));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    // テーマの CSS 変数が反映されてから読む
    const id = requestAnimationFrame(() => {
      const t = readTheme();
      chart.current?.setOption(
        {
          textStyle: { color: t.text, fontFamily: 'inherit' },
          tooltip: {
            backgroundColor: dark ? '#262626' : '#ffffff',
            borderColor: t.grid,
            textStyle: { color: dark ? '#e5e5e5' : '#1e293b', fontSize: 12 },
          },
          ...option(t),
        },
        true,
      );
    });
    return () => cancelAnimationFrame(id);
  }, [option, dark]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={cn('w-full', className)}
      style={{ height }}
    />
  );
}
