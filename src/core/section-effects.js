/**
 * section-effects.js
 * ==================
 * [data-section-effect="ClassName"] を持つ canvas を検出し、
 * 対応するエフェクトクラスを position:absolute canvas で描画する。
 *
 * 前提: 親 section に position:relative が設定されていること。
 *       エフェクトクラスが グローバルスコープに存在すること
 *       (effects front-matter または cardEffects で読み込み済み)。
 *
 * 使い方 (Nunjucks マクロ):
 *   {% from "components/macros.njk" import bgSnow %}
 *   {{ bgSnow() }}  ← セクション内に配置
 */
class SectionEffectRunner {

  /**
   * @param {HTMLCanvasElement} canvas
   */
  static #run(canvas) {
    const className = canvas.dataset.sectionEffect;
    if (!className) return;
    const EffectClass = window[className];
    if (!EffectClass) return;

    // キャンバス初期サイズを設定（effect 生成前）
    canvas.width  = canvas.offsetWidth  || canvas.parentElement.offsetWidth;
    canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight;

    const ctx = canvas.getContext('2d');

    // data-section-effect-options="{ name, ...params }" をパースしてコンストラクタに渡す
    let effectOptions = {};
    const optionsRaw = canvas.dataset.sectionEffectOptions;
    if (optionsRaw) {
      try {
        const parsed = JSON.parse(optionsRaw);
        delete parsed.name; // name キーはクラス名なので除外
        effectOptions = parsed;
      } catch (_) {}
    }

    const effect = new EffectClass(effectOptions);
    effect.init(canvas, ctx);

    // effect 生成後に定義 → TDZ なし
    const setSize = () => {
      canvas.width  = canvas.offsetWidth  || canvas.parentElement.offsetWidth;
      canvas.height = canvas.offsetHeight || canvas.parentElement.offsetHeight;
      effect.onResize(canvas.width, canvas.height);
    };

    window.addEventListener('resize', setSize, { passive: true });

    let lastTime = 0;
    let rafId = null;

    const loop = (ts) => {
      const dt = lastTime ? ts - lastTime : 0;
      lastTime = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      effect.update(dt);
      effect.draw(ctx);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    // セクションが見えない間はループを止める（省エネ化）
    const visObs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (!rafId) rafId = requestAnimationFrame(loop);
      } else {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      }
    }, { threshold: 0 });
    visObs.observe(canvas.parentElement);
  }

  static init() {
    document.querySelectorAll('[data-section-effect]').forEach((canvas) => {
      SectionEffectRunner.#run(canvas);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => SectionEffectRunner.init());
