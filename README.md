# AK²Engine

Eleventyを土台に、YAMLでページ構成とCanvas背景を組み立てる静的サイト制作基盤です。npmでは `@ak2lab/engine` として公開しています。

## 公開先

- [デモを見る](https://ak2engine.ak2lab.com/)
- [制作事例の説明](https://ak2lab.github.io/cases/ak2-engine/)

区分: 自主制作・実用

## 特徴

- YAMLでセクションを並べてページを構成します。個別ページのHTMLを直接書かずに、ランディングページを組み立てられます。
- 背景エフェクトはCanvas APIで描画します。
- 仕組みを受け持つコア層と、見た目を受け持つレシピ層を分けています。
- セクションの追加・作成・保存はCLI（`npx ak2 add` / `create` / `save`）で行います。

## 文書

使い方は[ドキュメントサイト](https://ak2engine.ak2lab.com/)にまとめています。設計の考え方は [ARCHITECTURE_V2.md](ARCHITECTURE_V2.md) にあります。

## 動作確認

`sandbox/` は、エンジンとセクションの動作を確かめるためのページです。Node.jsの環境で次のコマンドを実行すると、Eleventyの確認用サーバーで表示できます。

```sh
npm ci
npm run start:sandbox
```

## 更新情報

[CHANGELOG.md](CHANGELOG.md) に記録しています。

## AK²Lab

- [制作事例と技術資料](https://ak2lab.github.io/)
- [公式サイト](https://ak2lab.com/)
- [ポートフォリオ](https://portfolio.ak2lab.com/)
- [作品紹介](https://showcase.ak2lab.com/)
- [X](https://x.com/aidev_ak)
