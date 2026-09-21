/**
 * AK²-Engine / effects/leaf-fall.js
 * ====================================
 * 落葉エフェクト — 物理演算版（LeafFallEffect）
 *
 * 空気力学的な姿勢制御エンジンを搭載。
 * 縦（直立）と横（水平）の間を自然に行き来しながら、
 * きりもみ回転で舞い落ちる。チカチカ防止のため最低幅を保証。
 * 秋テーマ・和風・旅館・インテリア系に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --leaf-fall-count
 *    葉の数
 *    デフォルト: 40
 *    推奨範囲:   15（静か）〜 70（賑やか）
 *    カードプレビュー用: 8〜12
 *
 *  --leaf-fall-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 0.85 の標準値）
 *    推奨範囲:   0.5〜1.0
 *
 *  --leaf-fall-hue
 *    葉の基準色相（0〜360）
 *    デフォルト: 45（黄橙の秋色）
 *    例: 30（茶橙）/ 20（赤橙）/ 60（黄）
 *
 * 使い方:
 *  AK2.register(new LeafFallEffect());
 */
class BgEffectLeafFall {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #particles = [];

  /**
   * 葉の数 — CSS 変数 --leaf-fall-count で上書き可
   * デフォルト: 40 | 推奨: 15〜70
   * @type {number}
   */
  #count = 40;

  /**
   * アルファ係数 — CSS 変数 --leaf-fall-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 基準色相 — CSS 変数 --leaf-fall-hue で上書き可
   * デフォルト: 45（黄橙）
   * @type {number}
   */
  #baseHue = 45;

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n = parseInt(style.getPropertyValue('--leaf-fall-count'));
    const a = parseFloat(style.getPropertyValue('--leaf-fall-alpha'));
    const h = parseFloat(style.getPropertyValue('--leaf-fall-hue'));
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
    const timeScale = dt / 7;

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
      const totalVx = p.speedX + p.vx;
      p.x += totalVx * timeScale;

      // 3. 細かい揺らぎ
      p.wobble += p.wobbleSpeed * timeScale;
      p.x += Math.sin(p.wobble) * 0.05 * timeScale;

      // 4. 空気力学的な姿勢制御（逆立ち回避）
      p.postureTimer -= timeScale;
      if (p.postureTimer <= 0) {
        p.isVertical   = !p.isVertical;
        p.postureTimer = p.isVertical
          ? (Math.random() * 80  + 40)
          : (Math.random() * 300 + 150);
      }

      let ca = p.angle;
      while (ca >  Math.PI) ca -= Math.PI * 2;
      while (ca < -Math.PI) ca += Math.PI * 2;
      p.angle = ca;

      let torque;
      if (p.isVertical) {
        torque = Math.sin((0 - p.angle) / 2) * 0.004;
      } else {
        const target = totalVx > 0 ? -Math.PI / 2 : Math.PI / 2;
        torque = Math.sin((target - p.angle) / 2) * 0.005;
      }
      p.spin += torque * timeScale;
      p.spin *= Math.pow(0.94, timeScale);
      p.angle += p.spin * timeScale;

      // 5. きりもみ回転（疑似3D）
      p.flipPhase += p.flipSpeed * timeScale;

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
    for (const p of this.#particles) {
      // チカチカ防止：最低 30% の幅を保証
      const minScale = 0.3;
      const raw  = Math.cos(p.flipPhase);
      const sign = raw >= 0 ? 1 : -1;
      const flipScale = sign * (Math.abs(raw) * (1 - minScale) + minScale);

      const drawAngle = p.angle + Math.sin(p.wobble) * 0.15;
      this.#drawLeaf(ctx, p.x, p.y, p.size, drawAngle, p.hue, flipScale, p.alpha);
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
    p.speedY = Math.random() * 0.5 + 0.5;
    p.speedX = (Math.random() - 0.5) * 0.2;
    p.vx     = 0;
    p.vy     = 0;

    p.driftTarget = 0;
    p.driftTimer  = Math.random() * 100;

    p.wobble      = Math.random() * Math.PI * 2;
    p.wobbleSpeed = Math.random() * 0.02 + 0.01;

    const ivx = p.speedX + p.vx;
    p.angle        = (ivx > 0 ? -1 : 1) * (Math.PI / 2) + (Math.random() - 0.5) * 0.5;
    p.spin         = 0;
    p.isVertical   = Math.random() > 0.8;
    p.postureTimer = Math.random() * 200 + 100;

    p.flipPhase = Math.random() * Math.PI * 2;
    p.flipSpeed = Math.random() * 0.06 + 0.06;

    p.hue   = this.#baseHue + (Math.random() * 30 - 15);
    p.alpha = 0.85 * this.#alphaScale;
    return p;
  }

  /**
   * 卵型の葉を描画
   */
  #drawLeaf(ctx, x, y, size, angle, hue, flipScale, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(flipScale, 1);

    const w = size * 1.20;
    ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo( w * 0.6, -size,  w, size, 0, size);
    ctx.bezierCurveTo(-w, size, -w * 0.6, -size, 0, -size);
    ctx.fill();
    ctx.restore();
  }
}

// AK²Engine に登録
window.BgEffectLeafFall = BgEffectLeafFall;
