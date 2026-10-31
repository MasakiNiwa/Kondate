import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils/cn';
import { HELP_ITEM } from './navItems';
import { ThemeToggle } from './ThemeToggle';

interface PageHeaderProps {
  title: string;
  /** タイトル右側（見出しの横）に置く要素 */
  meta?: ReactNode;
  /** 右端（テーマ・ヘルプの左）のアクション */
  actions?: ReactNode;
}

/** ヘッダー右端のヘルプ */
function HelpLink() {
  const [location] = useLocation();
  const active = location === HELP_ITEM.to;
  return (
    <Link
      href={HELP_ITEM.to}
      aria-label={HELP_ITEM.label}
      title={HELP_ITEM.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800',
        active && 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200',
      )}
    >
      <HELP_ITEM.icon className="size-5" />
    </Link>
  );
}

/** アプリのヘッダー（全ページ共通: 右端にダークモード切り替えとヘルプ） */
export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className="pt-safe sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <img src="./favicon.svg" alt="" className="size-7 md:hidden" />
        <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
        {meta && <div className="min-w-0">{meta}</div>}
        <div className="ml-auto flex items-center gap-0.5">
          {actions}
          <ThemeToggle />
          <HelpLink />
        </div>
      </div>
    </header>
  );
}

/** スクロール可能なページ本体 */
export function PageBody({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          'mx-auto w-full space-y-4 px-3 py-4 sm:px-4 sm:py-6',
          wide ? 'max-w-5xl' : 'max-w-3xl',
        )}
      >
        {children}
      </div>
    </div>
  );
}
