(function () {
  'use strict';

  var STORE_KEY = 'mv:theme';
  var THEMES = ['dark', 'light', 'purple', 'blue', 'red'];
  var THEME_COLORS = {
    dark: '#0a0c10',
    light: '#f0f2f7',
    purple: '#0d0816',
    blue: '#080e1a',
    red: '#120a08'
  };
  var doc = document.documentElement;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function readStored() {
    try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function writeStored(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) {}
  }
  function currentTheme() {
    return doc.getAttribute('data-theme') || 'dark';
  }
  function applyTheme(theme, opts) {
    if (THEMES.indexOf(theme) === -1) theme = 'dark';
    if (opts && opts.silent) doc.classList.add('theme-switching');
    doc.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[theme] || '#0a0c10');

    document.querySelectorAll('.theme-option').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-set-theme') === theme);
    });

    if (opts && opts.silent) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          doc.classList.remove('theme-switching');
        });
      });
    }
  }

  var stored = readStored();
  var initial = THEMES.indexOf(stored) > -1 ? stored : 'dark';
  applyTheme(initial, { silent: true });

  // ---------- Tema Seçici ----------
  var pickerBtn = document.querySelector('.theme-picker-btn');
  var pickerPanel = document.querySelector('.theme-picker-panel');

  if (pickerBtn && pickerPanel) {
    pickerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = pickerPanel.classList.toggle('is-open');
      pickerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    pickerPanel.addEventListener('click', function (e) {
      var option = e.target.closest('.theme-option');
      if (!option) return;
      var theme = option.getAttribute('data-set-theme');
      if (theme) {
        applyTheme(theme);
        writeStored(theme);
        pickerPanel.classList.remove('is-open');
        pickerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.theme-picker')) {
        pickerPanel.classList.remove('is-open');
        pickerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pickerPanel.classList.contains('is-open')) {
        pickerPanel.classList.remove('is-open');
        pickerBtn.setAttribute('aria-expanded', 'false');
        pickerBtn.focus();
      }
    });
  }

  // ---------- Mobil Menü ----------
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ---------- Header Scroll ----------
  var header = document.querySelector('.site-header');
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          header.classList.toggle('is-scrolled', window.scrollY > 12);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- Scroll Reveal ----------
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var items = document.querySelectorAll('.reveal, .stagger');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    items.forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal, .stagger').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // ---------- Mouse Glow (sayfa arka planı) ----------
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    var glowEl = document.querySelector('.bg-glow');
    if (glowEl) {
      document.addEventListener('mousemove', function (e) {
        var x = (e.clientX / window.innerWidth * 100).toFixed(1);
        var y = ((e.clientY + window.scrollY) / document.body.scrollHeight * 100).toFixed(1);
        glowEl.style.setProperty('--mouse-x', x + '%');
        glowEl.style.setProperty('--mouse-y', y + '%');
      });
    }

    document.querySelectorAll('.discord-panel, .identity-card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
      card.addEventListener('pointerleave', function () {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  }

  // ---------- Yıl ----------
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
