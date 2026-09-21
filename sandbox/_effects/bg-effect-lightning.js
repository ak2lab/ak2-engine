/**
 * AK²-Engine / effects/lightning.js
 * ====================================
 * 稲妻エフェクト（LightningEffect）
 *
 * 分岐するボルトが瞬間的に閃光し消えていく。
 * ミッドポイント変位法でジャギーな稲妻形状を生成。
 * 火花（Sparks）とは別の独立したエフェクト。
 * テクノロジー・エネルギー・嵐・SFテーマに。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --lightning-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大輝度）
 *    推奨範囲:   0.4（控えめ）〜 1.5（強烈）
 *
 *  --lightning-hue
 *    稲妻の色相 0〜360
 *    デフォルト: 240（青白い）
 *    推奨例:  60（黄）, 180（シアン）, 280（紫）
 *
 *  --lightning-interval
 *    閃光の平均間隔（秒）
 *    デフォルト: 2.5
 *    推奨範囲:   0.8（頻繁）〜 6.0（まれ）
 *    カードプレビュー用: 1.0〜2.0
 *
 *  --lightning-theme
 *    背景テーマ切替
 *    デフォルト: dark（lighter合成・黒背景向け）
 *    白背景: light（source-over合成・暗いグレー）
 *
 * 使い方:
 *  AK2.register(new LightningEffect());
 */
class BgEffectLightning {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} アクティブな稲妻ボルト */
  #bolts = [];

  /** @type {number} 経過時間（秒） */
  #timer = 0;

  /** @type {number} 次の閃光までの秒数 */
  #nextFlash = 1.0;

  /**
   * アルファ係数 — CSS 変数 --lightning-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.4〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 色相 — CSS 変数 --lightning-hue で上書き可
   * デフォルト: 240（青白い稲妻）| 推奨: 0〜360
   * @type {number}
   */
  #hue = 240;

  /**
   * 閃光間隔の中央値（秒） — CSS 変数 --lightning-interval で上書き可
   * デフォルト: 2.5 | 推奨: 0.8〜6.0
   * @type {number}
   */
  #interval = 2.5;

  /**
   * テーマ — CSS 変数 --lightning-theme で上書き可
   * 'dark'（デフォルト）| 'light'（白背景用）
   * @type {string}
   */
  #theme = 'dark';

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const a     = parseFloat(style.getPropertyValue('--lightning-alpha'));
    const h     = parseFloat(style.getPropertyValue('--lightning-hue'));
    const inv   = parseFloat(style.getPropertyValue('--lightning-interval'));
    const theme = style.getPropertyValue('--lightning-theme').trim();
    if (!isNaN(a))         this.#alphaScale = a;
    if (!isNaN(h))         this.#hue        = h;
    if (!isNaN(inv))       this.#interval   = inv;
    if (theme === 'light') this.#theme      = 'light';

    // 初回フラッシュは少し早め
    this.#nextFlash = 0.5 + Math.random() * 1.0;
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

    // 閃光タイミング判定
    this.#timer += dts;
    if (this.#timer >= this.#nextFlash) {
      this.#timer = 0;
      // ランダムな間隔：平均 #interval 秒、±50% の変動
      this.#nextFlash = this.#interval * (0.5 + Math.random());
      this.#spawnBolt();
      // 20% の確率でダブルフラッシュ（続けてもう一本）
      if (Math.random() < 0.2) {
        setTimeout(() => this.#spawnBolt(), 80 + Math.random() * 120);
      }
    }

    // ボルトのフェードアウト
    for (let i = this.#bolts.length - 1; i >= 0; i--) {
      const b = this.#bolts[i];
      b.age += dts;
      b.alpha = Math.max(0, 1 - b.age / b.lifetime);
      if (b.alpha <= 0) this.#bolts.splice(i, 1);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.#bolts.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = this.#theme === 'light' ? 'source-over' : 'lighter';

    this.#bolts.forEach(b => {
      if (b.alpha < 0.01) return;

      const a = b.alpha * this.#alphaScale;

      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';

      if (this.#theme === 'light') {
        // 白背景用: 暗いグレー/紺
        ctx.strokeStyle = `hsla(${this.#hue}, 50%, 25%, ${a * 0.25})`;
        ctx.lineWidth   = 5;
        this.#drawSegments(ctx, b.segments);

        ctx.strokeStyle = `hsla(${this.#hue}, 60%, 35%, ${a * 0.65})`;
        ctx.lineWidth   = 1.5;
        this.#drawSegments(ctx, b.segments);

        ctx.strokeStyle = `hsla(${this.#hue}, 40%, 20%, ${a * 0.85})`;
        ctx.lineWidth   = 0.5;
        this.#drawSegments(ctx, b.segments);
      } else {
        // ダーク背景用: lighter合成前提の明るい色
        ctx.strokeStyle = `hsla(${this.#hue}, 80%, 75%, ${a * 0.35})`;
        ctx.lineWidth   = 5;
        this.#drawSegments(ctx, b.segments);

        ctx.strokeStyle = `hsla(${this.#hue}, 70%, 88%, ${a * 0.7})`;
        ctx.lineWidth   = 1.5;
        this.#drawSegments(ctx, b.segments);

        ctx.strokeStyle = `hsla(${this.#hue}, 20%, 98%, ${a * 0.9})`;
        ctx.lineWidth   = 0.5;
        this.#drawSegments(ctx, b.segments);
      }
    });

    ctx.restore();
  }

  // ── 内部処理 ─────────────────────────────────

  /**
   * セグメント配列を一括描画
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array<object>} segments
   */
  #drawSegments(ctx, segments) {
    ctx.beginPath();
    segments.forEach(s => {
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    });
    ctx.stroke();
  }

  /**
   * 新しいボルトを生成
   */
  #spawnBolt() {
    // スタート位置: キャンバス内ランダム（端から10%の余白）
    const startX = this.#w * (0.1 + Math.random() * 0.8);
    const startY = this.#h * (0.1 + Math.random() * 0.8);

    // 進行方向: キャンバス中央→スタート位置 のベクトルを延長（外側へ）
    const cx    = this.#w / 2;
    const cy    = this.#h / 2;
    const angle = Math.atan2(startY - cy, startX - cx);
    const dist  = Math.min(this.#w, this.#h) * (0.2 + Math.random() * 0.3);
    const endX  = startX + Math.cos(angle) * dist;
    const endY  = startY + Math.sin(angle) * dist;

    const roughness = Math.min(this.#w, this.#h) * 0.12;
    const segments  = [];
    this.#buildBolt(startX, startY, endX, endY, 4, segments, roughness);

    this.#bolts.push({
      segments,
      alpha:    1.0,
      age:      0,
      lifetime: 0.10 + Math.random() * 0.20,
    });
  }

  /**
   * ミッドポイント変位法でボルトを再帰的に分割
   * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
   * @param {number} depth @param {Array<object>} segs @param {number} rough 変位量
   */
  #buildBolt(x1, y1, x2, y2, depth, segs, rough) {
    if (depth === 0) {
      segs.push({ x1, y1, x2, y2 });
      return;
    }

    // 中間点をランダムに変位（任意方向のボルトに対応した等方変位）
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * rough;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * rough;

    this.#buildBolt(x1, y1, mx, my, depth - 1, segs, rough * 0.6);
    this.#buildBolt(mx, my, x2, y2, depth - 1, segs, rough * 0.6);

    // ランダムなサブブランチ（30% の確率 × depth が深い時のみ）
    if (depth >= 2 && Math.random() < 0.35) {
      const bx = mx + (Math.random() > 0.5 ? 1 : -1) * rough * (0.8 + Math.random() * 0.8);
      const by = my + (y2 - y1) * (0.2 + Math.random() * 0.4);
      this.#buildBolt(mx, my, bx, by, depth - 2, segs, rough * 0.45);
    }
  }
}

// AK²Engine に登録
window.BgEffectLightning = BgEffectLightning;
