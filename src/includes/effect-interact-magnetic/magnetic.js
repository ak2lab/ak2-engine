/**
 * AK² Lab / utils/magnetic.js
 * ================================
 * マグネティックボタンエフェクト（クラスベース）
 *
 * 技術解説:
 *  - ホバー時にボタンがマウスを「引き寄せる」ような動き
 *  - mousemove でボタン中心からのオフセットを計算し translate で追従
 *  - mouseleave で CSS transition を使って元の位置へ滑らかに戻す
 *  - strength パラメータで引力の強さを調整可能
 */
class MagneticEffect {

  /** @type {number} 引力の強さ（0〜1、小さいほど強い） */
  #strength = 0.3;

  /**
   * @param {string} selector - 対象要素のセレクタ
   * @param {{ strength?: number }} options
   */
  constructor(selector = '.btn-magnetic', options = {}) {
    this.#strength = options.strength ?? 0.3;
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll(selector).forEach(el => this.#attach(el));
    });
  }

  // ── 内部処理 ─────────────────────────────────

  #attach(el) {
    el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

    el.addEventListener('mousemove', e => {
      const rect   = el.getBoundingClientRect();
      const centerX = rect.left + rect.width  / 2;
      const centerY = rect.top  + rect.height / 2;
      const dx = (e.clientX - centerX) * this.#strength;
      const dy = (e.clientY - centerY) * this.#strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  }
}

// 自動起動
new MagneticEffect();
