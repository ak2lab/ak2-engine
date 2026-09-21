/**
 * AK²-Engine / effects/snow.js
 * ============================
 * 雪の舞いエフェクト
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --snow-count
 *    粒子数
 *    デフォルト: 60
 *    推奨範囲:   20（控えめ）〜 100（吹雪）
 *    カードプレビュー用: 10〜20
 *
 *  --snow-alpha
 *    アルファ係数 0〜1（粒子ごとの alpha 値に乗算）
 *    デフォルト: 1.0（= 0.12〜0.32 の標準範囲）
 *    ダーク背景: 1.0〜1.5
 *
 *  --snow-hue
 *    雪粒の色相 0〜360（設定時のみ有効）
 *    デフォルト: 未設定（= 白/青白 rgba(220,235,255)）
 *    白背景推奨: 210（青灰色）
 *
 *  --snow-lightness
 *    雪粒の明度 0〜100（--snow-hue 設定時のみ有効）
 *    デフォルト: 70
 *    白背景推奨: 50〜60（低いほど濃く見える）
 *
 * 使い方:
 *  AK2.register(new SnowEffect());
 */
class BgEffectSnow {

  /** @type {object} コンストラクタオプション（CSS変数より優先） */
  #options = {};

  /** @param {{ count?: number, alpha?: number, hue?: number, lightness?: number }} options */
  constructor(options = {}) {
    this.#options = options;
  }

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {number} 経過時間（秒） */
  #time = 0;

  /** @type {Array<object>} */
  #flakes = [];

  /**
   * 粒子数 — CSS 変数 --snow-count で上書き可
   * デフォルト: 60 | 推奨: 20〜100
   * @type {number}
   */
  #count = 60;

  /**
   * アルファ係数 — CSS 変数 --snow-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 雪粒の色相 — CSS 変数 --snow-hue で上書き可
   * デフォルト: -1（= 白/青白）| 白背景推奨: 210
   * @type {number}
   */
  #hue = -1;

  /**
   * 雪粒の明度 — CSS 変数 --snow-lightness で上書き可（--snow-hue 設定時のみ有効）
   * デフォルト: 70 | 白背景推奨: 50〜60
   * @type {number}
   */
  #lightness = 70;

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w    = canvas.width;
    this.#h    = canvas.height;
    this.#time = 0;

    const style = getComputedStyle(document.documentElement);
    const n   = parseInt(style.getPropertyValue('--snow-count'));
    const a   = parseFloat(style.getPropertyValue('--snow-alpha'));
    const hue = parseFloat(style.getPropertyValue('--snow-hue'));
    const lit = parseFloat(style.getPropertyValue('--snow-lightness'));
    if (n > 0)      this.#count      = n;
    if (!isNaN(a))  this.#alphaScale = a;
    if (!isNaN(hue)) this.#hue       = hue;
    if (!isNaN(lit)) this.#lightness = lit;

    // コンストラクタオプションは CSS 変数より優先（セクション個別指定に使用）
    if (this.#options.count     !== undefined) this.#count      = this.#options.count;
    if (this.#options.alpha     !== undefined) this.#alphaScale = this.#options.alpha;
    if (this.#options.hue       !== undefined) this.#hue        = this.#options.hue;
    if (this.#options.lightness !== undefined) this.#lightness  = this.#options.lightness;

    this.#flakes = Array.from({ length: this.#count }, () => this.#createFlake(true));
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    const dts = dt / 1000;
    this.#time += dts;
    const t = this.#time;

    this.#flakes.forEach(f => {
      f.y += f.speed * dts;
      f.x += f.drift * dts + Math.sin(t * f.freq + f.angle) * f.amp * dts;

      if (f.y > this.#h + 10) {
        Object.assign(f, this.#createFlake(false));
        f.x = Math.random() * this.#w;
      }
      if (f.x < -10)           f.x += this.#w + 20;
      if (f.x > this.#w + 10) f.x -= this.#w + 20;
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#flakes.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fillStyle = this.#hue >= 0
        ? `hsla(${this.#hue}, 30%, ${this.#lightness}%, ${f.alpha})`
        : `rgba(220, 235, 255, ${f.alpha})`;
      ctx.fill();
    });
  }

  // ── ユーティリティ ────────────────────────────────

  /**
   * @param {boolean} randomY - true なら初期Y位置をランダム（初期化時用）
   */
  #createFlake(randomY = false) {
    return {
      x:     Math.random() * this.#w,
      y:     randomY ? Math.random() * this.#h : -10,
      size:  1.5 + Math.random() * 3.5,
      speed: 25  + Math.random() * 35,
      drift: (Math.random() - 0.5) * 20,
      angle: Math.random() * Math.PI * 2,
      freq:  0.3 + Math.random() * 0.7,
      amp:   15  + Math.random() * 25,
      alpha: (0.12 + Math.random() * 0.2) * this.#alphaScale,
    };
  }
}

// AK²Engine に登録
window.BgEffectSnow = BgEffectSnow;
