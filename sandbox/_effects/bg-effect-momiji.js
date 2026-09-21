/**
 * AK²-Engine / effects/momiji.js
 * ================================
 * 紅葉（もみじ）エフェクト（MomijiEffect）
 *
 * カスタムSVGパスから起こしたもみじ形を、
 * フラットスピンと疑似3Dパースペクティブで舞わせる。
 * 葉が「斜め上から見下ろされる」立体感を演出。
 * 秋テーマ・和風・旅館・日本庭園系に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --momiji-count
 *    葉の数
 *    デフォルト: 40
 *    推奨範囲:   15（静か）〜 70（賑やか）
 *    カードプレビュー用: 8〜12
 *
 *  --momiji-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 0.9 の標準値）
 *    推奨範囲:   0.5〜1.0
 *
 *  --momiji-hue
 *    葉の基準色相（0〜360）
 *    デフォルト: 15（赤橙の紅葉色）
 *    例: 5（深紅）/ 25（橙）/ 35（黄橙）
 *
 * 使い方:
 *  AK2.register(new MomijiEffect());
 */
class BgEffectMomiji {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #particles = [];

  /**
   * 葉の数 — CSS 変数 --momiji-count で上書き可
   * デフォルト: 40 | 推奨: 15〜70
   * @type {number}
   */
  #count = 40;

  /**
   * アルファ係数 — CSS 変数 --momiji-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 基準色相 — CSS 変数 --momiji-hue で上書き可
   * デフォルト: 15（赤橙の紅葉色）
   * @type {number}
   */
  #baseHue = 15;

  // もみじ形状の頂点（SVGのviewBox=240x260、中心=120,130）
  static #MAPLE_PATH = [
    [120,220],[128,205],[143.6,170.2],[138.3,140.4],[156.2,164.2],
    [197.8,182.4],[186.2,140.2],[167.7,115.5],[150.3,104],[168.2,104.2],
    [197.8,91.8],[162.2,79.8],[144.2,85.8],[156.5,79.3],[162.1,56],
    [138.7,67.8],[125.7,85.5],[125,35],[115,35],[114.3,85.5],
    [102.3,68.3],[77.9,55.6],[83.9,80.2],[95.5,85.8],[77.9,79.6],
    [41.8,91.5],[72,104.6],[90.1,104.3],[71.7,116.1],[53.7,140.1],
    [41.9,182.2],[83.7,164.5],[101.3,140.3],[96.1,169.9],[112,205],
    [120,220],
  ];

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n = parseInt(style.getPropertyValue('--momiji-count'));
    const a = parseFloat(style.getPropertyValue('--momiji-alpha'));
    const h = parseFloat(style.getPropertyValue('--momiji-hue'));
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;
    if (!isNaN(h)) this.#baseHue    = h;

    this.#particles = Array.from({ length: this.#count }, () => this.#reset({}, true));
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    const timeScale = dt / 6;

    for (const p of this.#particles) {
      // 1. 落下
      p.y += (p.speedY + p.vy) * timeScale;
      p.vy *= Math.pow(0.98, timeScale);

      // 2. 左右の不規則な漂い
      p.driftTimer -= timeScale;
      if (p.driftTimer <= 0) {
        p.driftTarget = (Math.random() - 0.5) * 1.5;
        p.driftTimer  = Math.random() * 150 + 50;
      }
      p.vx += (p.driftTarget - p.vx) * 0.01 * timeScale;
      p.x  += (p.speedX + p.vx) * timeScale;

      // 3. 細かい揺らぎ
      p.wobble += p.wobbleSpeed * timeScale;
      p.x += Math.sin(p.wobble) * 0.05 * timeScale;

      // 4. フラットスピン（平面回転）
      p.angle += p.zSpinSpeed * timeScale;

      // 5. 疑似3D（わずかな傾き変動）
      p.flipPhase  += p.flipSpeedX * timeScale;
      p.flipPhaseY += p.flipSpeedY * timeScale;

      // 画面外リセット
      if (p.y > this.#h + p.size * 2 ||
          p.x < -p.size * 2 ||
          p.x >  this.#w + p.size * 2) {
        this.#reset(p, false);
      }
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const path = BgMomijiEffect.#MAPLE_PATH;
    const cx = 120;
    const cy = 130;

    for (const p of this.#particles) {
      const flipScaleX = Math.cos(p.flipPhase)  * 0.05 + 0.95;
      const flipScaleY = Math.cos(p.flipPhaseY) * 0.05 + 0.95;
      const drawAngle  = p.angle + Math.sin(p.wobble) * 0.15;
      const scale      = p.size / 80;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.8); // 斜め上から見下ろす疑似パース
      ctx.rotate(drawAngle);
      ctx.scale(flipScaleX, flipScaleY);

      ctx.fillStyle = `hsla(${p.hue}, 80%, 45%, ${p.alpha})`;
      ctx.beginPath();
      ctx.moveTo((path[0][0] - cx) * scale, (path[0][1] - cy) * scale);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo((path[i][0] - cx) * scale, (path[i][1] - cy) * scale);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ── ユーティリティ ────────────────────────────────

  /**
   * @param {object}  p
   * @param {boolean} isFirstTime
   */
  #reset(p, isFirstTime) {
    p.x = Math.random() * this.#w;
    p.y = isFirstTime ? Math.random() * this.#h : -50;

    p.size   = Math.random() * 6 + 10;
    p.speedY = Math.random() * 0.2 + 0.6;
    p.speedX = (Math.random() - 0.5) * 0.2;
    p.vx     = 0;
    p.vy     = 0;

    p.driftTarget = 0;
    p.driftTimer  = Math.random() * 100;

    p.wobble      = Math.random() * Math.PI * 2;
    p.wobbleSpeed = Math.random() * 0.02 + 0.01;

    p.angle = Math.random() * Math.PI * 2;

    const spinDir = Math.random() > 0.5 ? 1 : -1;
    p.zSpinSpeed = spinDir * (Math.random() * 0.01 + 0.03);

    p.flipPhase  = Math.random() * Math.PI * 2;
    p.flipSpeedX = Math.random() * 0.02 + 0.01;
    p.flipPhaseY = Math.random() * Math.PI * 2;
    p.flipSpeedY = Math.random() * 0.02 + 0.01;

    p.hue   = this.#baseHue + (Math.random() * 30 - 15);
    p.alpha = 0.9 * this.#alphaScale;
    return p;
  }
}

// AK²Engine に登録
window.BgEffectMomiji = BgEffectMomiji;
