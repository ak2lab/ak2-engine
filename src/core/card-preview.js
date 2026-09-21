/**
 * card-preview.js
 * ===============
 * [data-preview="ClassName"] を持つ canvas を検出し、
 * 対応するエフェクトクラスをミニループで実行する。
 *
 * 前提: cardEffects front-matter でエフェクトクラスが読み込み済み
 *       (window.AK2 = { register: () => {} } のモックで登録を無効化)
 *
 * トグルボタン:
 *   canvas の兄弟要素として `.effect-card-toggle` ボタンを配置すると
 *   ダーク/ライト背景切替が有効になる。
 *   canvas に以下の data 属性を設定する:
 *     data-dark-bg  : ダーク時の背景色（例: #030e1a）
 *     data-light-bg : ライト時の背景色（例: #f8fafc）
 *     data-light-vars: ライト時のCSS変数（例: "--snow-hue:210,--snow-lightness:55"）
 *
 * 使い方:
 *   <canvas data-preview="BgSnowEffect" class="effect-preview-canvas"
 *           data-dark-bg="#030e1a" data-light-bg="#f8fafc"
 *           data-light-vars="--snow-hue:210,--snow-lightness:55"></canvas>
 */
class CardPreview {

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    const className  = canvas.dataset.preview;
    const EffectClass = window[className];
    if (!EffectClass) return;

    // キャンバス初期サイズをCSS表示サイズに合わせる（effect生成前）
    const initW = canvas.offsetWidth  || 300;
    const initH = canvas.offsetHeight || 180;
    canvas.width  = initW;
    canvas.height = initH;

    const ctx  = canvas.getContext('2d');
    let effect = new EffectClass();
    effect.init(canvas, ctx);

    // effect 生成後に定義 → TDZ なし
    const setSize = () => {
      const w = canvas.offsetWidth  || 300;
      const h = canvas.offsetHeight || 180;
      canvas.width  = w;
      canvas.height = h;
      effect.onResize(w, h);
    };

    let running  = false;
    let lastTime = 0;
    let rafId    = null;

    const loop = (ts) => {
      if (!running) return;
      const dt = lastTime ? ts - lastTime : 0;
      lastTime = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      effect.update(dt);
      effect.draw(ctx);
      rafId = requestAnimationFrame(loop);
    };

    // IntersectionObserver でビューポート外は停止、表示時に再サイズ
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setSize();
          running  = true;
          lastTime = 0;
          rafId = requestAnimationFrame(loop);
        } else {
          running = false;
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        }
      });
    }, { threshold: 0.1 });

    observer.observe(canvas);

    // ── ダーク/ライトトグルボタン ───────────────────
    const btn = canvas.parentElement?.querySelector('.effect-card-toggle');
    if (!btn) return;

    // light-vars が無い（またはダーク専用）エフェクトはトグル無効
    const lightVarsStr = (canvas.dataset.lightVars || '').trim();
    if (!lightVarsStr && !canvas.dataset.lightBg) {
      btn.style.display = 'none';
      return;
    }

    /** CSS変数を document.documentElement に一時適用 */
    const applyVars = (varStr) => {
      varStr.split(',').forEach(pair => {
        const idx = pair.indexOf(':');
        if (idx < 0) return;
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        if (key) document.documentElement.style.setProperty(key, val);
      });
    };

    /** 適用したCSS変数を削除 */
    const removeVars = (varStr) => {
      varStr.split(',').forEach(pair => {
        const idx = pair.indexOf(':');
        if (idx < 0) return;
        const key = pair.slice(0, idx).trim();
        if (key) document.documentElement.style.removeProperty(key);
      });
    };

    /** エフェクトを再初期化（CSS変数を読み直す） */
    const reinit = () => {
      effect.init(canvas, ctx);
    };

    canvas.dataset.mode = 'dark';

    // デモリンクの参照を取得（同じカード内）
    const card     = canvas.closest?.('.effect-catalog-card') ?? canvas.parentElement?.parentElement;
    const demoLink = card?.querySelector('.effect-catalog-card__demo');
    const darkDemoHref  = demoLink ? demoLink.getAttribute('href') : null;
    const lightDemoHref = demoLink ? (demoLink.dataset.lightDemo || null) : null;

    btn.addEventListener('click', () => {
      const isLight = canvas.dataset.mode === 'light';

      if (isLight) {
        // light → dark
        reinit(); // デフォルトのCSS変数で再初期化
        canvas.style.background = canvas.dataset.darkBg || '#060c18';
        canvas.dataset.mode = 'dark';
        btn.textContent = '☀';
        btn.title = '白背景に切替';
        if (demoLink && darkDemoHref) demoLink.href = darkDemoHref;
      } else {
        // dark → light
        if (lightVarsStr) {
          applyVars(lightVarsStr);
        }
        reinit(); // lightのCSS変数で再初期化
        if (lightVarsStr) {
          removeVars(lightVarsStr); // 再初期化後すぐ削除（他カードに影響しない）
        }
        canvas.style.background = canvas.dataset.lightBg || '#f8fafc';
        canvas.dataset.mode = 'light';
        btn.textContent = '🌙';
        btn.title = '黒背景に切替';
        if (demoLink && lightDemoHref) demoLink.href = lightDemoHref;
      }

      // サイズを再設定（背景切替後に正しいサイズを確保）
      setSize();
    });

    // 初期ツールチップ
    btn.title = '白背景に切替';
  }

  static init() {
    document.querySelectorAll('[data-preview]').forEach((canvas) => {
      new CardPreview(canvas);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => CardPreview.init());
