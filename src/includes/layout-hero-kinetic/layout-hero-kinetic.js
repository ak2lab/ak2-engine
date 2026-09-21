/**
 * AK² Lab / layout-hero-kinetic.js
 * ===================================
 * Hero ロゴ SVG アニメーション（クラスベース）
 *
 * 動作フロー:
 *  1. 各パスの全長を取得し strokeDasharray / strokeDashoffset をセット
 *  2. GridConstruction の 'ak2:grid-ready' イベントを待ってからラインを「描く」（2秒、Web Animations API）
 *  3. 描画完了後に .filled クラスを付与（塗りつぶし）
 *  4. 1秒後にシャインエフェクトのループを開始
 */
class LogoAnimation {

  /** @type {SVGElement|null} */
  #svg = null;

  /** @type {SVGPathElement[]} */
  #paths = [];

  /** @type {SVGGElement|null} */
  #shineGroup = null;

  /** @type {SVGPathElement[]} */
  #shinePaths = [];

  /**
   * @param {string} svgId - Hero ロゴ SVG の id 属性
   */
  constructor(svgId = 'hero-logo-svg') {
    document.addEventListener('DOMContentLoaded', () => this.#init(svgId));
  }

  // ── 初期化 ────────────────────────────────────────

  async #init(svgId) {
    this.#svg = document.getElementById(svgId);
    if (!this.#svg) return;

    this.#paths      = [...this.#svg.querySelectorAll('.brand-path')];
    this.#shineGroup = this.#svg.getElementById('shine-group');
    this.#shinePaths = [...this.#svg.querySelectorAll('.shining-effect')];

    this.#setupDashArray();
    await this.#waitForGrid();
    await this.#drawLines();
    this.#fillPaths();
    await this.#delay(1000);
    this.#startShine();
  }

  // ── ステップ1: Dash 準備 ──────────────────────────

  #setupDashArray() {
    this.#paths.forEach(path => {
      const len = path.getTotalLength();
      path.style.strokeDasharray  = len;
      path.style.strokeDashoffset = len;
    });
    this.#shinePaths.forEach(path => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `1000 ${len}`;
    });
  }

  // ── ステップ2: ライン描画アニメーション ──────────

  #drawLines() {
    return Promise.all(this.#paths.map(path => new Promise(resolve => {
      const len  = path.getTotalLength();
      const anim = path.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 2000, easing: 'cubic-bezier(0.37,0,0.63,1)', fill: 'forwards' }
      );
      anim.onfinish = resolve;
    })));
  }

  // ── ステップ3: 塗りつぶし ─────────────────────────

  #fillPaths() {
    this.#paths.forEach(p => p.classList.add('filled'));
  }

  // ── ステップ4: シャインエフェクト ─────────────────

  #startShine() {
    if (!this.#shineGroup) return;
    this.#shineGroup.style.opacity = 1;
    this.#shinePaths.forEach(p => {
      p.style.animation = 'loopShine 3s linear infinite';
    });
  }

  // ── ユーティリティ ────────────────────────────────

  /**
   * 'ak2:grid-ready' イベントを待つ（GridConstruction との同期）
   * GridConstruction が読み込まれていない場合は 2500ms でタイムアウト
   */
  #waitForGrid() {
    return new Promise(resolve => {
      const onReady = () => resolve();
      document.addEventListener('ak2:grid-ready', onReady, { once: true });
      setTimeout(() => {
        document.removeEventListener('ak2:grid-ready', onReady);
        resolve();
      }, 2500);
    });
  }

  #delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

window.LogoAnimation = LogoAnimation;
