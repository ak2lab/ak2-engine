/**
 * AK²-Engine / effects/cherry-blossom.js
 * ==========================================
 * 桜の花びら — 物理演算版（CherryBlossomEffect）
 *
 * 空気力学的な姿勢制御エンジン搭載。
 * 縦・横の2モードを切り替えながら落下。X/Y独立のきりもみ回転で
 * 花びらが「パタパタ」翻る表現。桜・春・ブライダル系に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --cherry-blossom-count
 *    花びらの数
 *    デフォルト: 60
 *    推奨範囲:   20（控えめ）〜 120（満開）
 *    カードプレビュー用: 10〜15
 *
 *  --cherry-blossom-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 0.85 の標準値）
 *    推奨範囲:   0.5〜1.0
 *
 *  --cherry-blossom-hue
 *    花びらの基準色相（0〜360）
 *    デフォルト: 345（桜ピンク）
 *    例: 330（濃いピンク）/ 0（赤）/ 350（薄いピンク寄り）
 *
 * 使い方:
 *  AK2.register(new CherryBlossomEffect());
 */
class BgEffectCherryBlossom {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #particles = [];

  /**
   * 花びらの数 — CSS 変数 --cherry-blossom-count で上書き可
   * デフォルト: 60 | 推奨: 20〜120
   * @type {number}
   */
  #count = 60;

  /**
   * アルファ係数 — CSS 変数 --cherry-blossom-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 基準色相 — CSS 変数 --cherry-blossom-hue で上書き可
   * デフォルト: 345（桜ピンク）
   * @type {number}
   */
  #baseHue = 345;

  // ── AK²Engine インターフェイス ─────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} _ctx
   */
  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n = parseInt(style.getPropertyValue('--cherry-blossom-count'));
    const a = parseFloat(style.getPropertyValue('--cherry-blossom-alpha'));
    const h = parseFloat(style.getPropertyValue('--cherry-blossom-hue'));
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
      // 1. Y方向の落下 + 不規則な速度変動
      p.driftTimerY -= timeScale;
      if (p.driftTimerY <= 0) {
        p.driftTargetY = (Math.random() - 0.5) * 0.5;
        p.driftTimerY  = Math.random() * 150 + 50;
      }
      p.vy += (p.driftTargetY - p.vy) * 0.01 * timeScale;
      p.y  += (p.speedY + p.vy) * timeScale * 0.8;

      // 2. X方向の漂い
      p.driftTimer -= timeScale;
      if (p.driftTimer <= 0) {
        p.driftTarget = (Math.random() - 0.5) * 1.5;
        p.driftTimer  = Math.random() * 150 + 50;
      }
      p.vx += (p.driftTarget - p.vx) * 0.01 * timeScale;
      const totalVx = p.speedX + p.vx;
      p.x  += totalVx * timeScale;

      // 3. 空気力学的な姿勢制御（逆立ち回避）
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

      // 4. X/Y独立のきりもみ回転（パタパタ感）
      p.flipPhaseX += p.flipSpeedX * timeScale;
      p.flipPhaseY += p.flipSpeedY * timeScale;

      p.wobble += p.wobbleSpeed * timeScale;

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
      // チカチカ防止：最低 30% の幅を保証（X/Y独立）
      const minScale = 0.3;

      const rawX  = Math.cos(p.flipPhaseX);
      const signX = rawX >= 0 ? 1 : -1;
      const flipScaleX = signX * (Math.abs(rawX) * (1 - minScale) + minScale);

      const rawY  = Math.cos(p.flipPhaseY);
      const signY = rawY >= 0 ? 1 : -1;
      const flipScaleY = signY * (Math.abs(rawY) * (1 - minScale) + minScale);

      const drawAngle = p.angle + Math.sin(p.wobble) * 0.15;
      this.#drawPetal(ctx, p.x, p.y, p.size, drawAngle, p.hue, flipScaleX, flipScaleY, p.alpha);
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

    p.size   = Math.random() * 6 + 5;
    p.speedY = Math.random() * 0.5 + 0.6;
    p.speedX = (Math.random() - 0.5) * 0.2;
    p.vx     = 0;
    p.vy     = 0;

    p.driftTarget  = 0;
    p.driftTimer   = Math.random() * 100;
    p.driftTargetY = 0;
    p.driftTimerY  = Math.random() * 100;

    p.wobble      = Math.random() * Math.PI * 2;
    p.wobbleSpeed = Math.random() * 0.02 + 0.01;

    const ivx = p.speedX + p.vx;
    p.angle        = (ivx > 0 ? -1 : 1) * (Math.PI / 2) + (Math.random() - 0.5) * 0.5;
    p.spin         = 0;
    p.isVertical   = Math.random() > 0.8;
    p.postureTimer = Math.random() * 200 + 100;

    p.flipPhaseX = Math.random() * Math.PI * 2;
    p.flipSpeedX = Math.random() * 0.06 + 0.04; // 横幅の変動は多め
    p.flipPhaseY = Math.random() * Math.PI * 2;
    p.flipSpeedY = Math.random() * 0.02 + 0.01; // 縦幅の変動は少なめ

    p.hue   = this.#baseHue + (Math.random() * 20 - 10);
    p.alpha = 0.85 * this.#alphaScale;
    return p;
  }

  /**
   * 桜の花びら形状を描画
   */
  #drawPetal(ctx, x, y, size, angle, hue, flipScaleX, flipScaleY, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(flipScaleX, flipScaleY);

    const w = size * 1.5;
    ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo( w * 0.6, -size,  w, size, 0, size);
    ctx.bezierCurveTo(-w, size, -w * 0.6, -size, 0, -size);
    ctx.fill();
    ctx.restore();
  }
}

// AK²Engine に登録
window.BgEffectCherryBlossom = BgEffectCherryBlossom;
