# AK2Engine v2 アーキテクチャ設計

最終更新: 2026-03-23

## 設計思想

AK2Engine を「コア層（仕組み）」と「レシピ層（見た目）」に分離する。
エンジンはビルドパイプラインとセクション描画の仕組みだけを提供し、
具体的なデザイン（テンプレート・CSS・エフェクト）はプロジェクト側で自由に作成・改変できるようにする。

目的:
- AI が既存プラグインに縛られず、自由にデザインできるようにする
- エンジン更新なしで新しいセクションデザインを追加できるようにする
- .md にはデータだけ書き、見た目は .njk + .css に分離する

## プロジェクト構成

```
my-site/
  src/
    _sections/        ... セクションテンプレート（.njk + .css）
    _effects/         ... エフェクト（.js）
    _includes/
      layouts/
        base.njk
    _data/
    index.md
    about/
      index.md        ... .md は必ず index.md
    blog/
      blog.json
      2026/03/sample-post.md
  package.json
  .ak2rc.yml
```

## フロントマターの書き方

```yaml
---
layout: layouts/base.njk

# ページ全体のエフェクト（任意）
effects:
  - BgEffectSnow

# セクション構成
sections:
  - template: hero-basic
    effects:
      - name: BgEffectFirefly
        count: 30
    title: "サイトタイトル"
    subtitle: "サブタイトル"
    lead: "リード文"

  - template: content    # Markdown 本文

  - template: card-grid
    heading: "FEATURES"
    subheading: "特徴"
    items:
      - title: "カード1"
        img: /img/photo1.jpg
      - title: "カード2"
        img: /img/photo2.jpg
---
```

テンプレート内では `section.*` でフラットにアクセスする。
既存の `type:` セクションと同じ慣習で、余計なネストは作らない。

## 命名規則

| 対象 | ファイル名 | YAML での指定 | コード内の名前 |
|---|---|---|---|
| セクション | hero-basic.njk（kebab-case） | template: hero-basic | - |
| エフェクト | bg-effect-snow.js（kebab-case） | BgEffectSnow（PascalCase） | class BgEffectSnow |

CSS クラス命名（ベストプラクティス）:
- テンプレート名をプレフィックスに使う
- BEM 風: .hero-basic, .hero-basic__title, .hero-basic__lead

エフェクト命名:
- 背景エフェクト: BgEffect + 名前（例: BgEffectSnow, BgEffectAurora）
- ファイル名は kebab-case: bg-effect-snow.js

## コア層の責務

| 機能 | 内容 |
|---|---|
| セクション描画 | template 名 → _sections/{name}.njk を呼ぶ |
| エフェクト初期化 | effects → _effects/{name}.js をロード、各 canvas にインスタンス生成 |
| ビルド | CSS/JS バンドル（エンジン + プロジェクト側の _sections/ と _effects/） |
| ブログ基盤 | コレクション、フィルター、ページネーション |
| 検索 | Pagefind |
| CSS 変数 | 少数のデザイントークン |

## レシピ配布

GitHub: ak2-recipes/ リポジトリ（1つにまとめて管理）
CLI: npx ak2 add hero-basic card-grid BgEffectSnow
レジストリ: registry.json（レシピ・エフェクトの一覧とメタデータ）

CLI コマンド:
  npx ak2 add <名前...>        レシピ/エフェクトをプロジェクトに追加
  npx ak2 list                 利用可能なレシピ一覧
  npx ak2 list effects         利用可能なエフェクト一覧

ダウンロード優先順位:
  1. GitHub リポジトリ（ak2-recipes）
  2. ローカル（エンジンパッケージ内のファイル）

## 名称整理

| 旧 | 新 | 備考 |
|---|---|---|
| プラグイン | レシピ | .njk + .css のセット |
| ブロックプラグイン | （廃止） | セクション内で直接 template 指定 |
| エフェクトプラグイン | エフェクト | _effects/ に独立 |

## 移行フェーズ

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | コア変更（base.njk の参照先変更、Nunjucks 検索パス、バンドル対応） | 完了 |
| 2 | スターターキット（hero-basic, cta-basic, faq-basic, card-grid-basic） | 完了 |
| 3 | エフェクト分離（_effects/ 26個、BgEffect* 命名、後方互換エイリアス） | 完了 |
| 4 | CLI ツール（npx ak2 add/list）+ registry.json | 完了 |

## 残作業

### ✅ 完了済み

- layout 系（layout-header-*, layout-footer-*, layout-hero-*）→ src/includes/ に移動
- effect-bg 系（27個）→ _effects/ に移行済み、src/plugins/ から削除済み
- 非 bg エフェクト（effect-cursor-*, effect-motion-*, effect-text-*, effect-interact-*）→ src/includes/ に移動
- block-search-modal → src/includes/ に移動
- 後方互換エイリアス（window.BgSnowEffect = BgEffectSnow 等）→ 全削除済み
- ak2-recipes リポジトリ → GitHub 作成済み（aidev2007/ak2-recipes）、エイリアス削除版プッシュ済み
- ベストプラクティスに CSS 命名規則・エフェクト命名規則・レシピ自己完結ルール追記済み
- v2 ドキュメント 5 ページ新規作成済み（v2-architecture, v2-recipes, v2-effects, v2-cli, v2-naming）

### 未完了

（なし — v2 移行は全て完了）
