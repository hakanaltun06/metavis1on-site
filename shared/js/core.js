/* ============================================================================
   metavis1on — Core Utilities
   ----------------------------------------------------------------------------
   Tüm shared/js dosyaları global window.MV nesnesi altında çalışır.
   ============================================================================ */
(function () {
  'use strict';

  window.MV = window.MV || {};

  const core = {
    /* DOM kısayolları */
    $:  (sel, ctx) => (ctx || document).querySelector(sel),
    $$: (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel)),

    on: function (el, ev, fn, opts) {
      if (el && el.addEventListener) el.addEventListener(ev, fn, opts);
    },

    /* UUID üretici (Web Crypto varsa onu kullan, yoksa fallback) */
    uuid: function () {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      return 'mv-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    },

    /* localStorage wrapper'ı — JSON serialize/parse + try/catch */
    storage: {
      get: function (key, fallback) {
        try {
          const v = localStorage.getItem(key);
          if (v === null || v === undefined) return fallback === undefined ? null : fallback;
          try { return JSON.parse(v); } catch (e) { return v; }
        } catch (e) { return fallback === undefined ? null : fallback; }
      },
      set: function (key, value) {
        try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }
        catch (e) { /* sessizce yut */ }
      },
      remove: function (key) {
        try { localStorage.removeItem(key); } catch (e) { /* sessizce yut */ }
      }
    },

    /* sessionStorage wrapper'ı */
    session: {
      get: function (key, fallback) {
        try {
          const v = sessionStorage.getItem(key);
          if (v === null || v === undefined) return fallback === undefined ? null : fallback;
          try { return JSON.parse(v); } catch (e) { return v; }
        } catch (e) { return fallback === undefined ? null : fallback; }
      },
      set: function (key, value) {
        try { sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); }
        catch (e) { /* sessizce yut */ }
      },
      remove: function (key) {
        try { sessionStorage.removeItem(key); } catch (e) { /* sessizce yut */ }
      }
    },

    /* Güvenli HTML escape (kullanıcı girdisini DOM'a basarken) */
    escapeHtml: function (str) {
      if (str === undefined || str === null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /* Toast bildirimi (components.css'teki .mv-toast ile uyumlu) */
    toast: function (message, type, duration) {
      type = type || 'info';
      duration = duration || 3000;

      let container = document.getElementById('mv-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'mv-toast-container';
        container.className = 'mv-toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = 'mv-toast mv-toast--' + type;
      toast.textContent = message;
      container.appendChild(toast);

      requestAnimationFrame(function () {
        toast.classList.add('mv-toast--show');
      });

      setTimeout(function () {
        toast.classList.remove('mv-toast--show');
        setTimeout(function () {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 420);
      }, duration);
    },

    /* Yıl güncelleyici (footer için) */
    setCurrentYear: function (selector) {
      const el = document.querySelector(selector || '[data-mv-year]');
      if (el) el.textContent = new Date().getFullYear();
    }
  };

  window.MV.core = core;

  /* Global kısayol — kullanım kolaylığı için */
  if (!window.$mv) window.$mv = core.$;
})();
