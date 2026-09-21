/**
 * AK²-Engine / effects/cloud.js
 * ================================
 * 雲の漂いエフェクト（CloudEffect）
 *
 * 大型の半透明グラデーション楕円が横方向にゆっくりと流れる。
 * 複数のレイヤーが重なることで境界の曖昧な雲形を表現。
 * 雲・霧・夢幻・ロマンチック系テーマに。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --cloud-count
 *    同時に存在する雲の数
 *    デフォルト: 8
 *    推奨範囲:   4（疎ら）〜 15（厚い雲）
 *    カードプレビュー用: 4〜6
 *
 *  --cloud-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大 0.30 の標準輝度）
 *    推奨範囲:   0.3（薄霧）〜 2.0（濃い雲）
 *
 *  --cloud-hue
 *    雲の色相 0〜360
 *    デフォルト: 210（青白い雲）
 *    推奨例:  0（夕焼け雲）, 30（オレンジ色の雲）, 280（紫の雲）
 *
 *  --cloud-lightness
 *    雲の明度ベース 0〜100
 *    デフォルト: 90（暗背景向け明るい雲）
 *    白背景推奨: 55〜70（グレー系の雲）
 *
 * 使い方:
 *  AK2.register(new CloudEffect());
 */
class BgEffectCloud {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #clouds = [];

  /** @type {number} 経過時間（秒） */
  #time = 0;

  /**
   * 雲の数 — CSS 変数 --cloud-count で上書き可
   * デフォルト: 8 | 推奨: 4〜15
   * @type {number}
   */
  #count = 8;

  /**
   * アルファ係数 — CSS 変数 --cloud-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜3.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 色相 — CSS 変数 --cloud-hue で上書き可
   * デフォルト: 210（青白い雲）| 推奨: 0〜360
   * @type {number}
   */
  #hue = 210;

  /**
   * 明度ベース — CSS 変数 --cloud-lightness で上書き可
   * デフォルト: 90（暗背景向け）| 白背景推奨: 55〜70
   * @type {number}
   */
  #lightness = 90;

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w    = canvas.width;
    this.#h    = canvas.height;
    this.#time = 0;

    const style = getComputedStyle(document.documentElement);
    const n   = parseInt(style.getPropertyValue('--cloud-count'));
    const a   = parseFloat(style.getPropertyValue('--cloud-alpha'));
    const hue = parseFloat(style.getPropertyValue('--cloud-hue'));
    const lit = parseFloat(style.getPropertyValue('--cloud-lightness'));
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;
    if (!isNaN(hue)) this.#hue      = hue;
    if (!isNaN(lit)) this.#lightness = lit;

    this.#clouds = Array.from({ length: this.#count }, () => this.#createCloud(true));
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
    this.#time += dts;

    this.#clouds.forEach(c => {
      c.x += c.vx * dts;
      // 画面外に出たら反対側から再出現
      if (c.vx > 0 && c.x - c.rx > this.#w) c.x = -c.rx;
      if (c.vx < 0 && c.x + c.rx < 0)       c.x = this.#w + c.rx;
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#clouds.forEach(c => {
      // 呼吸するようなアルファ変動（±30%）
      const breathe = 0.7 + 0.3 * Math.sin(this.#time * c.breathFreq + c.breathPhase);
      const alpha   = c.baseAlpha * this.#alphaScale * breathe;
      if (alpha < 0.003) return;

      // グラデーション中心を楕円の中心（arc の中心）に合わせる
      // ctx.scale(1, c.aspect) 適用中なので user座標での arc 中心は c.y / c.aspect
      // ここを正しく設定しないと「上部だけ輪郭がはっきりする」バグが発生する
      const arcCY = c.y / c.aspect;
      const g = ctx.createRadialGradient(c.x, arcCY, 0, c.x, arcCY, c.rx);
      const L = this.#lightness;
      g.addColorStop(0,    `hsla(${this.#hue}, 20%, ${L + 6}%, ${alpha})`);
      g.addColorStop(0.30, `hsla(${this.#hue}, 16%, ${L}%, ${alpha * 0.75})`);
      g.addColorStop(0.60, `hsla(${this.#hue}, 10%, ${L - 7}%, ${alpha * 0.38})`);
      g.addColorStop(0.85, `hsla(${this.#hue},  6%, ${L - 12}%, ${alpha * 0.10})`);
      g.addColorStop(1,    `hsla(${this.#hue},  4%, ${L - 15}%, 0)`);

      // 横長楕円（雲らしいアスペクト比）
      ctx.save();
      ctx.scale(1, c.aspect); // y軸を圧縮して横長に
      ctx.beginPath();
      ctx.arc(c.x, c.y / c.aspect, c.rx, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    });
  }

  // ── 内部処理 ─────────────────────────────────

  /**
   * @param {boolean} randomX - true なら x をランダム初期化（起動時用）
   */
  #createCloud(randomX = false) {
    const rx = 150 + Math.random() * 220;  // 横方向の半径
    const dir = Math.random() > 0.5 ? 1 : -1;
    return {
      x:           randomX ? Math.random() * this.#w : (dir > 0 ? -rx : this.#w + rx),
      y:           this.#h * (0.05 + Math.random() * 0.65), // 上部 70% に集中
      rx,
      aspect:      0.30 + Math.random() * 0.35,  // 縦横比（横長 = 小さい値）
      vx:          dir * (10 + Math.random() * 15), // 10〜25 px/秒
      baseAlpha:   0.25 + Math.random() * 0.15,   // 各雲の基本透明度（グラデーション修正で見やすく）
      breathFreq:  0.06 + Math.random() * 0.10,   // 呼吸の速さ
      breathPhase: Math.random() * Math.PI * 2,
    };
  }
}

// AK²Engine に登録
window.BgEffectCloud = BgEffectCloud;
