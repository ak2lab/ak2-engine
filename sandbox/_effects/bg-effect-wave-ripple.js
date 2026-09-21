/**
 * AK²-Engine / effects/wave-ripple.js
 * =====================================
 * 水の波紋エフェクト（WaveRippleEffect）
 *
 * ランダムな座標から同心円状の波紋が自動的に広がり消えていく。
 * 複数の波紋が重なることで水面に石を投げたような自然な演出。
 * 水・癒やし・スパ・リゾート系テーマに。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --wave-ripple-count
 *    同時に存在できる最大波紋数
 *    デフォルト: 6
 *    推奨範囲:   3（静かな水面）〜 12（活発な水面）
 *    カードプレビュー用: 3〜5
 *
 *  --wave-ripple-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大 0.5 の標準輝度）
 *    推奨範囲:   0.5（淡い）〜 2.0（濃い）
 *
 *  --wave-ripple-hue
 *    波紋の色相 0〜360
 *    デフォルト: 200（青い水）
 *    推奨例:  170（エメラルド）, 200（海）, 220（深海）
 *
 * 使い方:
 *  AK2.register(new WaveRippleEffect());
 */
class BgEffectWaveRipple {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #rings = [];

  /** @type {number} 次の波紋生成タイマー（秒） */
  #spawnTimer = 0;

  /**
   * 最大波紋数 — CSS 変数 --wave-ripple-count で上書き可
   * デフォルト: 6 | 推奨: 3〜12
   * @type {number}
   */
  #count = 6;

  /**
   * アルファ係数 — CSS 変数 --wave-ripple-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜2.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 色相 — CSS 変数 --wave-ripple-hue で上書き可
   * デフォルト: 200（青い水）| 推奨: 0〜360
   * @type {number}
   */
  #hue = 200;

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n   = parseInt(style.getPropertyValue('--wave-ripple-count'));
    const a   = parseFloat(style.getPropertyValue('--wave-ripple-alpha'));
    const hue = parseFloat(style.getPropertyValue('--wave-ripple-hue'));
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;
    if (!isNaN(hue)) this.#hue      = hue;

    // 初期状態として画面内に波紋を配置
    const initial = Math.ceil(this.#count / 2);
    for (let i = 0; i < initial; i++) {
      this.#rings.push(this.#createRing(true));
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

    // 新しい波紋を補充
    this.#spawnTimer -= dts;
    if (this.#spawnTimer <= 0 && this.#rings.length < this.#count) {
      this.#rings.push(this.#createRing(false));
      this.#spawnTimer = 0.8 + Math.random() * 1.5;
    }

    for (let i = this.#rings.length - 1; i >= 0; i--) {
      const r = this.#rings[i];
      r.radius += r.speed * dts;
      // 線形フェードアウト（広がるほど消える）
      r.alpha = Math.max(0, 1 - r.radius / r.maxR);
      if (r.alpha <= 0) this.#rings.splice(i, 1);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#rings.forEach(r => {
      if (r.alpha < 0.01) return;

      const a = r.alpha * this.#alphaScale * 0.5;
      const lw = Math.max(0.5, (1 - r.radius / r.maxR) * 2.5);

      // 外側リング
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${this.#hue}, 60%, 70%, ${a})`;
      ctx.lineWidth   = lw;
      ctx.stroke();

      // 内側サブリング（外側の 60% の大きさ）
      if (r.radius > 20) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${this.#hue}, 70%, 80%, ${a * 0.4})`;
        ctx.lineWidth   = lw * 0.5;
        ctx.stroke();
      }
    });
  }

  // ── 内部処理 ─────────────────────────────────

  /**
   * @param {boolean} randomR - true なら半径をランダムに初期化（初期化用）
   */
  #createRing(randomR = false) {
    const maxR = 100 + Math.random() * 150;
    return {
      x:      this.#w * (0.1 + Math.random() * 0.8),
      y:      this.#h * (0.1 + Math.random() * 0.8),
      radius: randomR ? Math.random() * maxR : 0,
      maxR,
      speed:  40 + Math.random() * 45,   // 拡張速度 px/秒
      alpha:  0,
    };
  }
}

// AK²Engine に登録
window.BgEffectWaveRipple = BgEffectWaveRipple;
