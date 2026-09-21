/**
 * AK²-Engine / effects/vintage-film.js
 * =======================================
 * ヴィンテージフィルムエフェクト（VintageFilmEffect）
 *
 * アナログフィルムのスクラッチ（縦傷）・ダスト（チリ）・
 * ビネット（周辺減光）を再現する。
 * 白系背景での使用に適しており、映写機フリッカー（projector-flicker.js）
 * と組み合わせることでより本格的なフィルム質感を表現できる。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --vintage-film-alpha
 *    全体強度係数 0〜2
 *    デフォルト: 1.0（= 標準の傷・チリ量）
 *    推奨範囲:   0.5（控えめ）〜 1.5（強い劣化感）
 *
 * 使い方:
 *  AK2.register(new VintageFilmEffect());
 */
class BgEffectVintageFilm {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {HTMLCanvasElement} オフスクリーンキャンバス（残像処理用） */
  #offCanvas;

  /** @type {CanvasRenderingContext2D} */
  #offCtx;

  /** @type {Array<object>} スクラッチ（縦傷）の配列 */
  #scratches = [];

  /** @type {Array<object>} ダスト（チリ）の配列 */
  #dusts = [];

  /**
   * 全体強度係数 — CSS 変数 --vintage-film-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  constructor() {
    this.#offCanvas = document.createElement('canvas');
    this.#offCtx = this.#offCanvas.getContext('2d', { alpha: true });
  }

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const a = parseFloat(style.getPropertyValue('--vintage-film-alpha'));
    if (!isNaN(a)) this.#alphaScale = a;

    this.#offCanvas.width  = this.#w;
    this.#offCanvas.height = this.#h;
    this.#offCtx.clearRect(0, 0, this.#w, this.#h);
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
    this.#offCanvas.width  = w;
    this.#offCanvas.height = h;
    this.#offCtx.clearRect(0, 0, w, h);
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    // スクラッチ（縦の傷）
    this.#scratches = this.#scratches.filter(s => {
      s.life -= dt;
      return s.life > 0;
    });
    if (Math.random() < 0.05) {
      const h       = Math.random() * (this.#h * 0.3) + (this.#h * 0.05);
      const y       = Math.random() * (this.#h + h) - h;
      const isThick = Math.random() < 0.15;
      const width   = isThick ? (Math.random() * 1.5 + 1.5) : (Math.random() * 0.8 + 0.2);
      this.#scratches.push({
        x:       Math.random() * this.#w,
        y,
        h,
        width,
        life:    Math.random() * 150 + 50,
        opacity: (Math.random() * 0.2 + 0.15) * this.#alphaScale,
      });
    }

    // ダスト（チリ・ホコリ）
    this.#dusts = this.#dusts.filter(d => {
      d.life -= dt;
      return d.life > 0;
    });
    if (Math.random() < 0.15) {
      this.#dusts.push({
        x:       Math.random() * this.#w,
        y:       Math.random() * this.#h,
        radius:  Math.random() * 2.0 + 1.0,
        life:    Math.random() * 100 + 20,
        opacity: (Math.random() * 0.3 + 0.2) * this.#alphaScale,
      });
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // オフスクリーン: 残像をフェードアウト
    this.#offCtx.globalCompositeOperation = 'destination-out';
    this.#offCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.#offCtx.fillRect(0, 0, this.#w, this.#h);
    this.#offCtx.globalCompositeOperation = 'source-over';

    // スクラッチ描画
    this.#offCtx.fillStyle = 'rgba(60, 60, 60, 0.8)';
    this.#scratches.forEach(s => {
      this.#offCtx.globalAlpha = s.opacity;
      this.#offCtx.fillRect(s.x, s.y, s.width, s.h);
    });

    // ダスト描画
    this.#dusts.forEach(d => {
      this.#offCtx.globalAlpha = d.opacity;
      this.#offCtx.beginPath();
      this.#offCtx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      this.#offCtx.fill();
    });
    this.#offCtx.globalAlpha = 1.0;

    // メインキャンバス: セピアオーバーレイ
    ctx.fillStyle = `rgba(234, 221, 207, ${0.15 * this.#alphaScale})`;
    ctx.fillRect(0, 0, this.#w, this.#h);

    // オフスクリーンをメインへ合成
    ctx.drawImage(this.#offCanvas, 0, 0);

    // ビネット（周辺減光）
    const r = Math.max(this.#w, this.#h);
    const gradient = ctx.createRadialGradient(
      this.#w / 2, this.#h / 2, r * 0.4,
      this.#w / 2, this.#h / 2, r * 0.8
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${0.05 * this.#alphaScale})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.#w, this.#h);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// AK²Engine に登録
window.BgEffectVintageFilm = BgEffectVintageFilm;
