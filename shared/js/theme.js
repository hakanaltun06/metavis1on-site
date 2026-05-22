/* ============================================================================
   metavis1on — Tema Yönetimi
   ----------------------------------------------------------------------------
   Sadece yeni shared-tabanlı sayfalarda kullanılır.
   Mevcut index.html / borc.html kendi tema sistemine sahip; ona DOKUNULMUYOR.
   Ancak aynı localStorage anahtarı kullanılıyor → ana sitedeki seçim,
   yeni sayfalarda da geçerli olur.
   ============================================================================ */
(function () {
  'use strict';

  window.MV = window.MV || {};

  const THEME_KEY = (window.MV_SITE && window.MV_SITE.themeKey) || 'metavis1on_theme';
  const DEFAULT   = (window.MV_SITE && window.MV_SITE.defaultTheme) || 'obsidian-cyan';

  function getValidThemes() {
    if (window.MV_SITE && Array.isArray(window.MV_SITE.themes)) {
      return window.MV_SITE.themes.map(function (t) { return t.id; });
    }
    return ['obsidian-cyan', 'obsidian-gold', 'obsidian-purple'];
  }

  const theme = {
    get: function () {
      try {
        const stored = localStorage.getItem(THEME_KEY);
        const valid = getValidThemes();
        if (stored && valid.indexOf(stored) >= 0) return stored;
      } catch (e) { /* yut */ }
      return DEFAULT;
    },

    apply: function (id) {
      const root = document.documentElement;
      root.setAttribute('data-mv-theme', id);
      // Ana sitedeki tema motoruyla uyumlu kalsın diye data-theme'i de yaz
      // (sadece geçerli bir mv tema id'siyse — başka bir attribute değerini ezmez)
      const valid = getValidThemes();
      if (valid.indexOf(id) >= 0) {
        root.setAttribute('data-theme', id);
      }
    },

    set: function (id) {
      const valid = getValidThemes();
      if (valid.indexOf(id) < 0) return false;
      try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* yut */ }
      this.apply(id);
      return true;
    },

    init: function () {
      this.apply(this.get());
    },

    /* Tema değiştirici dropdown'u kur (opsiyonel) */
    bindSwitcher: function (selector) {
      const buttons = document.querySelectorAll(selector || '[data-mv-set-theme]');
      const self = this;
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          const id = btn.getAttribute('data-mv-set-theme');
          if (id) self.set(id);
        });
      });
    }
  };

  window.MV.theme = theme;

  // Sayfa yüklenir yüklenmez tema uygula (Flash of Unstyled Content engelle)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { theme.init(); });
  } else {
    theme.init();
  }
})();
