/**
 * AK²-Engine / effects/lines.js
 * ================================
 * グリッド線描画エフェクト（GridEffect）
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --grid-color
 *    グリッド線の色（CSS の color 値をそのまま指定）
 *    デフォルト: 'rgba(100, 140, 200, 0.15)'
 *    推奨例:
 *      rgba(100, 140, 200, 0.15)   // 青（デフォルト）
 *      rgba(0, 198, 255, 0.12)     // シアン
 *      rgba(200, 200, 200, 0.10)   // グレー
 *      rgba(100, 200, 120, 0.15)   // グリーン
 *
 *  --grid-size
 *    グリッド間隔（ピクセル）
 *    デフォルト: 60
 *    推奨範囲:   40（細かい）〜 120（大きい）
 *
 * 使い方:
 *  AK2.register(new GridEffect());
 */
class BgEffectGrid {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {number} 描画進捗 0.0〜1.0 */
  #progress = 0;

  /** @type {number} 1秒あたりの進捗量 */
  #speed = 0.4;

  /**
   * グリッド間隔 px — CSS 変数 --grid-size で上書き可
   * デフォルト: 60 | 推奨: 40〜120
   * @type {number}
   */
  #gridSize = 60;

  /**
   * グリッド線の色 — CSS 変数 --grid-color で上書き可
   * デフォルト: 'rgba(100, 140, 200, 0.15)'
   * @type {string}
   */
  #color = 'rgba(100, 140, 200, 0.15)';

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w        = canvas.width;
    this.#h        = canvas.height;
    this.#progress = 0;

    const style = getComputedStyle(document.documentElement);
    const size  = parseInt(style.getPropertyValue('--grid-size'));
    const color = style.getPropertyValue('--grid-color').trim();
    if (size > 0) this.#gridSize = size;
    if (color)    this.#color    = color;
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    if (this.#progress < 1.0) {
      this.#progress = Math.min(1.0, this.#progress + (dt / 1000) * this.#speed);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const w     = this.#w;
    const h     = this.#h;
    const g     = this.#gridSize;
    const p     = this.#progress;
    const cols  = Math.ceil(w / g);
    const rows  = Math.ceil(h / g);
    const drawn = Math.floor((cols + rows) * p);

    ctx.strokeStyle = this.#color;
    ctx.lineWidth   = 1;
    ctx.beginPath();

    for (let i = 0; i <= cols && i <= drawn; i++) {
      ctx.moveTo(i * g, 0);
      ctx.lineTo(i * g, h);
    }

    const rowsDrawn = Math.max(0, drawn - cols);
    for (let j = 0; j <= rows && j <= rowsDrawn; j++) {
      ctx.moveTo(0, j * g);
      ctx.lineTo(w, j * g);
    }

    ctx.stroke();
  }
}

// AK²Engine に登録
window.BgEffectGrid = BgEffectGrid;
