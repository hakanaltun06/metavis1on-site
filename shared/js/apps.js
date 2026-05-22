/* ============================================================================
   metavis1on — Uygulama Listesi Helper'ı
   ----------------------------------------------------------------------------
   shared/config/site.js içindeki MV_SITE.apps verisini okur, projeler
   vitrini ve admin uygulama listesi tarafından kullanılır.
   ============================================================================ */
(function () {
  'use strict';

  window.MV = window.MV || {};

  function getAll() {
    if (window.MV_SITE && Array.isArray(window.MV_SITE.apps)) {
      return window.MV_SITE.apps.slice();
    }
    return [];
  }

  const apps = {
    all: function () { return getAll(); },

    byVisibility: function (vis) {
      return getAll().filter(function (a) { return !vis || a.visibility === vis; });
    },

    byId: function (id) {
      const list = getAll();
      for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    /* Projeler vitrini için — tüm uygulamalar (admin de dahil ama kilitli). */
    forProjectsPage: function () {
      return getAll().filter(function (a) {
        return a.visibility === 'public' || a.visibility === 'admin';
      });
    },

    /* Admin dashboard için — admin'in görmesi gereken hepsi. */
    forAdminPage: function () {
      return getAll();
    }
  };

  window.MV.apps = apps;
})();
