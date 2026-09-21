/**
 * AK²-Engine / effects/maple-leaves.js
 * =======================================
 * 楓落葉エフェクト（MapleLeafEffect）
 *
 * 「コクのある乱数」（ガウス近似）によるランダムウォーク物理と
 * ベルヌーイ試行の確率的方向転換を搭載。
 * Path2D で描画した楓葉シルエットが滑空しながら舞い落ちる。
 * 横移動中は空気抵抗で落下が緩み、方向転換時はコマ打ちアニメーションで反転。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --maple-leaves-count
 *    葉の数
 *    デフォルト: 40
 *    推奨範囲:   15（静か）〜 80（賑やか）
 *    カードプレビュー用: 8〜12
 *
 *  --maple-leaves-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 0.8〜1.0 の標準範囲）
 *    推奨範囲:   0.5〜1.0
 *
 * 使い方:
 *  AK2.register(new MapleLeafEffect());
 */

/**
 * コクのある乱数（正規分布近似）
 * -1.0 〜 1.0 の範囲で、0（中央）が出やすい乱数を返す
 * @returns {number}
 */
function _gaussianRandom() {
  return ((Math.random() + Math.random() + Math.random()) / 3) * 2 - 1.0;
}

/**
 * 楓葉 1枚のパーティクル
 */
class _MapleLeaf {
  #x = 0;
  #y = 0;
  #vx = 0;
  #size = 25;
  #baseSpeedY = 0;

  // 反転（フリップ）アニメーション用
  #flipScaleX = 1.0;
  #targetFlipScaleX = 1.0;
  #flipTimer = 0;
  #flipDuration = 4; // 4ステップで完了

  #rotation = 0;
  #alpha = 1;

  /** @param {number} w @param {number} h */
  constructor(w, h) {
    this.#reset(w, h, true);
  }

  /** @param {number} w @param {number} h @param {boolean} isInit */
  #reset(w, h, isInit = false) {
    this.#size       = 25;
    this.#x          = Math.random() * w;
    this.#y          = isInit ? Math.random() * h : -this.#size * 2;
    this.#baseSpeedY = Math.random() * 1.0 + 0.8;
    this.#vx         = _gaussianRandom() * 2.0;
    this.#targetFlipScaleX = this.#vx >= 0 ? 1.0 : -1.0;
    this.#flipScaleX = this.#targetFlipScaleX;
    this.#flipTimer  = 0;
    this.#rotation   = 0;
    this.#alpha      = 0.8 + Math.random() * 0.2;
  }

  /**
   * @param {number} ts  タイムスケール（60fps基準で1.0）
   * @param {number} w
   * @param {number} h
   */
  update(ts, w, h) {
    // ベルヌーイ試行（約1.5%の確率で方向転換）
    const r = () => Math.floor(Math.random() * 2);
    if (r() * r() * r() * r() * r() === 1) {
      this.#vx = _gaussianRandom() * 3.0;
      this.#flipTimer = this.#flipDuration;
      this.#targetFlipScaleX = this.#vx >= 0 ? 1.0 : -1.0;
    }

    let currentSpeedY = this.#baseSpeedY;

    if (this.#flipTimer > 0) {
      this.#flipTimer = Math.max(0, this.#flipTimer - ts);
      const progress  = 1.0 - (this.#flipTimer / this.#flipDuration);
      const startScale = -this.#targetFlipScaleX;

      if (progress < 0.25)      this.#flipScaleX = startScale;
      else if (progress < 0.5)  this.#flipScaleX = startScale * 0.8;
      else if (progress < 0.75) this.#flipScaleX = this.#targetFlipScaleX * 0.8;
      else                      this.#flipScaleX = this.#targetFlipScaleX;

    } else {
      // 横滑空時は空気抵抗で落下を緩和
      const glideFactor = Math.abs(this.#vx) / 3.0;
      currentSpeedY = this.#baseSpeedY * (1.0 - Math.min(glideFactor, 0.4));
    }

    this.#x += this.#vx * ts;
    this.#y += currentSpeedY * ts;

    // X方向のラップアラウンド
    if (this.#x > w + 200) this.#x -= (w + 400);
    if (this.#x < -200)    this.#x += (w + 400);

    // 傾きを進行方向に追従
    const targetRotation = this.#vx * 0.15;
    this.#rotation += (targetRotation - this.#rotation) * 0.1;

    if (this.#y > h + this.#size * 2) {
      this.#reset(w, h);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {Path2D} leafPath
   * @param {number} alphaScale
   */
  draw(ctx, leafPath, alphaScale) {
    ctx.save();
    ctx.translate(this.#x, this.#y);
    ctx.rotate(this.#rotation);
    ctx.scale(this.#flipScaleX * (this.#size / 50), this.#size / 50);

    ctx.globalAlpha = this.#alpha * alphaScale;
    ctx.fillStyle   = '#D23B2A';
    ctx.fill(leafPath);
    ctx.strokeStyle = '#A9261A';
    ctx.lineWidth   = 1 / (this.#size / 50); // スケールに対する補正
    ctx.lineJoin    = 'round';
    ctx.stroke(leafPath);

    ctx.restore();
  }
}

// ── メインエフェクトクラス ────────────────────────────────

class BgEffectMapleLeaf {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {_MapleLeaf[]} */
  #leaves = [];

  /** @type {Path2D|null} */
  #leafPath = null;

  /**
   * 葉の数 — CSS 変数 --maple-leaves-count で上書き可
   * デフォルト: 40 | 推奨: 15〜80
   * @type {number}
   */
  #count = 40;

  /**
   * アルファ係数 — CSS 変数 --maple-leaves-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n = parseInt(style.getPropertyValue('--maple-leaves-count'));
    const a = parseFloat(style.getPropertyValue('--maple-leaves-alpha'));
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;

    // 楓葉シルエットの Path2D（viewBox=0 0 100 100、横向き）
    this.#leafPath = new Path2D(
      'M 5 30 L 25 42 L 15 31 L 30 40 L 25 33 L 40 40 L 40 31 ' +
      'L 50 39 L 65 34 L 60 43 L 75 40 L 65 48 L 95 30 L 95 31 ' +
      'L 65 49 L 75 48 L 60 55 L 65 62 L 50 61 L 40 67 ' +
      'L 40 58 L 25 55 L 30 52 L 15 45 L 25 46 Z'
    );

    this.#leaves = Array.from(
      { length: this.#count },
      () => new _MapleLeaf(this.#w, this.#h)
    );
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
    for (const leaf of this.#leaves) {
      leaf.update(ts, this.#w, this.#h);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    for (const leaf of this.#leaves) {
      leaf.draw(ctx, this.#leafPath, this.#alphaScale);
    }
  }
}

// AK²Engine に登録
window.BgEffectMapleLeaf = BgEffectMapleLeaf;
