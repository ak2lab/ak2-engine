/**
 * layout-header-kinetic.js
 * ========================
 * ヘッダースクロール効果 + モバイルメニュー開閉
 */
(function initHeader() {
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('site-header');
    const nav    = document.getElementById('site-nav');
    const btn    = document.getElementById('mobile-menu-btn');

    // ── ヘッダースクロール効果 ──────────────────────────
    if (header) {
      const isTransparentPage = header.classList.contains('is-transparent');
      const update = () => {
        const scrolled = window.scrollY > 50;
        header.classList.toggle('is-scrolled', scrolled);
        if (isTransparentPage) {
          header.classList.toggle('is-transparent', !scrolled);
        }
      };
      window.addEventListener('scroll', update, { passive: true });
      update(); // 初期チェック
    }

    // ── モバイルメニュー ───────────────────────────────
    if (!nav || !btn) return;

    const closeMenu = () => {
      nav.classList.remove('is-open');
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      header?.classList.remove('menu-open');
    };

    btn.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      btn.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
      header?.classList.toggle('menu-open', isOpen);
    });

    // ナビリンクをクリックしたら閉じる
    nav.querySelectorAll('.nav-menu__link').forEach(a => {
      a.addEventListener('click', closeMenu);
    });

    // Escape キーで閉じる
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMenu();
    });
  });
})();
