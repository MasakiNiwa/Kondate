import type { ReactNode } from 'react';
import {
  BookOpen,
  Calculator,
  Database,
  ExternalLink,
  Info,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card, Section } from '@/components/ui/Card';
import { LicenseList } from '@/features/help/LicenseList';
import { HELP_TOPICS } from '@/features/help/helpTopics';
import { DATA_CREDITS } from '@/features/help/credits';
import { APP_TAGLINE, APP_TITLE, APP_VERSION, BUILD_DATE, REPO_URL } from '@/lib/constants';

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-accent-700 underline-offset-2 hover:underline dark:text-accent-300"
    >
      {children}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="space-y-2 px-4 py-3.5 text-sm leading-relaxed sm:px-5">{children}</div>;
}

const TOPIC_ICONS = { about: Info, usage: BookOpen, algorithm: Calculator, privacy: ShieldCheck };

export default function HelpPage() {
  return (
    <>
      <PageHeader title="ヘルプ" />
      <PageBody>
        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <img src="./favicon.svg" alt="" className="size-12" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{APP_TITLE}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{APP_TAGLINE}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">バージョン</dt>
            <dd className="font-mono">v{APP_VERSION}</dd>
            <dt className="text-slate-500 dark:text-slate-400">ビルド日</dt>
            <dd className="font-mono">{BUILD_DATE}</dd>
            <dt className="text-slate-500 dark:text-slate-400">ライセンス</dt>
            <dd>MIT License</dd>
            <dt className="text-slate-500 dark:text-slate-400">ソースコード</dt>
            <dd className="min-w-0 truncate">
              <ExtLink href={REPO_URL}>GitHub リポジトリ</ExtLink>
            </dd>
          </dl>
        </Card>

        {HELP_TOPICS.map((t) => {
          const Icon = TOPIC_ICONS[t.id as keyof typeof TOPIC_ICONS] ?? Info;
          return (
            <Section key={t.id} title={t.title} icon={<Icon />} collapsible>
              <Body>{t.body}</Body>
            </Section>
          );
        })}

        <Section
          title="データの出典"
          description="栄養・気候などの元になったデータ"
          icon={<Database />}
          collapsible
        >
          <Body>
            <ul className="list-disc space-y-1.5 pl-5">
              {DATA_CREDITS.map((c) => (
                <li key={c.name}>
                  {c.url ? <ExtLink href={c.url}>{c.name}</ExtLink> : c.name}
                  <span className="text-slate-500 dark:text-slate-400"> — {c.note}</span>
                </li>
              ))}
            </ul>
          </Body>
        </Section>

        <Section
          title="クレジット・ライセンス"
          description="利用しているオープンソースソフトウェア（ライセンス全文）"
          icon={<Scale />}
          collapsible
        >
          <Body>
            <p>
              このアプリは MIT License
              で公開しています。以下のオープンソースソフトウェアを利用させていただいています。
              名前を押すとライセンスの全文を表示します（太字は直接利用しているもの）。
            </p>
          </Body>
          <LicenseList />
        </Section>
      </PageBody>
    </>
  );
}
