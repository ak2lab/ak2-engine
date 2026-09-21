/**
 * AK²-Engine / effects/ember.js
 * ================================
 * 上昇炎粒エフェクト（EmberEffect）
 *
 * オレンジ色の発光粒子がランダムな位置から現れ、
 * ゆらぎながら上昇し、途中でふわっと消えていく。
 * 炎・ステータスアップ・達成感・エネルギー系の演出に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --ember-count
 *    同時に存在できる最大粒子数
 *    デフォルト: 40
 *    推奨範囲:   15（控えめ）〜 80（活発）
 *    カードプレビュー用: 10〜20
 *
 *  --ember-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大 0.9 の標準輝度）
 *    推奨範囲:   0.4（淡い）〜 1.5（強烈）
 *
 *  --ember-hue
 *    粒子の基本色相 0〜60
 *    デフォルト: 28（オレンジ）
 *    推奨例:  15（赤橙）, 28（オレンジ）, 45（金）, 200（青白い炎）
 *
 *  --ember-theme
 *    背景テーマ切替
 *    デフォルト: dark（lighter合成・黒背景向け）
 *    白背景: light（source-over合成・濃いオレンジ）
 *
 * 使い方:
 *  AK2.register(new EmberEffect());
 */
class BgEffectEmber {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #embers = [];

  /** @type {number} 次の粒子生成タイマー（秒） */
  #spawnTimer = 0;

  /**
   * 最大粒子数 — CSS 変数 --ember-count で上書き可
   * デフォルト: 40 | 推奨: 15〜80
   * @type {number}
   */
  #count = 40;

  /**
   * アルファ係数 — CSS 変数 --ember-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.4〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 基本色相 — CSS 変数 --ember-hue で上書き可
   * デフォルト: 28（オレンジ）| 推奨: 0〜60
   * @type {number}
   */
  #hue = 28;

  /**
   * テーマ — CSS 変数 --ember-theme で上書き可
   * 'dark'（デフォルト）| 'light'（白背景用）
   * @type {string}
   */
  #theme = 'dark';

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n     = parseInt(style.getPropertyValue('--ember-count'));
    const a     = parseFloat(style.getPropertyValue('--ember-alpha'));
    const hue   = parseFloat(style.getPropertyValue('--ember-hue'));
    const theme = style.getPropertyValue('--ember-theme').trim();
    if (n > 0)          this.#count      = n;
    if (!isNaN(a))      this.#alphaScale = a;
    if (!isNaN(hue))    this.#hue        = hue;
    if (theme === 'light') this.#theme   = 'light';

    // 初期状態として画面内に粒子を配置
    const initial = Math.ceil(this.#count * 0.6);
    for (let i = 0; i < initial; i++) {
      const e = this.#createEmber();
      // 初期表示用：寿命をランダムに進めて画面内に分散
      e.life -= Math.random() * e.maxLife * 0.8;
      this.#embers.push(e);
    }
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    const dts = dt / 1000;

    // 新しい粒子を補充
    this.#spawnTimer -= dts;
    if (this.#spawnTimer <= 0 && this.#embers.length < this.#count) {
      this.#embers.push(this.#createEmber());
      this.#spawnTimer = 0.04 + Math.random() * 0.08;
    }

    for (let i = this.#embers.length - 1; i >= 0; i--) {
      const e = this.#embers[i];
      e.life -= dts;
      if (e.life <= 0) { this.#embers.splice(i, 1); continue; }

      const progress = 1 - e.life / e.maxLife; // 0（誕生）→ 1（消滅）

      // 上昇 + サイン波による左右のゆらぎ
      e.y -= e.vy * dts;
      e.x += Math.sin(e.phase + progress * e.wobbleFreq * Math.PI * 2) * e.wobbleAmp * dts;

      // アルファ：前半 20% でフェードイン、後半 30% でフェードアウト
      const fadeIn  = Math.min(1, progress / 0.20);
      const fadeOut = progress < 0.70 ? 1 : Math.max(0, 1 - (progress - 0.70) / 0.30);
      e.alpha = Math.min(fadeIn, fadeOut) * e.maxAlpha * this.#alphaScale;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = this.#theme === 'light' ? 'source-over' : 'lighter';

    this.#embers.forEach(e => {
      if (e.alpha < 0.01) return;

      const progress = 1 - e.life / e.maxLife;
      const hue = this.#hue - progress * 5;

      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size);
      if (this.#theme === 'light') {
        // 白背景用: 濃いオレンジ〜琥珀（lightnesは低く）
        const lightness = 30 + progress * 20;  // 30%（焦げ茶橙）→ 50%（橙）
        g.addColorStop(0,    `hsla(${hue},      100%, ${lightness}%,  ${e.alpha})`);
        g.addColorStop(0.35, `hsla(${hue + 5},  100%, ${lightness - 8}%, ${e.alpha * 0.6})`);
        g.addColorStop(0.75, `hsla(${hue + 10},  80%, 20%, ${e.alpha * 0.2})`);
        g.addColorStop(1,    `hsla(${hue + 15},  70%, 15%, 0)`);
      } else {
        // ダーク背景用: lighter合成前提の明るい色
        const lightness = 55 + progress * 35;  // 55%（橙）→ 90%（白熱）
        g.addColorStop(0,    `hsla(${hue},      100%, ${lightness}%,  ${e.alpha})`);
        g.addColorStop(0.35, `hsla(${hue + 5},  100%, ${lightness - 10}%, ${e.alpha * 0.65})`);
        g.addColorStop(0.75, `hsla(${hue + 10},  95%, 45%, ${e.alpha * 0.25})`);
        g.addColorStop(1,    `hsla(${hue + 15},  90%, 35%, 0)`);
      }

      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });

    ctx.restore();
  }

  // ── 内部処理 ─────────────────────────────────

  #createEmber() {
    const maxLife = 1.5 + Math.random() * 2.5;
    return {
      x:          this.#w * (0.1 + Math.random() * 0.8),
      y:          this.#h * (0.5 + Math.random() * 0.45), // 下半分から出現
      vy:         35 + Math.random() * 55,                 // 上昇速度 px/秒
      size:       2.5 + Math.random() * 4.5,               // 発光半径
      phase:      Math.random() * Math.PI * 2,
      wobbleFreq: 0.8 + Math.random() * 1.2,               // ゆらぎ周期（ライフ比）
      wobbleAmp:  10 + Math.random() * 20,                 // ゆらぎ幅 px/秒
      maxAlpha:   0.65 + Math.random() * 0.35,
      life:       maxLife,
      maxLife,
      alpha:      0,
    };
  }
}

// AK²Engine に登録
window.BgEffectEmber = BgEffectEmber;
