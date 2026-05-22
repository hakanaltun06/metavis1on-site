/* ============================================================================
   metavis1on — Effects (v11.0.6)
   ----------------------------------------------------------------------------
   Küçük IntersectionObserver helper'ı. Sayfaya `data-mv-reveal` attribute'lu
   elemanları gözleyip görünür olduklarında `.is-visible` class'ı ekler.

   - Reveal CSS kuralları `.mv-effects` parent class'ı ile gate'lenmiştir.
     Bu class normalde index-v11.html'in <head>'inde inline bir gate script
     tarafından eklenir; eğer eklenmezse CSS reveal kuralları uygulanmaz ve
     içerik default olarak tamamen görünür kalır (graceful degradation).
   - prefers-reduced-motion: reduce → reveal devre dışı, tüm elemanlar
     anında görünür.
   - IntersectionObserver desteklenmiyorsa → reveal devre dışı, tüm elemanlar
     anında görünür.
   - Global kirletme yok; tüm mantık IIFE içinde.
   ============================================================================ */
(function () {
  'use strict';

  function init() {
    var html = document.documentElement;
    var els  = document.querySelectorAll('[data-mv-reveal]');
    if (!els.length) return;

    var prefersReduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fallback: IO yoksa veya reduce-motion açıksa — gate class'ı kaldır,
    // tüm reveal elemanlarını anında görünür yap.
    if (prefersReduce || !('IntersectionObserver' in window)) {
      html.classList.remove('mv-effects');
      Array.prototype.forEach.call(els, function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    Array.prototype.forEach.call(els, function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
