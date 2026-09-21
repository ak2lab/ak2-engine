/**
 * effect-motion-fadein.js
 * スクロールフェードイン（IntersectionObserver）
 * .fade-in-section 要素をビューポート進入時に .is-visible 付与
 */
(function initFadeIn() {
  document.addEventListener('DOMContentLoaded', () => {
    const els = document.querySelectorAll('.fade-in-section');
    if (!els.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.delay) || 0;
        setTimeout(() => entry.target.classList.add('is-visible'), delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });

    els.forEach(el => observer.observe(el));
  });
})();
