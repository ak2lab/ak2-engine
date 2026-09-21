/**
 * AK²-Engine / effects/steam.js
 * ===============================
 * スチーム・煙エフェクト（SteamEffect）
 *
 * 下部から湧き上がる煙が膨張しながら上昇し消えていく。
 * radialGradient でふんわりした煙らしい表現を実現。
 * 温泉・カフェ・モノクロームアート・ドラマチック系に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --steam-count
 *    同時に存在できる最大粒子数
 *    デフォルト: 18
 *    推奨範囲:   8（薄煙）〜 35（濃い煙）
 *    カードプレビュー用: 6〜10
 *
 *  --steam-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大 0.35 の標準輝度）
 *    推奨範囲:   0.5（透明感）〜 1.5（濃い）
 *
 *  --steam-hue
 *    煙の色相 0〜360
 *    デフォルト: 210（青白い蒸気）
 *    推奨例:  0（赤みがかった煙）, 60（黄みがかった煙）, 210（蒸気）
 *
 *  --steam-theme
 *    背景テーマ切替
 *    デフォルト: dark（白系の煙・黒背景向け）
 *    白背景: light（暖かいグレーの煙・白背景で視認可能）
 *
 * 使い方:
 *  AK2.register(new SteamEffect());
 */
class BgEffectSteam {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #puffs = [];

  /** @type {number} 次の粒子生成タイマー（秒） */
  #spawnTimer = 0;

  /**
   * 最大粒子数 — CSS 変数 --steam-count で上書き可
   * デフォルト: 18 | 推奨: 8〜35
   * @type {number}
   */
  #count = 18;

  /**
   * アルファ係数 — CSS 変数 --steam-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 色相 — CSS 変数 --steam-hue で上書き可
   * デフォルト: 210（青白い蒸気）| 推奨: 0〜360
   * @type {number}
   */
  #hue = 210;

  /**
   * テーマ — CSS 変数 --steam-theme で上書き可
   * 'dark'（デフォルト）| 'light'（白背景用）
   * @type {string}
   */
  #theme = 'dark';

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n     = parseInt(style.getPropertyValue('--steam-count'));
    const a     = parseFloat(style.getPropertyValue('--steam-alpha'));
    const hue   = parseFloat(style.getPropertyValue('--steam-hue'));
    const theme = style.getPropertyValue('--steam-theme').trim();
    if (n > 0)         this.#count      = n;
    if (!isNaN(a))     this.#alphaScale = a;
    if (!isNaN(hue))   this.#hue        = hue;
    if (theme === 'light') this.#theme  = 'light';

    // 初期状態として画面内に適度に配置
    for (let i = 0; i < this.#count; i++) {
      this.#puffs.push(this.#createPuff(true));
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
    if (this.#spawnTimer <= 0 && this.#puffs.length < this.#count) {
      this.#puffs.push(this.#createPuff(false));
      this.#spawnTimer = 0.4 + Math.random() * 0.6;
    }

    for (let i = this.#puffs.length - 1; i >= 0; i--) {
      const p = this.#puffs[i];
      p.life -= dts;
      if (p.life <= 0) { this.#puffs.splice(i, 1); continue; }

      const progress = 1 - p.life / p.maxLife; // 0（生まれた直後）〜1（消える直前）

      // 上昇 + ゆらぎ
      p.y  -= p.vy * dts;
      p.x  += Math.sin(p.phase + p.life * 2) * 12 * dts;
      // 膨張
      p.r   = p.baseR * (1 + progress * 2.5);
      // アルファ：出現→最大→消滅
      const peakT = 0.3;
      p.alpha = progress < peakT
        ? progress / peakT
        : 1 - (progress - peakT) / (1 - peakT);
      p.alpha *= 0.35 * this.#alphaScale;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#puffs.forEach(p => {
      if (p.alpha < 0.005) return;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      if (this.#theme === 'light') {
        // 白背景用: 暖かいグレーで視認可能な煙
        g.addColorStop(0,   `hsla(${this.#hue}, 12%, 42%, ${p.alpha})`);
        g.addColorStop(0.5, `hsla(${this.#hue},  8%, 55%, ${p.alpha * 0.5})`);
        g.addColorStop(1,   `hsla(${this.#hue},  5%, 65%, 0)`);
      } else {
        // 暗背景用: 白系の煙
        g.addColorStop(0,   `hsla(${this.#hue}, 20%, 95%, ${p.alpha})`);
        g.addColorStop(0.5, `hsla(${this.#hue}, 15%, 80%, ${p.alpha * 0.5})`);
        g.addColorStop(1,   `hsla(${this.#hue}, 10%, 60%, 0)`);
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });
  }

  // ── 内部処理 ─────────────────────────────────

  /**
   * @param {boolean} randomY - true なら画面内ランダム位置（初期化用）
   */
  #createPuff(randomY = false) {
    const maxLife = 3.0 + Math.random() * 2.0;
    return {
      x:       this.#w * (0.1 + Math.random() * 0.8), // 左右10%マージン
      y:       randomY
                 ? this.#h * (0.3 + Math.random() * 0.7)
                 : this.#h + 20,                        // 画面下から出現
      r:       0,
      baseR:   20 + Math.random() * 30,
      vy:      25 + Math.random() * 35,                 // 上昇速度
      phase:   Math.random() * Math.PI * 2,
      life:    randomY ? Math.random() * maxLife : maxLife,
      maxLife,
      alpha:   0,
    };
  }
}

// AK²Engine に登録
window.BgEffectSteam = BgEffectSteam;
