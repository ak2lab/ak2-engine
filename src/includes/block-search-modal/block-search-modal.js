(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var modal = document.querySelector('[data-search-modal]');
    if (!modal) return;

    var backdrop = modal.querySelector('[data-search-modal-backdrop]');
    var uiContainer = modal.querySelector('[data-search-modal-ui]');
    var triggers = document.querySelectorAll('[data-search-trigger]');
    var loaded = false;

    function open() {
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      if (!loaded) {
        loaded = true;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/pagefind/pagefind-ui.css';
        document.head.appendChild(link);

        var script = document.createElement('script');
        script.src = '/pagefind/pagefind-ui.js';
        script.onload = function () {
          new PagefindUI({
            element: uiContainer,
            showSubResults: true,
            translations: {
              placeholder: 'サイト内検索...',
              zero_results: '「[SEARCH_TERM]」に一致する結果はありません'
            }
          });
          var input = uiContainer.querySelector('input');
          if (input) input.focus();
        };
        document.head.appendChild(script);
      } else {
        var input = uiContainer.querySelector('input');
        if (input) {
          input.focus();
          input.select();
        }
      }
    }

    function close() {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    triggers.forEach(function (btn) {
      btn.addEventListener('click', open);
    });

    backdrop.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
        close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (modal.getAttribute('aria-hidden') === 'true') {
          open();
        } else {
          close();
        }
      }
    });
  });
})();
