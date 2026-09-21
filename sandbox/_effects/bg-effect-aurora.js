/**
 * AK²-Engine / effects/aurora.js
 * ================================
 * オーロラエフェクト
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --aurora-alpha
 *    全バンドのアルファ係数
 *    デフォルト: 1.0（= 最大 0.13 の標準輝度）
 *    推奨範囲:   0.5（淡い）〜 2.0（鮮明）
 *    セクション背景: 0.8〜1.2
 *    ページ全体BG:   1.5〜2.0
 *
 *  --aurora-theme
 *    背景テーマ切替
 *    デフォルト: dark（明るい 60% lightness、黒背景向け）
 *    白背景: light（濃い 35% lightness、アルファ x1.5）
 *
 * 使い方:
 *  AK2.register(new AuroraEffect());
 */
class BgEffectAurora {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {number} 経過時間（秒） */
  #time = 0;

  /**
   * アルファ係数 — CSS 変数 --aurora-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜2.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * テーマ — CSS 変数 --aurora-theme で上書き可
   * 'dark'（デフォルト）| 'light'（白背景用）
   * @type {string}
   */
  #theme = 'dark';

  /**
   * バンド定義: baseY=画面高さに対する縦位置比率
   * @type {Array<{baseY:number, hueBase:number, speed:number, amp:number, phase:number}>}
   */
  #bands = [
    { baseY: 0.30, hueBase: 160, speed: 0.12, amp: 0.08, phase: 0.0 },
    { baseY: 0.45, hueBase: 200, speed: 0.09, amp: 0.10, phase: 1.5 },
    { baseY: 0.55, hueBase: 260, speed: 0.14, amp: 0.07, phase: 3.0 },
    { baseY: 0.65, hueBase: 180, speed: 0.08, amp: 0.09, phase: 4.5 },
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

    const style = getComputedStyle(document.documentElement);
    const a     = parseFloat(style.getPropertyValue('--aurora-alpha'));
    const theme = style.getPropertyValue('--aurora-theme').trim();
    if (!isNaN(a))         this.#alphaScale = a;
    if (theme === 'light') this.#theme      = 'light';
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
    const w = this.#w;
    const h = this.#h;
    const t = this.#time;
    const segs = 6;
    const s = this.#alphaScale;

    this.#bands.forEach(band => {
      const hue    = (band.hueBase + t * 12) % 360;
      const alpha  = (0.05 + Math.abs(Math.sin(t * 0.25 + band.phase)) * 0.08) * s;
      const bandH  = h * (0.15 + Math.abs(Math.sin(t * band.speed * 0.4 + band.phase)) * 0.08);
      const ctrY   = h * band.baseY + Math.sin(t * band.speed + band.phase) * h * band.amp;

      ctx.beginPath();
      ctx.moveTo(0, ctrY);
      for (let i = 1; i <= segs; i++) {
        const x    = (i / segs) * w;
        const prevX = ((i - 1) / segs) * w;
        const y    = ctrY + Math.sin(i * 1.3 + t * band.speed * 1.5) * h * 0.04;
        const py   = ctrY + Math.sin((i - 1) * 1.3 + t * band.speed * 1.5) * h * 0.04;
        const cpX  = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, py, cpX, y, x, y);
      }

      for (let i = segs; i >= 0; i--) {
        const x   = (i / segs) * w;
        const y   = ctrY + bandH + Math.sin(i * 1.1 + t * band.speed * 0.8) * h * 0.03;
        if (i === segs) {
          ctx.lineTo(x, y);
        } else {
          const nextX = ((i + 1) / segs) * w;
          const ny    = ctrY + bandH + Math.sin((i + 1) * 1.1 + t * band.speed * 0.8) * h * 0.03;
          const cpX   = (x + nextX) / 2;
          ctx.bezierCurveTo(cpX, ny, cpX, y, x, y);
        }
      }
      ctx.closePath();

      const lit    = this.#theme === 'light' ? 75 : 60;
      const sat    = this.#theme === 'light' ? 50 : 80;
      const aScale = this.#theme === 'light' ? 2.5 : 1.0;
      const grd = ctx.createLinearGradient(0, ctrY, 0, ctrY + bandH);
      grd.addColorStop(0,   `hsla(${hue}, ${sat}%, ${lit}%, 0)`);
      grd.addColorStop(0.4, `hsla(${hue}, ${sat}%, ${lit}%, ${alpha * aScale})`);
      grd.addColorStop(0.6, `hsla(${(hue + 30) % 360}, ${sat}%, ${lit + 5}%, ${alpha * aScale * 0.8})`);
      grd.addColorStop(1,   `hsla(${hue}, ${sat}%, ${lit}%, 0)`);
      ctx.fillStyle = grd;
      ctx.fill();
    });
  }
}

// AK²Engine に登録
window.BgEffectAurora = BgEffectAurora;
