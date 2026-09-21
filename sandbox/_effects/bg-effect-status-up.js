/**
 * AK²-Engine / effects/status-up.js
 * =====================================
 * ステータスアップエフェクト（StatusUpEffect）
 *
 * I字型の縦長の光の棒が画面下部からまっすぐ上へ上昇する。
 * 上端は明るく、下方向へグラデーションで消えていく。
 * ゲームのバフ・ステータスアップ・パワーアップ・達成感の演出に。
 * 上昇炎粒（Ember）がゆらぎながら上昇するのに対し、
 * こちらは直線的にまっすぐ上昇する。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --status-up-count
 *    同時に存在できる最大バー数
 *    デフォルト: 35
 *    推奨範囲:   10（控えめ）〜 70（派手）
 *    カードプレビュー用: 12〜20
 *
 *  --status-up-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大 0.9 の標準輝度）
 *    推奨範囲:   0.4（淡い）〜 1.5（強烈）
 *
 *  --status-up-hue
 *    バーの基本色相 0〜360
 *    デフォルト: 40（黄オレンジ）
 *    推奨例:  28（オレンジ）, 40（黄金）, 60（黄）, 120（緑・HP回復系）
 *
 *  --status-up-theme
 *    背景テーマ切替
 *    デフォルト: dark（lighter合成・黒背景向け）
 *    白背景: light（source-over合成・濃いオレンジ）
 *
 * 使い方:
 *  AK2.register(new StatusUpEffect());
 */
class BgEffectStatusUp {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #bars = [];

  /** @type {number} 次の粒子生成タイマー（秒） */
  #spawnTimer = 0;

  /**
   * 最大バー数 — CSS 変数 --status-up-count で上書き可
   * デフォルト: 35 | 推奨: 10〜70
   * @type {number}
   */
  #count = 35;

  /**
   * アルファ係数 — CSS 変数 --status-up-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.4〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 基本色相 — CSS 変数 --status-up-hue で上書き可
   * デフォルト: 40（黄オレンジ）| 推奨: 0〜360
   * @type {number}
   */
  #hue = 40;

  /**
   * テーマ — CSS 変数 --status-up-theme で上書き可
   * 'dark'（デフォルト）| 'light'（白背景用）
   * @type {string}
   */
  #theme = 'dark';

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n     = parseInt(style.getPropertyValue('--status-up-count'));
    const a     = parseFloat(style.getPropertyValue('--status-up-alpha'));
    const hue   = parseFloat(style.getPropertyValue('--status-up-hue'));
    const theme = style.getPropertyValue('--status-up-theme').trim();
    if (n > 0)           this.#count      = n;
    if (!isNaN(a))       this.#alphaScale = a;
    if (!isNaN(hue))     this.#hue        = hue;
    if (theme === 'light') this.#theme    = 'light';

    // 初期状態として画面内に分散配置
    const initial = Math.ceil(this.#count * 0.6);
    for (let i = 0; i < initial; i++) {
      const b = this.#createBar();
      // ランダムに上昇途中の状態から開始
      b.life -= Math.random() * b.maxLife * 0.9;
      this.#bars.push(b);
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

    // 新しいバーを補充
    this.#spawnTimer -= dts;
    if (this.#spawnTimer <= 0 && this.#bars.length < this.#count) {
      this.#bars.push(this.#createBar());
      this.#spawnTimer = 0.05 + Math.random() * 0.12;
    }

    for (let i = this.#bars.length - 1; i >= 0; i--) {
      const b = this.#bars[i];
      b.life -= dts;
      if (b.life <= 0) { this.#bars.splice(i, 1); continue; }

      const progress = 1 - b.life / b.maxLife; // 0（誕生）→ 1（消滅）

      // まっすぐ上昇（横揺れなし）
      b.y -= b.vy * dts;

      // アルファ：最初の15%でフェードイン、最後の25%でフェードアウト
      const fadeIn  = Math.min(1, progress / 0.15);
      const fadeOut = progress < 0.75 ? 1 : Math.max(0, 1 - (progress - 0.75) / 0.25);
      b.alpha = Math.min(fadeIn, fadeOut) * b.maxAlpha * this.#alphaScale;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.#bars.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = this.#theme === 'light' ? 'source-over' : 'lighter';

    this.#bars.forEach(b => {
      if (b.alpha < 0.01) return;

      const hue  = this.#hue;
      const topY    = b.y - b.h;
      const bottomY = b.y;

      if (this.#theme === 'light') {
        // 白背景用: 濃いオレンジ/琥珀（source-over）
        const gGlow = ctx.createLinearGradient(b.x, topY, b.x, bottomY);
        gGlow.addColorStop(0,   `hsla(${hue + 15}, 80%, 30%, ${b.alpha * 0.3})`);
        gGlow.addColorStop(0.5, `hsla(${hue},      80%, 25%, ${b.alpha * 0.15})`);
        gGlow.addColorStop(1,   `hsla(${hue - 10}, 70%, 20%, 0)`);
        ctx.fillStyle = gGlow;
        ctx.fillRect(b.x - b.w * 3, topY, b.w * 6, b.h);

        const gCore = ctx.createLinearGradient(b.x, topY, b.x, bottomY);
        gCore.addColorStop(0,    `hsla(${hue + 20}, 90%, 40%, ${b.alpha})`);
        gCore.addColorStop(0.30, `hsla(${hue + 10}, 90%, 35%, ${b.alpha * 0.9})`);
        gCore.addColorStop(0.65, `hsla(${hue},      90%, 30%, ${b.alpha * 0.6})`);
        gCore.addColorStop(1,    `hsla(${hue - 10}, 80%, 20%, 0)`);
        ctx.fillStyle = gCore;
        ctx.fillRect(b.x - b.w / 2, topY, b.w, b.h);
      } else {
        // ダーク背景用: lighter合成前提の明るい色
        const gGlow = ctx.createLinearGradient(b.x, topY, b.x, bottomY);
        gGlow.addColorStop(0,   `hsla(${hue + 30}, 100%, 90%, ${b.alpha * 0.4})`);
        gGlow.addColorStop(0.5, `hsla(${hue + 10}, 100%, 70%, ${b.alpha * 0.2})`);
        gGlow.addColorStop(1,   `hsla(${hue},      100%, 55%, 0)`);
        ctx.fillStyle = gGlow;
        ctx.fillRect(b.x - b.w * 3, topY, b.w * 6, b.h);

        const gCore = ctx.createLinearGradient(b.x, topY, b.x, bottomY);
        gCore.addColorStop(0,    `hsla(${hue + 40}, 100%, 98%, ${b.alpha})`);
        gCore.addColorStop(0.25, `hsla(${hue + 20}, 100%, 85%, ${b.alpha * 0.95})`);
        gCore.addColorStop(0.60, `hsla(${hue},      100%, 65%, ${b.alpha * 0.7})`);
        gCore.addColorStop(1,    `hsla(${hue - 10}, 100%, 45%, 0)`);
        ctx.fillStyle = gCore;
        ctx.fillRect(b.x - b.w / 2, topY, b.w, b.h);
      }
    });

    ctx.restore();
  }

  // ── 内部処理 ─────────────────────────────────

  #createBar() {
    const maxLife = 1.2 + Math.random() * 2.0;
    return {
      x:        this.#w * (0.05 + Math.random() * 0.9),       // 画面横幅いっぱいに分散
      y:        this.#h * (0.15 + Math.random() * 0.95),      // ランダムな高さから出現
      vy:       55 + Math.random() * 65,                       // 上昇速度 px/秒（均一な速さ）
      w:        1.5 + Math.random() * 1.5,                     // バー幅（細い: 1.5〜3px）
      h:        20 + Math.random() * 35,                       // バー高さ（I字の長さ）
      maxAlpha: 0.35 + Math.random() * 0.15,                   // alpha を半分に抑制
      life:     maxLife,
      maxLife,
      alpha:    0,
    };
  }
}

// AK²Engine に登録
window.BgEffectStatusUp = BgEffectStatusUp;
