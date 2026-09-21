/**
 * AK²-Engine / core-engine.js
 * ============================
 * Canvas アニメーション基盤エンジン + Canvas スクロール可視制御
 *
 * 設計方針:
 *  - プライベートフィールド（#）で内部状態をカプセル化
 *  - エフェクトは { init, update, draw, onResize } インターフェイスを持つクラスとして登録
 *  - グローバルシングルトン `AK2` を window に公開し、各エフェクトから参照する
 *
 * 使い方:
 *  AK2.register(new MyEffect());   // チェーン可能
 *
 * エフェクトが実装すべきインターフェイス:
 *  init(canvas, ctx)   - Canvas/ctx を受け取り初期化
 *  update(dt)          - フレーム毎の状態更新（dt = 経過ms）
 *  draw(ctx)           - Canvas への描画
 *  onResize(w, h)      - リサイズ時に呼ばれる
 */
class AK2Engine {

  /** @type {Array<object>} */
  #effects = [];

  /** @type {HTMLCanvasElement|null} */
  #canvas = null;

  /** @type {CanvasRenderingContext2D|null} */
  #ctx = null;

  /** @type {number|null} */
  #animationId = null;

  /** @type {boolean} */
  #isPaused = false;

  constructor() {
    document.addEventListener('DOMContentLoaded', () => this.#boot());
  }

  // ── 公開 API ─────────────────────────────────────

  /**
   * エフェクトを登録する（チェーン可能）
   * @param {object} effect
   * @returns {AK2Engine}
   */
  register(effect) {
    this.#effects.push(effect);
    // Canvas が既に初期化済みの場合は即座に init を呼ぶ
    if (this.#canvas && this.#ctx) {
      effect.init?.(this.#canvas, this.#ctx);
    }
    return this;
  }

  /** @returns {HTMLCanvasElement|null} */
  get canvas() { return this.#canvas; }

  /** @returns {CanvasRenderingContext2D|null} */
  get ctx() { return this.#ctx; }

  /** ループ休止状態を切り替える（true = 休止、false = 再開） */
  setPaused(v) { this.#isPaused = v; }

  // ── 内部処理 ──────────────────────────────────────

  /**
   * Canvas を生成・初期化する
   * @param {string} canvasId
   */
  #initCanvas(canvasId = 'ak2-canvas') {
    this.#canvas = document.getElementById(canvasId);

    if (!this.#canvas) {
      this.#canvas = document.createElement('canvas');
      this.#canvas.id = canvasId;
      Object.assign(this.#canvas.style, {
        position:      'fixed',
        top:           '0',
        left:          '0',
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        '1',
      });
      document.body.prepend(this.#canvas);
    }

    this.#ctx = this.#canvas.getContext('2d');
    this.#resize();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.#resize(), 150);
    });
  }

  /** Canvas サイズをウィンドウに合わせ、各エフェクトに通知する */
  #resize() {
    if (!this.#canvas) return;
    this.#canvas.width  = window.innerWidth;
    this.#canvas.height = window.innerHeight;
    this.#effects.forEach(e => e.onResize?.(this.#canvas.width, this.#canvas.height));
  }

  /** requestAnimationFrame ループを開始する */
  #startLoop() {
    let lastTime = 0;
    const loop = (timestamp) => {
      this.#animationId = requestAnimationFrame(loop); // 先に再スケジュール
      if (this.#isPaused) return;                      // 休止中は計算・描画をスキップ
      const dt = timestamp - lastTime;
      lastTime = timestamp;
      this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#effects.forEach(e => {
        e.update?.(dt);
        e.draw?.(this.#ctx);
      });
    };
    this.#animationId = requestAnimationFrame(loop);
  }

  /** DOMContentLoaded 後に呼ばれる起動処理 */
  #boot() {
    if (this.#effects.length === 0) return; // エフェクト未登録ならキャンバス不生成
    this.#initCanvas();
    this.#effects.forEach(e => e.init?.(this.#canvas, this.#ctx));
    this.#startLoop();
  }
}

// グローバルシングルトンとして公開
const AK2 = new AK2Engine();

// ── Canvas スクロール可視制御 ─────────────────────────────────────
// Hero セクションがビューポートから外れたら Canvas を非表示 + ループ休止にする
(function initCanvasVisibility() {
  document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero-section');
    if (!hero) return;
    let canvas = null;
    const getCanvas = () => canvas || (canvas = document.querySelector('body > canvas'));

    const obs = new IntersectionObserver(([entry]) => {
      const c = getCanvas();
      if (!c) return;
      c.style.transition = 'opacity 0.6s ease';
      c.style.opacity = entry.isIntersecting ? '1' : '0';
      AK2.setPaused(!entry.isIntersecting);
    }, { threshold: 0 });
    obs.observe(hero);
  });
})();
