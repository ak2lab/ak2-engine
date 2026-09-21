/**
 * AK²-Engine / effects/star-speed.js
 * =====================================
 * 光速移動エフェクト（StarSpeedEffect）
 *
 * 中央の焦点から放射状に伸びる光の線が高速で飛び去る。
 * 透視投影で遠くは細く遅く、近くは太く速い。
 * 宇宙旅行・ワープ・テクノロジー・SFテーマに。
 *
 * ── CSS 変数による設定 ─────────────────────────────
 *
 *  --star-speed-count
 *    星の数
 *    デフォルト: 120
 *    推奨範囲:   60（疎ら）〜 200（密度高）
 *    カードプレビュー用: 40〜70
 *
 *  --star-speed-alpha
 *    アルファ係数 0〜1
 *    デフォルト: 1.0（= 最大 0.8 の標準輝度）
 *    推奨範囲:   0.5〜1.0
 *
 *  --star-speed-velocity
 *    飛行速度の係数（大きいほど速い）
 *    デフォルト: 0.25
 *    推奨範囲:   0.1（超スロー）〜 1.0（高速）〜 2.5（超高速）
 *
 *  --star-speed-invert
 *    白背景モード（1 を設定すると星色を暗い紺系に切替）
 *    デフォルト: 0（= 白/青白）
 *    白背景推奨: 1
 *
 * 使い方:
 *  AK2.register(new StarSpeedEffect());
 */
class BgEffectStarSpeed {

  /** @type {number} */
  #w = 0;

  /** @type {number} */
  #h = 0;

  /** @type {Array<object>} */
  #stars = [];

  /**
   * 星の数 — CSS 変数 --star-speed-count で上書き可
   * デフォルト: 120 | 推奨: 60〜200
   * @type {number}
   */
  #count = 120;

  /**
   * アルファ係数 — CSS 変数 --star-speed-alpha で上書き可
   * デフォルト: 1.0 | 推奨: 0.5〜1.0
   * @type {number}
   */
  #alphaScale = 1.0;

  /**
   * 速度係数 — CSS 変数 --star-speed-velocity で上書き可
   * デフォルト: 0.12 | 推奨: 0.05〜0.5（1.0 で高速・2.5 で超高速）
   * @type {number}
   */
  #velocity = 0.12;

  /**
   * 白背景モード — CSS 変数 --star-speed-invert で上書き可
   * デフォルト: false（白/青白）| 白背景: true（暗い紺系）
   * @type {boolean}
   */
  #invert = false;

  // ── AK²Engine インターフェイス ─────────────────

  init(canvas, _ctx) {
    this.#w = canvas.width;
    this.#h = canvas.height;

    const style = getComputedStyle(document.documentElement);
    const n   = parseInt(style.getPropertyValue('--star-speed-count'));
    const a   = parseFloat(style.getPropertyValue('--star-speed-alpha'));
    const v   = parseFloat(style.getPropertyValue('--star-speed-velocity'));
    const inv = style.getPropertyValue('--star-speed-invert').trim();
    if (n > 0)     this.#count      = n;
    if (!isNaN(a)) this.#alphaScale = a;
    if (!isNaN(v)) this.#velocity   = v;
    if (inv === '1') this.#invert   = true;

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
    const dts = dt / 1000;
    const cx  = this.#w / 2;
    const cy  = this.#h / 2;

    this.#stars.forEach(s => {
      // 透視投影：z が小さいほど速く動く
      s.z -= dts * s.speed * this.#velocity;

      if (s.z <= 0.01) {
        this.#resetStar(s);
        return;
      }

      // 3D→2D 投影
      const scale  = 400 / s.z;
      s.prevX = s.screenX;
      s.prevY = s.screenY;
      s.screenX = cx + s.x * scale;
      s.screenY = cy + s.y * scale;
      s.lineW   = Math.max(0.3, (1 - s.z / 1000) * 2);
      s.alpha   = Math.max(0, (1 - s.z / 1000)) * this.#alphaScale;
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const cx = this.#w / 2;
    const cy = this.#h / 2;

    this.#stars.forEach(s => {
      if (s.alpha < 0.02) return;
      if (s.prevX === null) return;

      // 線の長さ（前フレームの位置から現フレームの位置）
      const dx = s.screenX - cx;
      const dy = s.screenY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 中心付近はドット、外側は線
      if (dist < 3) {
        ctx.beginPath();
        ctx.arc(s.screenX, s.screenY, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${s.alpha * 0.5})`;
        ctx.fill();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(s.prevX, s.prevY);
      ctx.lineTo(s.screenX, s.screenY);
      ctx.strokeStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${s.alpha})`;
      ctx.lineWidth   = s.lineW;
      ctx.stroke();
    });
  }

  // ── 内部処理 ─────────────────────────────────

  #generate() {
    this.#stars = Array.from({ length: this.#count }, () => {
      const s = {};
      this.#resetStar(s);
      // 初期 z はランダムに分散（全部が一斉に出てこないように）
      s.z = Math.random() * 1000;
      // 初期スクリーン座標を実際の z に合わせて再計算
      // （resetStar は z=800〜1000 前提で screenX を設定するため、
      //   z が小さい星は初回フレームで長い軌跡が生じてしまう）
      if (s.z > 0.01) {
        const initScale = 400 / s.z;
        s.screenX = this.#w / 2 + s.x * initScale;
        s.screenY = this.#h / 2 + s.y * initScale;
      }
      // prevX は null のまま → 初回フレームの draw() はスキップされる
      return s;
    });
  }

  /** @param {object} s */
  #resetStar(s) {
    // 中心から放射する角度をランダムに選び、xとyを設定
    const angle = Math.random() * Math.PI * 2;
    const dist  = 10 + Math.random() * 80; // 中心から少し離した位置からスタート
    s.x       = Math.cos(angle) * dist;
    s.y       = Math.sin(angle) * dist;
    s.z       = 800 + Math.random() * 200; // 遠い位置からスタート
    s.speed   = 150 + Math.random() * 250;
    s.screenX = this.#w / 2 + s.x;
    s.screenY = this.#h / 2 + s.y;
    s.prevX   = null;
    s.prevY   = null;
    s.lineW   = 0.5;
    s.alpha   = 0;
    if (this.#invert) {
      // 白背景モード：暗い紺/グレー系
      const accent = Math.random() < 0.15; // 15%はアクセント色
      s.r = accent ? 80 + Math.floor(Math.random() * 40) : 30 + Math.floor(Math.random() * 30);
      s.g = accent ? 60 + Math.floor(Math.random() * 30) : 40 + Math.floor(Math.random() * 30);
      s.b = accent ? 60 + Math.floor(Math.random() * 30) : 80 + Math.floor(Math.random() * 40);
    } else {
      // デフォルト：白〜青白
      const warm = Math.random() < 0.2; // 20%は暖色星
      s.r = warm ? 255 : 200 + Math.floor(Math.random() * 55);
      s.g = warm ? 240 : 220 + Math.floor(Math.random() * 35);
      s.b = warm ? 180 : 255;
    }
  }
}

// AK²Engine に登録
window.BgEffectStarSpeed = BgEffectStarSpeed;
