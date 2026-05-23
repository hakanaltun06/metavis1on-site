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
     MV.auth.firebase — passive Firebase Auth wrapper (DRY-RUN).
     ----------------------------------------------------------------------
     This namespace prepares a future Firebase-backed auth flow. In this
     phase every wrapper below is deliberately side-effect-free:
       - never calls firebase.auth()
       - never calls signInWithEmailAndPassword / signOut /
         onAuthStateChanged
       - never opens a network request
       - never touches DOM, sessionStorage, or localStorage
       - never alters the existing sessionStorage-based MV.auth gate
     Behavior split by Firebase Auth readiness (MV_FIREBASE.isAuthReady()):
       - unready (placeholder / missing-loader / disabled / error):
           returns { enabled: false, reason: '<status>' }
       - ready (real config loaded, app initialized, SDK present):
           returns { enabled: true, simulated: true,
                     reason: 'ready-no-execute' }
     Even in the ready branch the wrapper bodies stay dry-run — no SDK
     call. inspect() exposes a structured snapshot for sanity-checking
     wiring before alpha.12 flips this to real sign-in execution.
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

  function dryRunResult() {
    const r = getFirebaseAuthReadiness();
    if (r.enabled) {
      return { enabled: true, simulated: true, reason: 'ready-no-execute' };
    }
    return { enabled: false, reason: r.reason };
  }

  function inspectFirebaseAuth() {
    const mvfb = (typeof window !== 'undefined') ? window.MV_FIREBASE : null;
    const r = getFirebaseAuthReadiness();
    const status = (mvfb && typeof mvfb.getStatus === 'function')
      ? mvfb.getStatus()
      : 'unknown';
    const hasAuthSdk = !!(mvfb && typeof mvfb.hasAuthSdk === 'function' && mvfb.hasAuthSdk());
    const isAuthReady = !!(mvfb && typeof mvfb.isAuthReady === 'function' && mvfb.isAuthReady());
    const hasProvider = !!(mvfb && typeof mvfb.getAuthProvider === 'function' && mvfb.getAuthProvider() !== null);
    const localConfig = {
      enabled: !!(mvfb && typeof mvfb.isLocalConfigLoadEnabled === 'function' && mvfb.isLocalConfigLoadEnabled()),
      status: (mvfb && typeof mvfb.getLocalConfigStatus === 'function')
        ? mvfb.getLocalConfigStatus()
        : 'unavailable'
    };
    return {
      enabled: r.enabled,
      reason: r.reason,
      status: status,
      hasLoader: !!mvfb,
      hasAuthSdk: hasAuthSdk,
      isAuthReady: isAuthReady,
      hasProvider: hasProvider,
      localConfig: localConfig,
      mode: 'dry-run'
    };
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

    /* Passive Firebase Auth wrapper namespace (DRY-RUN). See comment
       block above getFirebaseAuthReadiness(). Wrappers stay side-effect
       free even when readiness reports true; the ready branch returns
       a 'ready-no-execute' marker so call-sites can be validated before
       alpha.12 enables real SDK execution. */
    firebase: {
      isReady: function () {
        return getFirebaseAuthReadiness();
      },

      inspect: function () {
        return inspectFirebaseAuth();
      },

      signIn: function (/* email, password */) {
        return Promise.resolve(dryRunResult());
      },

      signOut: function () {
        return Promise.resolve(dryRunResult());
      },

      onChange: function (/* callback */) {
        const r = dryRunResult();
        return {
          enabled: r.enabled,
          simulated: r.enabled ? true : undefined,
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
