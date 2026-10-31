#!/usr/bin/env node
/** public/favicon.svg から PWA 用の PNG アイコンを作る（アイコンを変えたときに手で実行） */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// playwright は開発環境に入っているものを使う（NODE_PATH=$(npm root -g) で実行）
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const out = (f) => new URL(`../public/icons/${f}`, import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad, bg] of [
  ['icon-192.png', 192, 0, 'transparent'],
  ['icon-512.png', 512, 0, 'transparent'],
  ['apple-touch-icon.png', 180, 0, '#3f8f6b'],
  ['maskable-512.png', 512, 0.12, '#3f8f6b'],
]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size * (1 - pad * 2);
  await page.setContent(
    `<body style="margin:0;background:${bg};display:grid;place-items:center;width:${size}px;height:${size}px">
     <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div></body>`,
  );
  await page.screenshot({ path: out(file), omitBackground: bg === 'transparent' });
}
await browser.close();
