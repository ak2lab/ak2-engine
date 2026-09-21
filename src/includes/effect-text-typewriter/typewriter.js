/**
 * AK² Lab / utils/typewriter.js
 * ================================
 * タイプライターエフェクト（クラスベース）
 *
 * 技術解説:
 *  - テキストを1文字ずつ「タイプ」し、完了後に「削除」して次の文字列へ
 *  - setTimeout による非同期ループ（requestAnimationFrame 不要）
 *  - カーソル（点滅）は CSS アニメーションで実装
 *  - placeholder 要素を渡すと、現在のフルテキストでサイズを予約する
 *    （グリッドオーバーレイ方式により、複数行時もカーソルが最終行末に留まる）
 *
 * 使い方:
 *  new TypeWriter(el, ['text1', 'text2'], { placeholder: phEl, speed: 80 });
 */
class TypeWriter {

  /** @type {HTMLElement} */
  #el = null;

  /** @type {HTMLElement|null} placeholder 要素（スペース確保用） */
  #ph = null;

  /** @type {string[]} */
  #texts = [];

  /** @type {number} 現在のテキストインデックス */
  #textIdx = 0;

  /** @type {number} 現在の文字インデックス */
  #charIdx = 0;

  /** @type {'typing'|'waiting'|'deleting'} */
  #phase = 'typing';

  /** @type {ReturnType<typeof setTimeout>|null} */
  #timer = null;

  /**
   * @param {HTMLElement} el - タイプ済みテキストを挿入する要素
   * @param {string[]} texts - ループするテキスト配列
   * @param {{ placeholder?: HTMLElement, speed?: number, deleteSpeed?: number, waitTime?: number }} options
   */
  constructor(el, texts, options = {}) {
    this.#el          = el;
    this.#ph          = options.placeholder ?? null;
    this.#texts       = texts;
    this.speed        = options.speed        ?? 80;
    this.deleteSpeed  = options.deleteSpeed  ?? 40;
    this.waitTime     = options.waitTime     ?? 2200;
    // 初期 placeholder をセット
    if (this.#ph) this.#ph.textContent = this.#texts[0] ?? '';
    this.#tick();
  }

  // ── 内部処理 ─────────────────────────────────

  #tick() {
    const current = this.#texts[this.#textIdx];

    switch (this.#phase) {
      case 'typing': {
        this.#charIdx++;
        this.#el.textContent = current.slice(0, this.#charIdx);
        if (this.#charIdx >= current.length) {
          this.#phase = 'waiting';
          this.#timer = setTimeout(() => {
            this.#phase = 'deleting';
            this.#tick();
          }, this.waitTime);
          return;
        }
        break;
      }
      case 'deleting': {
        this.#charIdx--;
        this.#el.textContent = current.slice(0, this.#charIdx);
        if (this.#charIdx <= 0) {
          this.#textIdx = (this.#textIdx + 1) % this.#texts.length;
          this.#phase   = 'typing';
          // 次のテキストで placeholder を更新（スペース確保）
          if (this.#ph) this.#ph.textContent = this.#texts[this.#textIdx];
        }
        break;
      }
    }

    const delay = this.#phase === 'deleting' ? this.deleteSpeed : this.speed;
    this.#timer = setTimeout(() => this.#tick(), delay);
  }

  /** タイプライターを停止する */
  destroy() {
    clearTimeout(this.#timer);
  }
}
