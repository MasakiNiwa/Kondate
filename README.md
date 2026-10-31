# 献立アルゴリズム（Kondate）

> **プログラムの計算が導く、今日の献立**

数理最適化（混合整数計画法）で、**まとめ買い・栄養・旬・気候・好き嫌い**を同時に満たす献立を計算する Web アプリです。
AI は計算結果の上に乗って、リアクション・解説・相談相手を担当します（AI がなくても使えます）。

🌐 公開ページ: https://masakiniwa.github.io/Kondate/

## キーワード

| 役割           | アプリでは                                                             |
| -------------- | ---------------------------------------------------------------------- |
| 献立カレンダー | こだわりの料理人のように、毎日違う献立を組み立てる                     |
| 買い物管理     | 買い物上手な人のように、必要最小限のまとめ買いで数日分の材料をそろえる |
| 栄養素管理     | 栄養士のように、家族の年齢・性別に合わせて栄養の基準を満たす           |
| 高精度な計算   | 出来ない人に必要なのはヒントじゃない、正しいルールによる計算           |
| AI のサポート  | 人の心は弱いから、AI がモチベーションを支える                          |

## 技術構成

- Vite + React + TypeScript、Tailwind CSS、wouter（ハッシュルーティング）
- 状態: zustand、データ: Dexie（IndexedDB）、検証: zod
- 最適化: [HiGHS](https://highs.dev/)（WebAssembly）を Web Worker で並列実行
- グラフ: Apache ECharts
- PWA（vite-plugin-pwa）

詳しくは [docs/SPEC.md](docs/SPEC.md)（仕様とロードマップ）を参照してください。

## 開発

```bash
npm ci
npm run dev        # 開発サーバー
npm test           # テスト
npm run build      # 本番ビルド（dist/）
```

main ブランチにマージすると GitHub Actions で GitHub Pages に公開されます。

## ライセンス

[MIT License](LICENSE)。利用しているオープンソースソフトウェアは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)（`npm run licenses` で自動生成）と、アプリのヘルプページで確認できます。
