/**
 * AK²-Engine / effects/sparks.js
 * ================================
 * 火花エフェクト
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --sparks-burst
 *    バースト1回あたりの最小粒子数
 *    デフォルト: 25
 *    推奨範囲:   10（控えめ）〜 50（派手）
 *    1バーストで burst〜burst×2 個の粒子が生成される
 *
 *  --sparks-alpha
 *    粒子の最大アルファ値 0〜1
 *    デフォルト: 0.55
 *    推奨範囲:   0.3（抑えめ）〜 0.8（鮮明）
 *    寿命に比例して 0 まで減衰する
 *
 *  --sparks-interval
 *    バースト間隔の基準秒数
 *    デフォルト: 2.0
 *    推奨範囲:   1.0（頻繁）〜 5.0（散発）
 *    実際の間隔は interval × (0.5〜1.5) のランダム幅を持つ
 *
 * 使い方:
 *  AK2.register(new SparksEffect());
 */
class BgEffectSparks {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #particles = [];

  /** @type {number} 次バーストまでの残り時間（秒） */
  #emitTimer = 0;

  /**
   * バースト最小粒子数 — CSS 変数 --sparks-burst で上書き可
   * デフォルト: 25 | 推奨: 10〜50
   * @type {number}
   */
  #burstBase = 25;

  /**
   * 粒子の最大アルファ — CSS 変数 --sparks-alpha で上書き可
   * デフォルト: 0.55 | 推奨: 0.3〜0.8
   * @type {number}
   */
  #alphaScale = 0.55;

  /**
   * バースト間隔の基準秒 — CSS 変数 --sparks-interval で上書き可
   * デフォルト: 2.0 | 推奨: 1.0〜5.0
   * @type {number}
   */
  #emitInterval = 2.0;

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w         = canvas.width;
    this.#h         = canvas.height;
    this.#particles = [];
    this.#emitTimer = 0.3; // 最初のバーストを素早く発生

    const style = getComputedStyle(document.documentElement);
    const burst    = parseInt(style.getPropertyValue('--sparks-burst'));
    const alpha    = parseFloat(style.getPropertyValue('--sparks-alpha'));
    const interval = parseFloat(style.getPropertyValue('--sparks-interval'));
    if (burst > 0)     this.#burstBase    = burst;
    if (!isNaN(alpha)) this.#alphaScale   = alpha;
    if (interval > 0)  this.#emitInterval = interval;
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    const dts     = dt / 1000;
    const gravity = 120; // ゆっくり落下（元200→120）

    this.#emitTimer -= dts;
    if (this.#emitTimer <= 0) {
      this.#emitTimer = this.#emitInterval * (0.5 + Math.random());
      const x = 0.1 * this.#w + Math.random() * 0.8 * this.#w;
      const y = 0.1 * this.#h + Math.random() * 0.6 * this.#h;
      this.#burst(x, y);
    }

    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.life -= dts;
      if (p.life <= 0) { this.#particles.splice(i, 1); continue; }

      p.vy += gravity * dts;
      p.x  += p.vx * dts;
      p.y  += p.vy * dts;
      p.vx *= (1 - dts * 1.2); // ゆっくり制動（元1.5→1.2）
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#particles.forEach(p => {
      const t     = p.life / p.maxLife;
      const alpha = t * this.#alphaScale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * Math.max(0.3, t), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 90%, ${50 + t * 30}%, ${alpha})`;
      ctx.fill();
    });
  }

  // ── ユーティリティ ────────────────────────────────

  /**
   * 指定座標からパーティクルを放射状に生成
   * @param {number} x
   * @param {number} y
   */
  #burst(x, y) {
    const count = this.#burstBase + Math.floor(Math.random() * this.#burstBase);
    for (let i = 0; i < count; i++) {
      const angle   = Math.random() * Math.PI * 2;
      const speed   = 50 + Math.random() * 180; // ゆっくり目（元80-280→50-230）
      const maxLife = 1.0 + Math.random() * 1.5; // 長め（元0.5-1.4→1.0-2.5）
      this.#particles.push({
        x,
        y,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed - 40, // 少し上向きバイアス（弱め）
        life:    maxLife,
        maxLife,
        size:    1.0 + Math.random() * 2.0, // 少し大きく（元0.5-1.7→1.0-3.0）
        hue:     25 + Math.random() * 30,   // 橙〜黄金色（元30-65）
      });
    }
  }
}

// AK²Engine に登録
window.BgEffectSparks = BgEffectSparks;
