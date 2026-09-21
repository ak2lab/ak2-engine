/**
 * AK² Lab / utils/counter.js
 * ================================
 * スクロール連動カウンターアニメーション
 *
 * 技術解説:
 *  - IntersectionObserver で要素が画面内に入ったタイミングを検知
 *  - requestAnimationFrame でなめらかに数値をカウントアップ
 *  - イーズアウト（cubic）で最後だけゆっくり止まる自然な動き
 *
 * 使い方:
 *  <span class="counter-number" data-target="42" data-suffix="+">0</span>
 */
class CounterAnimation {

  /**
   * @param {string} selector - 対象要素のセレクタ
   */
  constructor(selector = '.counter-number') {
    document.addEventListener('DOMContentLoaded', () => this.#init(selector));
  }

  // ── 内部処理 ─────────────────────────────────

  #init(selector) {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        this.#countUp(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    els.forEach(el => observer.observe(el));
  }

  #countUp(el) {
    const target   = parseInt(el.dataset.target,   10) || 0;
    const duration = parseInt(el.dataset.duration, 10) || 2000;
    const suffix   = el.dataset.suffix || '';
    const start    = performance.now();

    const tick = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // イーズアウト cubic: 最後にゆっくり止まる
      const eased    = 1 - Math.pow(1 - progress, 3);
      const value    = Math.floor(eased * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}

// 自動起動
new CounterAnimation();
