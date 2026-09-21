/**
 * AK²-Engine / effects/ripple.js
 * ================================
 * クリック波紋エフェクト
 *
 * 技術解説:
 *  - クリックごとに Canvas 上に同心円を生成
 *  - 時間経過とともに半径が広がり、透明度が消えていく
 *  - Math.pow によるイーズアウトで自然な物理挙動を演出
 *  - 複数の波紋が同時に存在できる（配列で管理）
 */
class BgEffectRipple {

  /**
   * @typedef {{ x: number, y: number, r: number, maxR: number, alpha: number, color: string }} Ripple
   * @type {Ripple[]}
   */
  #ripples = [];

  /** @type {string[]} 波紋のカラーバリエーション */
  #colors = [
    '2, 93, 204',    // ブルー
    '0, 198, 255',   // シアン
    '100, 116, 139', // グレー
  ];

  constructor() {
    // Canvas エフェクトなのでクリックは body でキャッチ
    document.addEventListener('click', e => {
      this.#addRipple(e.clientX, e.clientY);
    });
  }

  // ── AK²Engine インターフェイス ────────────────

  init(_canvas, _ctx) { /* 初期化不要 */ }

  onResize(_w, _h) { /* 不要 */ }

  update(dt) {
    const speed = dt / 1000;
    this.#ripples.forEach(r => {
      r.r     += speed * 220;
      r.alpha  = Math.max(0, 1 - (r.r / r.maxR));
    });
    this.#ripples = this.#ripples.filter(r => r.alpha > 0);
  }

  draw(ctx) {
    this.#ripples.forEach(r => {
      // 内側に白いリング
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(${r.color}, ${r.alpha * 0.35})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // 外側のぼかしリング（少し大きく・薄く）
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 0.7, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(${r.color}, ${r.alpha * 0.15})`;
      ctx.lineWidth   = 3;
      ctx.stroke();
    });
  }

  // ── 内部処理 ─────────────────────────────────

  #addRipple(x, y) {
    const color = this.#colors[Math.floor(Math.random() * this.#colors.length)];
    this.#ripples.push({ x, y, r: 5, maxR: 180, alpha: 1, color });
  }
}

// AK²Engine に登録
window.BgEffectRipple = BgEffectRipple;
