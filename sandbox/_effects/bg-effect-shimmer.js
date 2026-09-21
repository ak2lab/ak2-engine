/**
 * AK²-Engine / effects/shimmer.js
 * =================================
 * 煌めきエフェクト（ShimmerEffect）
 *
 * キャンバス上にランダムに星型の光点が瞬く。
 * 高周波のサイン波で高速明滅し、宝石・夜空・高級感の演出に。
 * エレガント・ラグジュアリー・ブライダル系に。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --shimmer-count
 *    光点の数
 *    デフォルト: 55
 *    推奨範囲:   20（点在）〜 100（きらきら）
 *    カードプレビュー用: 15〜25
 *
 *  --shimmer-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大 0.9 の標準輝度）
 *    推奨範囲:   0.5（控えめ）〜 1.0（明るい）
 *
 *  --shimmer-lightness
 *    星の明度 0〜100
 *    デフォルト: 90（白背景では消える）
 *    白背景推奨: 35〜45（暗めで視認性アップ）
 *
 * 使い方:
 *  AK2.register(new ShimmerEffect());
 */
class BgEffectShimmer {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #sparks = [];

  /**
   * 光点の数 — CSS 変数 --shimmer-count で上書き可
   * デフォルト: 37 | 推奨: 15〜80
   * @type {number}
   */
  #count = 37;

  /**
   * アルファ係数 — CSS 変数 --shimmer-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 星の明度 — CSS 変数 --shimmer-lightness で上書き可
   * デフォルト: 90（ダーク背景用白系）| 白背景推奨: 35〜45
   * @type {number}
   */
  #lightness = 90;

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n   = parseInt(style.getPropertyValue('--shimmer-count'));
    const a   = parseFloat(style.getPropertyValue('--shimmer-alpha'));
    const lit = parseFloat(style.getPropertyValue('--shimmer-lightness'));
    if (n > 0)      this.#count      = n;
    if (!isNaN(a))  this.#alphaScale = a;
    if (!isNaN(lit)) this.#lightness = lit;

    this.#generate();
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
    this.#generate();
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    this.#sparks.forEach(s => {
      s.phase += s.freq * dt;
      const raw = Math.abs(Math.sin(s.phase));
      // 閾値以下は完全消灯（「瞬く」ように）
      const newAlpha = raw > 0.7 ? (raw - 0.7) / 0.3 : 0;

      // 消灯タイミングで位置をランダムにリセット（同じ場所が点滅しないように）
      if (s.alpha > 0 && newAlpha === 0) {
        s.x = Math.random() * this.#w;
        s.y = Math.random() * this.#h;
        s.rot = Math.random() * Math.PI / 4;
      }

      // 0.45 の基本係数でトーンを抑制（元の 1.0 から約半分）
      s.alpha = newAlpha * this.#alphaScale * 0.45;
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#sparks.forEach(s => {
      if (s.alpha < 0.01) return; // 非表示なら描画スキップ

      const a = s.alpha;
      const r = s.size;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);

      // 4点星形（クロス）
      ctx.beginPath();
      // 縦線
      ctx.moveTo(0, -r);
      ctx.lineTo(0,  r);
      // 横線
      ctx.moveTo(-r, 0);
      ctx.lineTo( r, 0);
      // 斜め（45°）
      const d = r * 0.5;
      ctx.moveTo(-d, -d);
      ctx.lineTo( d,  d);
      ctx.moveTo( d, -d);
      ctx.lineTo(-d,  d);

      ctx.strokeStyle = `hsla(${s.hue}, 80%, ${this.#lightness}%, ${a})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      // 中心の輝点
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.6);
      g.addColorStop(0, `hsla(${s.hue}, 60%, ${Math.min(98, this.#lightness + 8)}%, ${a})`);
      g.addColorStop(1, `hsla(${s.hue}, 80%, ${this.#lightness}%, 0)`);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.restore();
    });
  }

  // ── 内部処理 ─────────────────────────────────

  #generate() {
    this.#sparks = Array.from({ length: this.#count }, () => ({
      x:     Math.random() * this.#w,
      y:     Math.random() * this.#h,
      size:  2 + Math.random() * 4,
      rot:   Math.random() * Math.PI / 4,   // 0〜45° の傾き
      phase: Math.random() * Math.PI * 2,
      freq:  0.0010 + Math.random() * 0.0018, // 明滅周期：さらに長く・ゆっくり
      hue:   40 + Math.random() * 200,      // 暖色〜青白色
      alpha: 0,
    }));
  }
}

// AK²Engine に登録
window.BgEffectShimmer = BgEffectShimmer;
