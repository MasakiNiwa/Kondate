export interface DataCredit {
  name: string;
  url?: string;
  note: string;
}

/** ソフトウェア以外で参考・利用しているデータ（ヘルプの「データの出典」） */
export const DATA_CREDITS: DataCredit[] = [
  {
    name: '日本食品標準成分表（八訂）増補 2023 年',
    url: 'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html',
    note: '文部科学省。食材の栄養素はこれをもとに丸めた概算値です',
  },
  {
    name: '日本人の食事摂取基準（2025 年版）',
    url: 'https://www.mhlw.go.jp/stf/newpage_44138.html',
    note: '厚生労働省。年齢・性別ごとの栄養の目安を、アプリ向けに簡略化して使っています',
  },
  {
    name: '気象庁 平年値（1991〜2020 年）',
    url: 'https://www.data.jma.go.jp/stats/etrn/index.php',
    note: '地域ごとの月の最高気温の平年値（天気予報を使わないときの気温）',
  },
  {
    name: 'Open-Meteo',
    url: 'https://open-meteo.com/',
    note: '天気予報 API（CC BY 4.0）。地域を設定したときだけ、献立の期間の最高気温を取得します',
  },
  {
    name: 'LiteRT-LM',
    url: 'https://github.com/google-ai-edge/LiteRT-LM',
    note: '端末内の AI の推論エンジン（Apache-2.0）。モデルは Hugging Face の litert-community などから入手します（各モデルのライセンスに従います）',
  },
];
