/**
 * AK²-Engine / effects/sakura.js
 * ===============================
 * 桜吹雪エフェクト
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --sakura-count
 *    花びらの数
 *    デフォルト: 45
 *    推奨範囲:   20（控えめ）〜 80（満開）
 *    カードプレビュー用: 8〜15
 *
 *  --sakura-alpha
 *    アルファ係数 0〜1（花びらごとの alpha 値に乗算）
 *    デフォルト: 1.0（= 0.5〜0.9 の標準範囲）
 *    薄い桜色ライトBG: 0.6〜0.8
 *    ダークBG重ね: 0.4〜0.6
 *
 * 使い方:
 *  AK2.register(new SakuraEffect());
 */
class BgEffectSakura {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {number} 経過時間（秒） */
  #time = 0;

  /** @type {Array<object>} */
  #petals = [];

  /**
   * 花びら数 — CSS 変数 --sakura-count で上書き可
   * デフォルト: 45 | 推奨: 20〜80
   * @type {number}
   */
  #count = 45;

  /**
   * アルファ係数 — CSS 変数 --sakura-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.4〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

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
    const n = parseInt(style.getPropertyValue('--sakura-count'));
    const a = parseFloat(style.getPropertyValue('--sakura-alpha'));
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;

    this.#petals = Array.from({ length: this.#count }, () => this.#createPetal(true));
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

    this.#petals.forEach(p => {
      p.y    += p.speed * dts;
      p.x    += p.drift * dts + Math.sin(t * p.freq + p.sway) * p.amp * dts;
      p.rotZ += p.rotSpd * dts;

      if (p.y > this.#h + 20) {
        Object.assign(p, this.#createPetal(false));
        p.x = Math.random() * this.#w;
      }
      if (p.x < -20)          p.x += this.#w + 40;
      if (p.x > this.#w + 20) p.x -= this.#w + 40;
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#petals.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotZ);
      ctx.scale(p.scaleX, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 90%, 78%, ${p.alpha})`;
      ctx.fill();
      ctx.restore();
    });
  }

  // ── ユーティリティ ────────────────────────────────

  /**
   * @param {boolean} randomY - true なら初期Y位置をランダム
   */
  #createPetal(randomY = false) {
    return {
      x:      Math.random() * this.#w,
      y:      randomY ? Math.random() * this.#h : -20,
      size:   4 + Math.random() * 6,
      speed:  30 + Math.random() * 50,
      rotZ:   Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 2.0,
      scaleX: 0.3 + Math.random() * 0.7,
      sway:   Math.random() * Math.PI * 2,
      freq:   0.2 + Math.random() * 0.5,
      amp:    20  + Math.random() * 40,
      drift:  (Math.random() - 0.5) * 15,
      hue:    340 + Math.random() * 20,
      alpha:  (0.5 + Math.random() * 0.4) * this.#alphaScale,
    };
  }
}

// AK²Engine に登録
window.BgEffectSakura = BgEffectSakura;
