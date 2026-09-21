---
layout: layouts/base.njk
title: "Sandbox"
sections:
  - template: hero-basic
    subtitle: "AK²ENGINE"
    title: "v2 Sandbox"
    lead: "v2 アーキテクチャのビルド確認用環境です。"

  - template: card-grid-basic
    heading: "RECIPES"
    subheading: "スターターキット"
    items:
      - title: "hero-basic"
        desc: "ヒーローセクション"
      - title: "cta-basic"
        desc: "コールトゥアクション"
      - title: "faq-basic"
        desc: "FAQ アコーディオン"
      - title: "card-grid-basic"
        desc: "カードグリッド"

  - template: hero-basic
    subtitle: "CUSTOMIZED"
    title: "CSS変数でカスタマイズ"
    lead: "同じ hero-basic レシピを CSS 調整変数で別の見た目にした例です。"
    extraClass: "hero-custom-demo"

  - template: cta-basic
    title: "アクションを起こそう"
    text: "同じ cta-basic レシピを CSS 変数でカスタマイズ。ボタン色・角丸・余白を変更しています。"
    linkUrl: "#"
    linkText: "デモボタン"
    gradient: "linear-gradient(135deg, #fef3c7, #fde68a)"
    extraClass: "cta-custom-demo"

  - template: faq-basic
    heading: "CUSTOMIZED FAQ"
    subheading: "カスタマイズされた FAQ"
    extraClass: "faq-custom-demo"
    items:
      - q: "CSS変数で何が変わる？"
        a: "背景色、カード色、角丸、ラベル色などを .njk を編集せずに変更できます。"
      - q: "フォークとの違いは？"
        a: "CSS変数は微調整向け。大きくデザインを変えたい場合は <code>npx ak2 create --from</code> でフォークしてテンプレート自体を改変します。"

  - template: card-grid-basic
    heading: "CUSTOMIZED GRID"
    subheading: "カスタマイズされたカードグリッド"
    extraClass: "grid-custom-demo"
    items:
      - num: "01"
        title: "create"
        desc: "スケルトン生成 or 既存レシピからフォーク"
      - num: "02"
        title: "customize"
        desc: "CSS変数で微調整、テンプレートで大改変"
      - num: "03"
        title: "save"
        desc: "新レシピとして登録・再利用"
---
