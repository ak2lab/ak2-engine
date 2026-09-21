/**
 * AK²-Engine / effects/projector-flicker.js
 * ============================================
 * 映写機フリッカーエフェクト（ProjectorFlickerEffect）
 *
 * 古い映写機のランプが不安定に揺らぐような、
 * 光度の明滅（チカチカ）を画面全体に再現する。
 * 主に「白系背景」で使用することを想定（暗くなる方向への揺らぎ）。
 * ヴィンテージフィルム（vintage-film.js）と組み合わせて使うと効果的。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --projector-flicker-alpha
 *    明滅の強度係数 0〜2
 *    デフォルト: 1.0（= 標準の揺らぎ幅）
 *    推奨範囲:   0.5（控えめ）〜 1.5（強い揺らぎ）
 *
 * 使い方:
 *  AK2.register(new ProjectorFlickerEffect());
 */
class BgEffectProjectorFlicker {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {number} 現在の明滅強度（正=白く, 負=黒く） */
  #flickerIntensity = 0;

  /** @type {number} 目標の明滅強度 */
  #targetIntensity = 0;

  /**
   * 強度係数 — CSS 変数 --projector-flicker-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.5
   * @type {number}
   */
  #alphaScale = 1.0;

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const a = parseFloat(style.getPropertyValue('--projector-flicker-alpha'));
    if (!isNaN(a)) this.#alphaScale = a;
  }

  onResize(w, h) {
    this.#w = w;
    this.#h = h;
  }

  /**
   * @param {number} dt - 前フレームからの経過ミリ秒
   */
  update(dt) {
    // ランプの不安定さ：主に暗くなる方向へ揺らぐ
    if (Math.random() < 0.15) {
      // 日常的な揺らぎ: -0.05〜+0.01（白背景では暗くなる方向が視認できる）
      this.#targetIntensity = (Math.random() * 0.06 - 0.05) * this.#alphaScale;
    } else if (Math.random() < 0.01) {
      // ごく稀に強めに暗くなる
      this.#targetIntensity = -0.08 * this.#alphaScale;
    } else if (Math.random() < 0.05) {
      // たまに基準値（0 = 変化なし）に戻る
      this.#targetIntensity = 0;
    }

    // 滑らかにターゲットへ追従（フワッとした粘り気）
    this.#flickerIntensity += (this.#targetIntensity - this.#flickerIntensity) * 0.08;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (Math.abs(this.#flickerIntensity) <= 0.001) return;

    const color = this.#flickerIntensity > 0
      ? `rgba(255, 255, 255, ${this.#flickerIntensity})`
      : `rgba(0, 0, 0, ${Math.abs(this.#flickerIntensity)})`;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.#w, this.#h);
  }
}

// AK²Engine に登録
window.BgEffectProjectorFlicker = BgEffectProjectorFlicker;
