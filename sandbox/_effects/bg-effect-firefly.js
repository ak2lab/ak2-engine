/**
 * FireflyEffect / firefly.js
 * ==========================
 * 蛍の光 — 有機的な明滅を持つ蛍エフェクト
 *
 * 特徴:
 *  - Math.sin() によるサイン波で個別の明滅フェーズを管理
 *  - radialGradient + globalCompositeOperation:'lighter' で発光表現
 *  - オフスクリーン canvas で残像（トレイル）を維持
 *  - CSS 変数でページ側から外観を制御可能（JS 無編集）
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --firefly-hue      : 色相 0〜360（デフォルト 75 = 黄緑）
 *  --firefly-density  : 密度 粒子/px²（デフォルト 0.000018）
 *  --firefly-alpha    : 最大輝度 0〜1（デフォルト 0.40）
 *  --firefly-trail    : 残像フェード係数 0〜1（デフォルト 0.35）
 *  --firefly-theme    : 'light' で白背景モード（source-over・暗い黄金色）
 *
 *  例（紫の蛍、ごく控えめ）:
 *    :root {
 *      --firefly-hue:     270;
 *      --firefly-density: 0.000012;
 *      --firefly-alpha:   0.3;
 *    }
 *
 * ── JS オプション ──────────────────────────────────
 *
 *  interactive: true|false  マウスへの反応（デフォルト true）
 *
 * 使い方:
 *  AK2.register(new FireflyEffect());
 *  AK2.register(new FireflyEffect({ interactive: false }));
 */

/* ----------------------------------------------------------------
   Firefly（個体）
---------------------------------------------------------------- */
class Firefly {
  #x; #y; #vx; #vy;
  #baseRadius; #maxRadius;
  #hue; #maxAlpha;
  #alpha; #blinkPhase; #blinkSpeed;
  #canvasWidth; #canvasHeight;

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w      - canvas 幅
   * @param {number} h      - canvas 高さ
   * @param {number} hue    - CSS 色相 0〜360
   * @param {number} maxAlpha - 最大輝度 0〜1
   */
  #lightMode;

  constructor(x, y, w, h, hue, maxAlpha, lightMode = false) {
    this.#canvasWidth  = w;
    this.#canvasHeight = h;
    this.#x = x;
    this.#y = y;
    this.#vx = (Math.random() - 0.5) * 0.5;
    this.#vy = (Math.random() - 0.5) * 0.5;
    this.#baseRadius   = Math.random() * 2 + 1;
    this.#maxRadius    = this.#baseRadius * (Math.random() * 4 + 3);
    this.#hue          = hue;
    this.#maxAlpha     = maxAlpha;
    this.#blinkPhase   = Math.random() * Math.PI * 2;
    this.#blinkSpeed   = Math.random() * 0.002 + 0.001;
    this.#alpha        = 0;
    this.#lightMode    = lightMode;
  }

  /**
   * @param {number} dt       - 経過ミリ秒
   * @param {number|null} mouseX
   * @param {number|null} mouseY
   */
  update(dt, mouseX, mouseY) {
    this.#x += this.#vx;
    this.#y += this.#vy;

    // 画面端ループ
    const r = this.#maxRadius;
    if (this.#x < -r)                    this.#x = this.#canvasWidth  + r;
    if (this.#x > this.#canvasWidth  + r) this.#x = -r;
    if (this.#y < -r)                    this.#y = this.#canvasHeight + r;
    if (this.#y > this.#canvasHeight + r) this.#y = -r;

    // マウスインタラクション（穏やかな反発 + 輝度アップ）
    let interactionFactor = 1;
    if (mouseX !== null && mouseY !== null) {
      const dx   = mouseX - this.#x;
      const dy   = mouseY - this.#y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 180;
      if (dist < maxDist && dist > 0) {
        const force = (maxDist - dist) / maxDist;
        this.#vx -= (dx / dist) * force * 0.06;
        this.#vy -= (dy / dist) * force * 0.06;
        const speed = Math.sqrt(this.#vx * this.#vx + this.#vy * this.#vy);
        if (speed > 1.8) {
          this.#vx = (this.#vx / speed) * 1.8;
          this.#vy = (this.#vy / speed) * 1.8;
        }
        interactionFactor = 1 + force * 1.5;
      }
    }

    // 明滅（サイン波）
    this.#blinkPhase += this.#blinkSpeed * dt;
    const sineAlpha = (Math.sin(this.#blinkPhase) + 1) / 2; // 0〜1
    // maxAlpha を上限として明滅。最暗部は maxAlpha*0.1 程度
    this.#alpha = Math.min(1, (0.1 + sineAlpha * 0.9) * this.#maxAlpha * interactionFactor);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const r = this.#maxRadius;
    const g = ctx.createRadialGradient(this.#x, this.#y, 0, this.#x, this.#y, r);
    if (this.#lightMode) {
      // 白背景用: 暗い黄金/琥珀色
      g.addColorStop(0,   `hsla(${this.#hue}, 85%, 35%, ${this.#alpha})`);
      g.addColorStop(0.3, `hsla(${this.#hue}, 90%, 45%, ${this.#alpha * 0.5})`);
      g.addColorStop(1,   `hsla(${this.#hue}, 80%, 30%, 0)`);
    } else {
      g.addColorStop(0,   `hsla(${this.#hue}, 80%, 90%, ${this.#alpha})`);
      g.addColorStop(0.2, `hsla(${this.#hue}, 100%, 60%, ${this.#alpha * 0.6})`);
      g.addColorStop(1,   `hsla(${this.#hue}, 100%, 40%, 0)`);
    }
    ctx.beginPath();
    ctx.arc(this.#x, this.#y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}


/* ----------------------------------------------------------------
   FireflyEffect（エンジン登録クラス）
---------------------------------------------------------------- */
class BgEffectFirefly {
  #canvas; #ctx;
  #width  = 0;
  #height = 0;
  #fireflies = [];
  #mouseX = null;
  #mouseY = null;
  #isInteractive;

  // CSS 変数から読み込む設定（init 時に確定）
  #hue        = 75;
  #density    = 0.000009; // 背景用デフォルト：1080p で約 18 個
  #maxAlpha   = 0.40;     // 控えめな輝度
  #trailAlpha = 0.35;     // 残像フェード係数（大きいほど尾が短い）
  #theme      = 'dark';   // 'dark' | 'light'

  // AK2Engine は毎フレーム clearRect するため、残像はオフスクリーン canvas で維持
  #trailCanvas = null;
  #trailCtx    = null;

  /** @param {{ interactive?: boolean }} options */
  constructor(options = {}) {
    this.#isInteractive = options.interactive !== undefined ? options.interactive : true;
  }

  // ── AK²Engine インターフェイス ─────────────────

  /** @param {HTMLCanvasElement} canvas @param {CanvasRenderingContext2D} ctx */
  init(canvas, ctx) {
    this.#canvas = canvas;
    this.#ctx    = ctx;
    this.#width  = canvas.width;
    this.#height = canvas.height;

    // CSS 変数から設定を読み込む（ページ側で :root { --firefly-* } で上書き可能）
    const style = getComputedStyle(document.documentElement);
    const cssHue     = parseFloat(style.getPropertyValue('--firefly-hue'));
    const cssDensity = parseFloat(style.getPropertyValue('--firefly-density'));
    const cssAlpha   = parseFloat(style.getPropertyValue('--firefly-alpha'));
    const cssTrail   = parseFloat(style.getPropertyValue('--firefly-trail'));
    const cssTheme   = style.getPropertyValue('--firefly-theme').trim();
    if (!isNaN(cssHue))       this.#hue        = cssHue;
    if (!isNaN(cssDensity))   this.#density    = cssDensity;
    if (!isNaN(cssAlpha))     this.#maxAlpha   = cssAlpha;
    if (!isNaN(cssTrail))     this.#trailAlpha = cssTrail;
    if (cssTheme === 'light') this.#theme      = 'light';

    this.#createTrailCanvas();
    this.#generateFireflies();
    this.#bindEvents();
  }

  /** @param {number} dt */
  update(dt) {
    this.#fireflies.forEach(f => f.update(dt, this.#mouseX, this.#mouseY));
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (this.#theme === 'light') {
      // 白背景用: destination-out でトレイルを透明フェード
      this.#trailCtx.globalCompositeOperation = 'destination-out';
      this.#trailCtx.fillStyle = `rgba(0, 0, 0, ${this.#trailAlpha})`;
      this.#trailCtx.fillRect(0, 0, this.#width, this.#height);
      this.#trailCtx.globalCompositeOperation = 'source-over';

      this.#fireflies.forEach(f => f.draw(this.#trailCtx));
    } else {
      // ダーク背景用: 暗い塗りつぶしでトレイル + lighter合成
      this.#trailCtx.globalCompositeOperation = 'source-over';
      this.#trailCtx.fillStyle = `rgba(5, 8, 10, ${this.#trailAlpha})`;
      this.#trailCtx.fillRect(0, 0, this.#width, this.#height);

      this.#trailCtx.globalCompositeOperation = 'lighter';
      this.#fireflies.forEach(f => f.draw(this.#trailCtx));
      this.#trailCtx.globalCompositeOperation = 'source-over';
    }

    // メイン canvas に転写
    ctx.drawImage(this.#trailCanvas, 0, 0);
  }

  /** @param {number} w @param {number} h */
  onResize(w, h) {
    this.#width  = w;
    this.#height = h;
    if (this.#trailCanvas) {
      this.#trailCanvas.width  = w;
      this.#trailCanvas.height = h;
    }
    this.#fireflies = [];
    this.#generateFireflies();
  }

  // ── ユーティリティ ────────────────────────────────

  #createTrailCanvas() {
    this.#trailCanvas = document.createElement('canvas');
    this.#trailCanvas.width  = this.#width;
    this.#trailCanvas.height = this.#height;
    this.#trailCtx = this.#trailCanvas.getContext('2d');
  }

  #generateFireflies() {
    const count     = Math.max(1, Math.floor(this.#width * this.#height * this.#density));
    const lightMode = this.#theme === 'light';
    for (let i = 0; i < count; i++) {
      this.#fireflies.push(new Firefly(
        Math.random() * this.#width,
        Math.random() * this.#height,
        this.#width, this.#height,
        this.#hue, this.#maxAlpha, lightMode
      ));
    }
  }

  #bindEvents() {
    window.addEventListener('pointermove', (e) => {
      if (!this.#isInteractive) return;
      this.#mouseX = e.clientX;
      this.#mouseY = e.clientY;
    });
    window.addEventListener('pointerout', () => {
      this.#mouseX = null;
      this.#mouseY = null;
    });
  }

  setInteractive(state) {
    this.#isInteractive = !!state;
    if (!this.#isInteractive) { this.#mouseX = null; this.#mouseY = null; }
  }

  get isInteractive() { return this.#isInteractive; }
}

// AK²Engine に登録
window.BgEffectFirefly = BgEffectFirefly;
