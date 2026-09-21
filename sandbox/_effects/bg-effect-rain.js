/**
 * AK²-Engine / effects/rain.js
 * =============================
 * 雨粒エフェクト（RainEffect）
 *
 * 放射状グラデーションで立体感を表現した雫形パーティクルが落下する。
 * 大きい粒ほど速く落ちるリアルな速度差で奥行き感を演出。
 * 雨・梅雨・水・清涼・リゾート・スパ系に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --rain-count
 *    雨粒の数
 *    デフォルト: 120
 *    推奨範囲:   60（小雨）〜 300（大雨）
 *    カードプレビュー用: 30〜50
 *
 *  --rain-alpha
 *    アルファ係数 0〜1（各パーティクルの alpha に乗算）
 *    デフォルト: 1.0
 *    推奨範囲:   0.5〜1.0
 *
 *  --rain-hue
 *    雨粒の基準色相（0〜360）
 *    デフォルト: 200（水色）
 *    例: 210（深青）/ 180（シアン）/ 190（エメラルド寄り）
 *
 * 使い方:
 *  AK2.register(new RainEffect());
 */
class BgEffectRain {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #particles = [];

  /**
   * 雨粒の数 — CSS 変数 --rain-count で上書き可
   * デフォルト: 120 | 推奨: 60〜300
   * @type {number}
   */
  #count = 120;

  /**
   * アルファ係数 — CSS 変数 --rain-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 基準色相 — CSS 変数 --rain-hue で上書き可
   * デフォルト: 200（水色）
   * @type {number}
   */
  #hue = 200;

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n = parseInt(style.getPropertyValue('--rain-count'));
    const a = parseFloat(style.getPropertyValue('--rain-alpha'));
    const h = parseFloat(style.getPropertyValue('--rain-hue'));
    if (n > 0)     this.#count = n;
    if (!isNaN(a)) this.#alphaScale = a;
    if (!isNaN(h)) this.#hue = h;

    this.#particles = Array.from({ length: this.#count }, () => this.#reset({}, true));
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    const ts = dt / 16.67; // 60fps 基準のタイムスケール

    for (const p of this.#particles) {
      // 落下（大きい粒ほど速い）
      p.y += p.speed * ts;

      // ゆるやかな横揺れ
      p.wobble += p.wobbleSpeed * ts;
      p.x += Math.sin(p.wobble) * 0.2 * ts;

      if (p.y > this.#h + p.size * 2) {
        this.#reset(p, false);
      }
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const hue = this.#hue;

    for (const p of this.#particles) {
      const angle = Math.sin(p.wobble) * 0.03;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);

      // 放射状グラデーション（立体的な3D雫表現）
      const g = ctx.createRadialGradient(
        -p.size * 0.1, 0, p.size * 0.1,
        0, 0, p.size * 1.5
      );
      g.addColorStop(0,   `hsla(${hue}, 80%, 95%, ${0.9  * this.#alphaScale})`);
      g.addColorStop(0.2, `hsla(${hue}, 70%, 60%, ${0.8  * this.#alphaScale})`);
      g.addColorStop(1,   `hsla(${hue}, 90%, 30%, ${0.4  * this.#alphaScale})`);

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo( p.size * 0.8, -p.size * 0.2,  p.size * 0.8,  p.size, 0,  p.size);
      ctx.bezierCurveTo(-p.size * 0.8,  p.size,        -p.size * 0.8, -p.size * 0.2, 0, -p.size);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── ユーティリティ ────────────────────────────────

  /**
   * @param {object}  p
   * @param {boolean} isFirstTime
   */
  #reset(p, isFirstTime) {
    p.size        = Math.random() * 3.5 + 1;
    p.x           = Math.random() * this.#w;
    p.y           = isFirstTime ? Math.random() * this.#h : -30;
    p.speed       = p.size * 4; // 大きい粒ほど速く落ちる（px/frame @60fps）
    p.wobble      = Math.random() * Math.PI * 2;
    p.wobbleSpeed = Math.random() * 0.02 + 0.005;
    return p;
  }
}

// AK²Engine に登録
window.BgEffectRain = BgEffectRain;
