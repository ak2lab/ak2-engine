/**
 * AK²-Engine / effects/waves.js
 * ================================
 * 波（曲線アート）エフェクト
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --wave-alpha
 *    全レイヤーのアルファ係数
 *    デフォルト: 1.0（= 0.08〜0.12 の標準範囲）
 *    推奨範囲:   0.5（淡い）〜 3.0（くっきり）
 *    ページヒーロー背景: 1.0〜1.5
 *    セクション区切り:   0.5〜1.0
 *
 * 使い方:
 *  AK2.register(new WaveEffect());
 */
class BgEffectWave {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {number} 経過時間（秒） */
  #time = 0;

  /**
   * アルファ係数 — CSS 変数 --wave-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜3.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 波レイヤー定義（r,g,b,a を分離して alphaScale に対応）
   * @type {Array<{amplitude,frequency,speed,yRatio,r,g,b,a}>}
   */
  #layers = [
    { amplitude: 30, frequency: 0.008, speed: 0.6, yRatio: 0.60, r: 80,  g: 120, b: 200, a: 0.12 },
    { amplitude: 20, frequency: 0.012, speed: 0.9, yRatio: 0.65, r: 100, g: 160, b: 220, a: 0.10 },
    { amplitude: 40, frequency: 0.005, speed: 0.4, yRatio: 0.70, r: 60,  g: 100, b: 180, a: 0.08 },
  ];

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w    = canvas.width;
    this.#h    = canvas.height;
    this.#time = 0;

    const a = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wave-alpha'));
    if (!isNaN(a)) this.#alphaScale = a;
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    this.#time += dt / 1000;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const w        = this.#w;
    const h        = this.#h;
    const t        = this.#time;
    const segments = 8;
    const segW     = w / segments;
    const s        = this.#alphaScale;

    this.#layers.forEach(layer => {
      const baseY = h * layer.yRatio;

      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let i = 0; i <= segments; i++) {
        const x = i * segW;
        const y = baseY + Math.sin(x * layer.frequency + t * layer.speed) * layer.amplitude;

        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          const prevX = (i - 1) * segW;
          const prevY = baseY + Math.sin(prevX * layer.frequency + t * layer.speed) * layer.amplitude;
          const cpX   = (prevX + x) / 2;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = `rgba(${layer.r}, ${layer.g}, ${layer.b}, ${layer.a * s})`;
      ctx.fill();
    });
  }
}

// AK²Engine に登録
window.BgEffectWave = BgEffectWave;
