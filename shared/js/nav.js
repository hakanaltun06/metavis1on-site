/* ============================================================================
   metavis1on — Navigasyon Yardımcıları
   ----------------------------------------------------------------------------
   Sidebar/menü aktif link işaretleme, mobil toggle.
   ============================================================================ */
(function () {
  'use strict';

  window.MV = window.MV || {};

  const nav = {
    /* Aktif linki [data-mv-nav-link="<path>"] attribute'una göre işaretler */
    markActive: function (currentPath) {
      const path = currentPath || window.location.pathname;
      const links = document.querySelectorAll('[data-mv-nav-link]');
      links.forEach(function (a) {
        const target = a.getAttribute('data-mv-nav-link');
        if (!target) return;
        if (path === target || path.endsWith(target)) {
          a.classList.add('is-active');
        }
      });
    },

    /* Basit mobil menü açma/kapama (gerekirse kullanılır) */
    initMobileToggle: function (toggleSel, menuSel) {
      const toggle = document.querySelector(toggleSel);
      const menu = document.querySelector(menuSel);
      if (!toggle || !menu) return;

      toggle.addEventListener('click', function () {
        const open = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  };

  window.MV.nav = nav;
})();
