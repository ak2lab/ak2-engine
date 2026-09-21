/**
 * AK²-Engine / effects/stars.js
 * ================================
 * 星座（コンステレーション）エフェクト
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --stars-count
 *    星の数
 *    デフォルト: 60
 *    推奨範囲:   30（シンプル）〜 100（密度高）
 *    カードプレビュー用: 18〜25（接続線が適度に現れる）
 *    ※ 少なすぎると星座線が出なくなる（最低20程度推奨）
 *
 *  --stars-alpha
 *    線・点のアルファ係数
 *    デフォルト: 1.0
 *    推奨範囲:   0.5（淡い）〜 1.5（鮮明）
 *    ライトBG向け: 0.6〜0.8
 *
 * 使い方:
 *  AK2.register(new StarFieldEffect());
 */
class BgEffectStarField {

  /** @type {Array<{x,y,vx,vy,r}>} */
  #stars = [];

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /**
   * 星の数 — CSS 変数 --stars-count で上書き可
   * デフォルト: 60 | 推奨: 30〜100（最低20）
   * @type {number}
   */
  #count = 60;

  /** @type {number} 接続する最大距離 (px) */
  #maxDist = 160;

  /**
   * 線・点のアルファ係数 — CSS 変数 --stars-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  /** @type {string} 色の RGB 値（ブルーグレー: 黒・白両背景対応） */
  #colorRGB = '103, 133, 166';

  // ── AK²Engine インターフェイス ────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n = parseInt(style.getPropertyValue('--stars-count'));
    const a = parseFloat(style.getPropertyValue('--stars-alpha'));
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;

    this.#generate();
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
    this.#generate();
  }

  update(dt) {
    const factor = dt / 16;
    this.#stars.forEach(s => {
      s.x += s.vx * factor;
      s.y += s.vy * factor;
      if (s.x < -10)           s.x = this.#w + 10;
      if (s.x > this.#w + 10) s.x = -10;
      if (s.y < -10)           s.y = this.#h + 10;
      if (s.y > this.#h + 10) s.y = -10;
    });
  }

  draw(ctx) {
    const stars = this.#stars;
    const max   = this.#maxDist;
    const s     = this.#alphaScale;
    const c     = this.#colorRGB;

    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx   = stars[i].x - stars[j].x;
        const dy   = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > max) continue;

        const alpha = (1 - dist / max) * 0.35 * s;
        ctx.beginPath();
        ctx.moveTo(stars[i].x, stars[i].y);
        ctx.lineTo(stars[j].x, stars[j].y);
        ctx.strokeStyle = `rgba(${c}, ${alpha})`;
        ctx.lineWidth   = 1.0;
        ctx.stroke();
      }
    }

    ctx.fillStyle = `rgba(${c}, ${0.65 * s})`;
    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // ── 内部処理 ─────────────────────────────────

  #generate() {
    this.#stars = Array.from({ length: this.#count }, () => ({
      x:  Math.random() * this.#w,
      y:  Math.random() * this.#h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r:  Math.random() * 2.0 + 1.0,
    }));
  }
}

// AK²Engine に登録
window.BgEffectStarField = BgEffectStarField;
