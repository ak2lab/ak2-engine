/**
 * AK²-Engine / effects/leaf.js
 * ==============================
 * 落葉エフェクト（LeafEffect）
 *
 * 紅葉・黄葉が独自の回転軸でひらひらと舞い落ちる。
 * 秋テーマ・和風・旅館・インテリア系に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --leaf-count
 *    葉の数
 *    デフォルト: 35
 *    推奨範囲:   15（静か）〜 60（賑やか）
 *    カードプレビュー用: 8〜12
 *
 *  --leaf-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 0.55〜0.85 の標準範囲）
 *    推奨範囲:   0.6〜1.0
 *
 * 使い方:
 *  AK2.register(new LeafEffect());
 */
class BgEffectLeaf {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {number} 経過時間（秒） */
  #time = 0;

  /** @type {Array<object>} */
  #leaves = [];

  /**
   * 葉の数 — CSS 変数 --leaf-count で上書き可
   * デフォルト: 35 | 推奨: 15〜60
   * @type {number}
   */
  #count = 35;

  /**
   * アルファ係数 — CSS 変数 --leaf-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.6〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w    = canvas.width;
    this.#h    = canvas.height;
    this.#time = 0;

    const style = getComputedStyle(document.documentElement);
    const n = parseInt(style.getPropertyValue('--leaf-count'));
    const a = parseFloat(style.getPropertyValue('--leaf-alpha'));
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;

    this.#leaves = Array.from({ length: this.#count }, () => this.#createLeaf(true));
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

    this.#leaves.forEach(l => {
      l.y    += l.speed * dts;
      l.x    += l.drift * dts + Math.sin(t * l.freq + l.sway) * l.amp * dts;
      l.rotZ += l.rotSpd * dts;
      // 非線形な揺れ（木の葉らしいひらひら感）
      l.rotY  = Math.sin(t * l.freq * 2 + l.sway) * 0.8;

      if (l.y > this.#h + 30) {
        Object.assign(l, this.#createLeaf(false));
        l.x = Math.random() * this.#w;
      }
      if (l.x < -30)          l.x += this.#w + 60;
      if (l.x > this.#w + 30) l.x -= this.#w + 60;
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#leaves.forEach(l => {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rotZ);
      // rotY（Y軸回転）を scaleX で近似（ひらひら感）
      ctx.scale(Math.abs(Math.cos(l.rotY)), 1);
      ctx.beginPath();
      // 木の葉形状：楕円を少し尖らせる
      ctx.ellipse(0, 0, l.w, l.h, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${l.hue}, ${l.sat}%, ${l.lit}%, ${l.alpha})`;
      ctx.fill();
      // 葉脈（中心線）
      ctx.beginPath();
      ctx.moveTo(0, -l.h);
      ctx.lineTo(0, l.h);
      ctx.strokeStyle = `hsla(${l.hue}, ${l.sat - 10}%, ${l.lit - 15}%, ${l.alpha * 0.4})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    });
  }

  // ── ユーティリティ ────────────────────────────────

  /**
   * @param {boolean} randomY - true なら初期Y位置をランダム
   */
  #createLeaf(randomY = false) {
    // 紅葉・黄葉の色相: 10〜50（赤橙〜黄）
    const hue = 10 + Math.random() * 40;
    const w   = 5  + Math.random() * 8;
    return {
      x:      Math.random() * this.#w,
      y:      randomY ? Math.random() * this.#h : -30,
      w,
      h:      w * (0.6 + Math.random() * 0.5), // 横長〜縦長ランダム
      speed:  18 + Math.random() * 25,          // 雪より少し遅め
      rotZ:   Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 1.5,
      rotY:   0,
      sway:   Math.random() * Math.PI * 2,
      freq:   0.2 + Math.random() * 0.4,
      amp:    25  + Math.random() * 35,
      drift:  (Math.random() - 0.5) * 12,
      hue,
      sat:    75 + Math.random() * 20,
      lit:    40 + Math.random() * 20,
      alpha:  (0.55 + Math.random() * 0.30) * this.#alphaScale,
    };
  }
}

// AK²Engine に登録
window.BgEffectLeaf = BgEffectLeaf;
