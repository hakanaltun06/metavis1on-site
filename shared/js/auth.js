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
     MV.auth.firebase — partially-live Firebase Auth wrapper.
     ----------------------------------------------------------------------
     Per-method execution mode (alpha.14):
       signIn      → LIVE when MV_FIREBASE.isAuthReady() is true; otherwise
                     no-op. Calls firebase.auth().signInWithEmailAndPassword
                     ONLY after readiness + credential validation pass.
       signOut     → LIVE when MV_FIREBASE.isAuthReady() is true; otherwise
                     no-op. Calls firebase.auth().signOut ONLY after the
                     readiness + provider acquisition guards pass.
       onChange    → dry-run; never calls onAuthStateChanged.
       currentUser → dry-run; never reads firebase.auth().currentUser.
     Neither signIn nor signOut writes/clears the sessionStorage admin
     gate by itself. createSessionFromResult and clearSessionAfterSignOut
     are explicit bridges the caller invokes after a successful SDK call.
     The existing sessionStorage-based MV.auth gate (devLogin / logout /
     requireAdmin / 8h TTL) is unchanged. No admin page calls these
     wrappers automatically — activation comes from devtools or a future
     commit. Repo default leaves MV_FIREBASE in placeholder state, so
     signIn/signOut stay no-ops until real config is supplied via the
     alpha.9/10 channels. inspect() reports the per-method capability map.
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
      mode: isAuthReady ? 'partial-live' : 'dry-run',
      capabilities: {
        signIn: isAuthReady ? 'live' : 'no-op',
        signOut: isAuthReady ? 'live' : 'no-op',
        onChange: 'dry-run',
        currentUser: 'dry-run',
        sessionBridge: 'available',
        logoutBridge: 'available'
      }
    };
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function firebaseSignIn(email, password) {
    const r = getFirebaseAuthReadiness();
    if (!r.enabled) {
      return Promise.resolve({ enabled: false, ok: false, reason: r.reason });
    }
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return Promise.resolve({ enabled: true, ok: false, reason: 'missing-credentials' });
    }
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
      return Promise.resolve({ enabled: true, ok: false, reason: 'invalid-email' });
    }
    if (password.length < 6) {
      return Promise.resolve({ enabled: true, ok: false, reason: 'invalid-password' });
    }
    const mvfb = window.MV_FIREBASE;
    const provider = (mvfb && typeof mvfb.getAuthProvider === 'function')
      ? mvfb.getAuthProvider()
      : null;
    if (!provider || typeof provider.auth !== 'function') {
      return Promise.resolve({ enabled: true, ok: false, reason: 'no-provider' });
    }
    let authInstance;
    try {
      authInstance = provider.auth();
    } catch (err) {
      return Promise.resolve({
        enabled: true, ok: false,
        reason: (err && err.code) || 'auth-init-error',
        message: (err && err.message) || 'Failed to acquire Auth instance.'
      });
    }
    if (!authInstance || typeof authInstance.signInWithEmailAndPassword !== 'function') {
      return Promise.resolve({ enabled: true, ok: false, reason: 'no-sign-in-method' });
    }
    return Promise.resolve()
      .then(function () {
        return authInstance.signInWithEmailAndPassword(e, password);
      })
      .then(function (credential) {
        const user = credential && credential.user ? credential.user : null;
        return {
          enabled: true,
          ok: true,
          uid: user ? user.uid : null,
          email: user ? user.email : e,
          provider: 'firebase-auth'
        };
      })
      .catch(function (err) {
        return {
          enabled: true,
          ok: false,
          reason: (err && err.code) || 'firebase-auth-error',
          message: (err && err.message) || 'Firebase sign-in failed.'
        };
      });
  }

  /* Bridge from a successful firebaseSignIn() result to the existing
     sessionStorage admin gate. Strictly validated; writes nothing on
     malformed input. Deliberately NOT auto-invoked by signIn() so the
     two stages stay independently testable until the admin form is
     wired up. */
  function createSessionFromFirebaseResult(result) {
    if (!result || typeof result !== 'object') {
      return { ok: false, reason: 'invalid-firebase-result' };
    }
    if (result.enabled !== true || result.ok !== true) {
      return { ok: false, reason: 'invalid-firebase-result' };
    }
    if (result.provider !== 'firebase-auth') {
      return { ok: false, reason: 'invalid-firebase-result' };
    }
    if (typeof result.uid !== 'string' || !result.uid) {
      return { ok: false, reason: 'invalid-firebase-result' };
    }
    if (typeof result.email !== 'string' || !result.email) {
      return { ok: false, reason: 'invalid-firebase-result' };
    }
    const loginAt = Date.now();
    const session = {
      authed: true,
      username: result.email,
      email: result.email,
      uid: result.uid,
      loginAt: loginAt,
      provider: 'firebase-auth'
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      return { ok: false, reason: 'session-write-failed' };
    }
    return {
      ok: true,
      provider: 'firebase-auth',
      user: {
        uid: result.uid,
        email: result.email,
        provider: 'firebase-auth',
        loginAt: loginAt
      }
    };
  }

  /* Mirror of firebaseSignIn() for the logout side. Calls
     firebase.auth().signOut() ONLY when readiness + provider acquisition
     succeed. Does NOT touch sessionStorage; the local session is cleared
     separately by clearSessionFromFirebaseSignOutResult(). */
  function firebaseSignOut() {
    const r = getFirebaseAuthReadiness();
    if (!r.enabled) {
      return Promise.resolve({ enabled: false, ok: false, reason: r.reason });
    }
    const mvfb = window.MV_FIREBASE;
    const provider = (mvfb && typeof mvfb.getAuthProvider === 'function')
      ? mvfb.getAuthProvider()
      : null;
    if (!provider || typeof provider.auth !== 'function') {
      return Promise.resolve({ enabled: true, ok: false, reason: 'no-provider' });
    }
    let authInstance;
    try {
      authInstance = provider.auth();
    } catch (err) {
      return Promise.resolve({
        enabled: true, ok: false,
        reason: (err && err.code) || 'auth-init-error',
        message: (err && err.message) || 'Failed to acquire Auth instance.'
      });
    }
    if (!authInstance || typeof authInstance.signOut !== 'function') {
      return Promise.resolve({ enabled: true, ok: false, reason: 'no-sign-out-method' });
    }
    return Promise.resolve()
      .then(function () {
        return authInstance.signOut();
      })
      .then(function () {
        return { enabled: true, ok: true, provider: 'firebase-auth' };
      })
      .catch(function (err) {
        return {
          enabled: true,
          ok: false,
          reason: (err && err.code) || 'firebase-sign-out-error',
          message: (err && err.message) || 'Firebase sign-out failed.'
        };
      });
  }

  /* Bridge from a successful firebaseSignOut() result to the existing
     sessionStorage admin gate. Strictly validated; clears nothing on
     malformed input. Inlines the same removeItem/try-catch pattern as
     auth.logout() to stay self-contained — bridge behavior must remain
     stable even if logout() later grows side effects (redirect, hooks). */
  function clearSessionFromFirebaseSignOutResult(result) {
    if (!result || typeof result !== 'object') {
      return { ok: false, reason: 'invalid-firebase-sign-out-result' };
    }
    if (result.enabled !== true || result.ok !== true) {
      return { ok: false, reason: 'invalid-firebase-sign-out-result' };
    }
    if (result.provider !== 'firebase-auth') {
      return { ok: false, reason: 'invalid-firebase-sign-out-result' };
    }
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      return { ok: false, reason: 'session-clear-failed' };
    }
    return { ok: true, cleared: true, provider: 'firebase-auth' };
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

    /* Firebase Auth wrapper namespace — signIn and signOut are both
       LIVE behind a double guard; onChange / currentUser remain dry-run.
       createSessionFromResult bridges a successful signIn into the
       existing sessionStorage gate; clearSessionAfterSignOut bridges a
       successful signOut by clearing the same key. Neither bridge is
       called automatically by its SDK counterpart — the two stages
       stay independently testable. See firebaseSignIn(), firebaseSignOut(),
       createSessionFromFirebaseResult(), and
       clearSessionFromFirebaseSignOutResult() for per-method semantics. */
    firebase: {
      isReady: function () {
        return getFirebaseAuthReadiness();
      },

      inspect: function () {
        return inspectFirebaseAuth();
      },

      signIn: function (email, password) {
        return firebaseSignIn(email, password);
      },

      createSessionFromResult: function (result) {
        return createSessionFromFirebaseResult(result);
      },

      signOut: function () {
        return firebaseSignOut();
      },

      clearSessionAfterSignOut: function (result) {
        return clearSessionFromFirebaseSignOutResult(result);
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
