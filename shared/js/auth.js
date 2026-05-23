/* ============================================================================
   metavis1on — Auth Helper (Geçici)
   ----------------------------------------------------------------------------
   UYARI:
   Bu modül şu an SADECE GELİŞTİRME amaçlıdır. SessionStorage tabanlı bir
   oturum saklar; gerçek bir kimlik doğrulama yapmaz.

   Production auth Firebase ile bağlanacak. Migration adımları:
     1) shared/config/firebase.js doldurulacak
     2) Bu dosyaya Firebase Auth wrapper'ı eklenecek (signInWithEmailAndPassword)
     3) borc.html içindeki kendi auth sistemi, bu merkezi auth'a delege edilecek

   ÖNEMLİ: Bu dosyada gerçek admin parolası SAKLANMAZ. devLogin sadece
   "kullanıcı bir form doldurmuş" sinyali üretir.
   ============================================================================ */
(function () {
  'use strict';

  window.MV = window.MV || {};

  const SESSION_KEY = 'mv_admin_session';
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 saat

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.authed) return null;
      if (typeof data.loginAt !== 'number') return null;
      if (Date.now() - data.loginAt > SESSION_TTL_MS) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  /* ----------------------------------------------------------------------
     MV.auth.firebase — passive Firebase Auth wrapper (DORMANT).
     ----------------------------------------------------------------------
     This namespace prepares a future Firebase-backed auth flow. In this
     phase Firebase config is still a placeholder, so every wrapper below
     is a deliberate no-op:
       - never calls firebase.auth()
       - never calls signInWithEmailAndPassword / signOut /
         onAuthStateChanged
       - never opens a network request
       - never touches DOM, sessionStorage, or localStorage
       - never alters the existing sessionStorage-based MV.auth gate
     Wrappers are not invoked by any admin page in this commit. When the
     real Firebase config lands, the wrapper bodies will be replaced
     behind the same readiness guard.
     ---------------------------------------------------------------------- */
  function getFirebaseAuthReadiness() {
    const mvfb = (typeof window !== 'undefined') ? window.MV_FIREBASE : null;
    if (!mvfb || typeof mvfb.isAuthReady !== 'function') {
      return { enabled: false, reason: 'missing-loader' };
    }
    if (!mvfb.isAuthReady()) {
      const status = (typeof mvfb.getStatus === 'function') ? mvfb.getStatus() : 'not-ready';
      return { enabled: false, reason: status };
    }
    return { enabled: true, reason: 'ready' };
  }

  function dormantResult() {
    const r = getFirebaseAuthReadiness();
    if (r.enabled) {
      return { enabled: false, reason: 'wrapper-dormant' };
    }
    return { enabled: false, reason: r.reason };
  }

  const auth = {
    /* Aktif oturum var mı? */
    isAuthed: function () {
      return readSession() !== null;
    },

    /* Oturum sahibinin bilgileri */
    getUser: function () {
      const s = readSession();
      return s ? { username: s.username, provider: s.provider, loginAt: s.loginAt } : null;
    },

    /* Geçici dev login.
       Production auth Firebase ile bağlanacak — bu fonksiyon o zaman
       gerçek bir signInWithEmailAndPassword çağrısına dönüşecek.
       Şu an SADECE format kontrolü yapar; parola DOĞRULAMASI YAPMAZ. */
    devLogin: function (username, password) {
      if (!username || !password) {
        return { ok: false, error: 'Kullanıcı adı ve parola zorunludur.' };
      }
      const u = String(username).trim();
      const p = String(password);
      if (u.length < 3) {
        return { ok: false, error: 'Kullanıcı adı en az 3 karakter olmalı.' };
      }
      if (p.length < 6) {
        return { ok: false, error: 'Parola en az 6 karakter olmalı.' };
      }

      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          authed: true,
          username: u,
          loginAt: Date.now(),
          provider: 'dev-session'
        }));
      } catch (e) {
        return { ok: false, error: 'Oturum kaydedilemedi (sessionStorage devre dışı?).' };
      }
      return { ok: true };
    },

    /* Oturumu kapat */
    logout: function () {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* yut */ }
    },

    /* Korumalı sayfaların başında çağrılır.
       Oturum yoksa login sayfasına yönlendirir. */
    requireAdmin: function (loginUrl) {
      if (this.isAuthed()) return true;
      const target = loginUrl || './index.html';
      window.location.replace(target);
      return false;
    },

    /* Passive Firebase Auth wrapper namespace. See comment block above
       getFirebaseAuthReadiness(). All methods are dormant in this phase. */
    firebase: {
      isReady: function () {
        return getFirebaseAuthReadiness();
      },

      signIn: function (/* email, password */) {
        return Promise.resolve(dormantResult());
      },

      signOut: function () {
        return Promise.resolve(dormantResult());
      },

      onChange: function (/* callback */) {
        const r = dormantResult();
        return {
          enabled: false,
          reason: r.reason,
          unsubscribe: function () { /* no-op */ }
        };
      },

      currentUser: function () {
        return null;
      }
    }
  };

  window.MV.auth = auth;
})();
