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

  /* beta.2: production devLogin guard scaffold.
     ----------------------------------------------------------------
     devLogin remains the format-only dev session producer it has
     always been. The scaffold below ONLY closes that door when BOTH
     conditions hold:
       (a) the current host is NOT a recognized dev host
           (localhost / 127.0.0.1 / 0.0.0.0 / file:), AND
       (b) window.MV_ENFORCE_FIREBASE_AUTH === true is explicitly set.
     Default repo behavior is unchanged: production hosts without the
     explicit enforce flag still accept devLogin, because the real
     Firebase production config has not landed in the default loader
     path yet. Locking devLogin in production without a working
     Firebase route would strand operators out of the live admin —
     so this stage only ships the scaffold. The enforce flag will be
     turned on by a later phase (beta.3+) once Firebase production
     config + admin allowlist are wired up and verified.
     This guard is intentionally narrow:
       - No new public API surface on MV.auth.
       - No effect on MV.auth.firebase wrapper methods.
       - No effect on dev hosts (localhost / 127.0.0.1 / 0.0.0.0 /
         file:) regardless of MV_ENFORCE_FIREBASE_AUTH.
       - No effect on requireAdmin / isAuthed / logout / getUser.
       - Only devLogin's branch behavior changes, and only when both
         conditions above hold.
     ---------------------------------------------------------------- */
  function isProductionHostForDevLoginGuard() {
    if (typeof window === 'undefined' || !window.location) return false;
    if (window.location.protocol === 'file:') return false;
    const h = window.location.hostname || '';
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return false;
    return true;
  }

  function isDevLoginGuardEnforced() {
    return typeof window !== 'undefined' &&
           window.MV_ENFORCE_FIREBASE_AUTH === true &&
           isProductionHostForDevLoginGuard();
  }

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
     Per-method execution mode (alpha.17 / v12.1.0-pre.3):
       signIn      → LIVE when MV_FIREBASE.isAuthReady() is true; otherwise
                     no-op. Calls firebase.auth().signInWithEmailAndPassword
                     ONLY after readiness + credential validation pass.
       signOut     → LIVE when MV_FIREBASE.isAuthReady() is true; otherwise
                     no-op. Calls firebase.auth().signOut ONLY after the
                     readiness + provider acquisition guards pass.
       onChange    → LIVE LISTENER when MV_FIREBASE.isAuthReady() is true;
                     otherwise no-op. Calls firebase.auth()
                     .onAuthStateChanged ONLY after the readiness +
                     provider acquisition guards pass. Callback receives
                     a sanitized snapshot (same shape as currentUser())
                     or null — never the raw Firebase user object.
                     unsubscribe is wrapped in try/catch so it cannot
                     throw into the caller. No sessionStorage access,
                     no DOM access, no redirect, no bridge invocation.
       currentUser → LIVE READ when MV_FIREBASE.isAuthReady() is true;
                     otherwise null. Reads the firebase.auth().currentUser
                     property only; no listener, no network, no
                     sessionStorage access, no DOM access. Returns a
                     sanitized, serializable snapshot or null.
       probeAdminAccess
                   → MANUAL FIRESTORE READ when MV_FIREBASE.isAuthReady()
                     AND MV_FIREBASE.isFirestoreReady() are both true AND
                     a currentUser exists; otherwise documented short-circuit
                     reason (`auth-not-ready` / `firestore-not-ready` /
                     `no-current-user`). Calls
                     firebase.firestore().collection('admins').doc(uid).get()
                     ONLY when invoked — never on page load, never from
                     other wrapper methods. Returns a sanitized verdict
                     with allowed/uid/email/role/active or a deny reason
                     (`admin-doc-missing` / `inactive-admin` /
                     `invalid-role`). Never writes sessionStorage, never
                     touches DOM, never modifies requireAdmin behavior.
     Neither signIn nor signOut writes/clears the sessionStorage admin
     gate by itself. createSessionFromResult and clearSessionAfterSignOut
     are explicit bridges the caller invokes after a successful SDK call.
     onChange never invokes either bridge; it is observation-only.

     probeAdminAccess (v12.1.0-pre.3) is a MANUAL admin allowlist probe.
     It reads admins/{currentUser.uid} from Firestore ONLY when invoked,
     returns a sanitized verdict (uid/email/role/active/provider/source)
     when allowed, or a reason code when denied/blocked. It is NOT a
     gate: it never modifies sessionStorage, never affects requireAdmin,
     never blocks login, never enriches the mv_admin_session payload.
     Auto-invocation is forbidden in this phase; no admin HTML page and
     no other wrapper method calls probeAdminAccess on its own. Page
     load never triggers a Firestore read because the probe is the only
     surface that reaches Firestore at all, and it is opt-in.

     The existing sessionStorage-based MV.auth gate (devLogin / logout /
     requireAdmin / 8h TTL) is unchanged. No admin page calls these
     wrappers automatically — activation comes from devtools or a future
     commit. Repo default leaves MV_FIREBASE in placeholder state, so
     signIn/signOut/currentUser/onChange/probeAdminAccess stay no-ops
     until real config is supplied via the alpha.9/10 channels. inspect()
     reports the per-method capability map, including the new
     adminAccessProbe capability.
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
    const isFirestoreReady = !!(mvfb && typeof mvfb.isFirestoreReady === 'function' && mvfb.isFirestoreReady());
    return {
      enabled: r.enabled,
      reason: r.reason,
      status: status,
      hasLoader: !!mvfb,
      hasAuthSdk: hasAuthSdk,
      isAuthReady: isAuthReady,
      hasProvider: hasProvider,
      isFirestoreReady: isFirestoreReady,
      localConfig: localConfig,
      mode: isAuthReady ? 'partial-live' : 'dry-run',
      capabilities: {
        signIn: isAuthReady ? 'live' : 'no-op',
        signOut: isAuthReady ? 'live' : 'no-op',
        onChange: isAuthReady ? 'live-listener' : 'no-op',
        currentUser: isAuthReady ? 'live-read' : 'no-op',
        sessionBridge: 'available',
        logoutBridge: 'available',
        adminAccessProbe: (isAuthReady && isFirestoreReady) ? 'manual-probe' : 'unavailable'
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

  /* Read-only snapshot of firebase.auth().currentUser. Mirrors the
     readiness + provider acquisition guards used by firebaseSignIn /
     firebaseSignOut, but never invokes a method on the auth instance:
     it only reads the .currentUser property and returns a sanitized,
     serializable subset. No sessionStorage access, no network call, no
     listener registration, no DOM access. Repo default (placeholder
     config) keeps this returning null; only Path A/B activation with
     a real Firebase project + active session lets this return data. */
  function firebaseCurrentUser() {
    if (typeof window === 'undefined' || !window.MV_FIREBASE) {
      return null;
    }
    const r = getFirebaseAuthReadiness();
    if (!r.enabled) {
      return null;
    }
    const mvfb = window.MV_FIREBASE;
    const provider = (typeof mvfb.getAuthProvider === 'function')
      ? mvfb.getAuthProvider()
      : null;
    if (!provider || typeof provider.auth !== 'function') {
      return null;
    }
    let authInstance;
    try {
      authInstance = provider.auth();
    } catch (e) {
      return null;
    }
    if (!authInstance) {
      return null;
    }
    const user = authInstance.currentUser;
    if (!user) {
      return null;
    }
    return {
      uid: user.uid || null,
      email: user.email || null,
      emailVerified: !!user.emailVerified,
      displayName: user.displayName || null,
      provider: 'firebase-auth'
    };
  }

  /* Guarded Firebase Auth state listener. Mirrors the readiness +
     provider acquisition guards used by firebaseSignIn / firebaseSignOut
     / firebaseCurrentUser, but actually calls
     firebase.auth().onAuthStateChanged when ready. The caller's callback
     is wrapped so it receives a sanitized snapshot (same 5-field shape
     as firebaseCurrentUser's return value) or null — never the raw
     Firebase user object, never tokens or providerData. The returned
     unsubscribe wraps the SDK detach call in try/catch so calling it
     can never throw into the caller. No sessionStorage write/clear,
     no DOM access, no redirect, no bridge invocation: this method
     observes only. Repo default (placeholder config) keeps this an
     enabled:false no-op with a stable unsubscribe() function so call
     sites don't need extra null guards. */
  function firebaseOnChange(callback) {
    if (typeof callback !== 'function') {
      return {
        enabled: false,
        ok: false,
        reason: 'invalid-callback',
        unsubscribe: function () { /* no-op */ }
      };
    }
    if (typeof window === 'undefined' || !window.MV_FIREBASE) {
      return {
        enabled: false,
        ok: false,
        reason: 'missing-loader',
        unsubscribe: function () { /* no-op */ }
      };
    }
    const r = getFirebaseAuthReadiness();
    if (!r.enabled) {
      return {
        enabled: false,
        ok: false,
        reason: r.reason,
        unsubscribe: function () { /* no-op */ }
      };
    }
    const mvfb = window.MV_FIREBASE;
    const provider = (typeof mvfb.getAuthProvider === 'function')
      ? mvfb.getAuthProvider()
      : null;
    if (!provider || typeof provider.auth !== 'function') {
      return {
        enabled: true,
        ok: false,
        reason: 'no-provider',
        unsubscribe: function () { /* no-op */ }
      };
    }
    let authInstance;
    try {
      authInstance = provider.auth();
    } catch (err) {
      return {
        enabled: true,
        ok: false,
        reason: (err && err.code) || 'auth-init-error',
        message: (err && err.message) || 'Firebase auth init failed.',
        unsubscribe: function () { /* no-op */ }
      };
    }
    if (!authInstance || typeof authInstance.onAuthStateChanged !== 'function') {
      return {
        enabled: true,
        ok: false,
        reason: 'no-auth-state-listener',
        unsubscribe: function () { /* no-op */ }
      };
    }
    const wrapped = function (user) {
      if (!user) {
        callback(null);
        return;
      }
      callback({
        uid: user.uid || null,
        email: user.email || null,
        emailVerified: !!user.emailVerified,
        displayName: user.displayName || null,
        provider: 'firebase-auth'
      });
    };
    let rawUnsubscribe;
    try {
      rawUnsubscribe = authInstance.onAuthStateChanged(wrapped);
    } catch (err) {
      return {
        enabled: true,
        ok: false,
        reason: (err && err.code) || 'auth-state-listener-error',
        message: (err && err.message) || 'Failed to register auth state listener.',
        unsubscribe: function () { /* no-op */ }
      };
    }
    const safeUnsubscribe = (typeof rawUnsubscribe === 'function')
      ? function () {
          try { rawUnsubscribe(); } catch (e) { /* swallow */ }
        }
      : function () { /* no-op */ };
    return {
      enabled: true,
      ok: true,
      provider: 'firebase-auth',
      unsubscribe: safeUnsubscribe
    };
  }

  /* Guarded admin allowlist probe (v12.1.0-pre.3).
     ----------------------------------------------------------------
     Manual probe of the active Firebase Auth user's admins/{uid}
     Firestore document. This is NOT a gate — it never blocks login,
     never modifies sessionStorage, never touches DOM, never affects
     requireAdmin. It only reads the allowlist record on demand and
     returns a sanitized verdict.
     Readiness chain (each step short-circuits with the documented
     reason if it fails; no network call is made until all steps
     pass):
       1) Firebase Auth ready (MV_FIREBASE.isAuthReady())
          → fail returns { enabled:false, ok:false,
                           reason:'auth-not-ready' }.
       2) Firestore ready (MV_FIREBASE.isFirestoreReady())
          → fail returns { enabled:false, ok:false,
                           reason:'firestore-not-ready' }.
       3) firebaseCurrentUser() must yield a non-null uid
          → fail returns { enabled:true, ok:false,
                           reason:'no-current-user' }.
     Doc evaluation (after a successful Firestore read):
       - doc missing       → allowed:false, reason:'admin-doc-missing'
       - active !== true   → allowed:false, reason:'inactive-admin'
       - role not in
         ['owner','admin','editor','viewer']
                           → allowed:false, reason:'invalid-role'
       - all guards pass   → allowed:true with sanitized fields
     Sanitization (only these fields can appear on the success path):
       uid, email, role, active, provider:'firebase-auth',
       source:'firestore-admins'.
     Notes / createdAt / updatedAt / metadata / token / providerData /
     refreshToken / any other admin doc field is NEVER returned. The
     raw Firestore document is never exposed to the caller.
     This helper is not auto-invoked anywhere — no admin HTML calls
     it, no bridge calls it, sayfa load akışında otomatik bir
     Firestore okuma yok. Only direct devtools / future-callsite
     invocations trigger the network read.
     ---------------------------------------------------------------- */
  function firebaseProbeAdminAccess() {
    const mvfb = (typeof window !== 'undefined') ? window.MV_FIREBASE : null;
    if (!mvfb) {
      return Promise.resolve({ enabled: false, ok: false, reason: 'auth-not-ready' });
    }
    const r = getFirebaseAuthReadiness();
    if (!r.enabled) {
      return Promise.resolve({ enabled: false, ok: false, reason: 'auth-not-ready' });
    }
    if (typeof mvfb.isFirestoreReady !== 'function' || !mvfb.isFirestoreReady()) {
      return Promise.resolve({ enabled: false, ok: false, reason: 'firestore-not-ready' });
    }
    const user = firebaseCurrentUser();
    if (!user || !user.uid) {
      return Promise.resolve({ enabled: true, ok: false, reason: 'no-current-user' });
    }
    const uid = user.uid;
    const authEmail = user.email || null;
    const provider = (typeof mvfb.getFirestoreProvider === 'function')
      ? mvfb.getFirestoreProvider()
      : null;
    if (!provider || typeof provider.firestore !== 'function') {
      return Promise.resolve({ enabled: false, ok: false, reason: 'firestore-not-ready' });
    }
    let fsInstance;
    try {
      fsInstance = provider.firestore();
    } catch (err) {
      return Promise.resolve({
        enabled: true, ok: false, allowed: false,
        reason: (err && err.code) || 'firestore-init-error',
        message: (err && err.message) || 'Failed to acquire Firestore instance.',
        uid: uid, email: authEmail,
        provider: 'firebase-auth',
        source: 'firestore-admins'
      });
    }
    if (!fsInstance || typeof fsInstance.collection !== 'function') {
      return Promise.resolve({
        enabled: true, ok: false, allowed: false,
        reason: 'no-firestore-api',
        uid: uid, email: authEmail,
        provider: 'firebase-auth',
        source: 'firestore-admins'
      });
    }
    const VALID_ROLES = ['owner', 'admin', 'editor', 'viewer'];
    return Promise.resolve()
      .then(function () {
        return fsInstance.collection('admins').doc(uid).get();
      })
      .then(function (snap) {
        if (!snap || !snap.exists) {
          return {
            enabled: true, ok: true, allowed: false,
            reason: 'admin-doc-missing',
            uid: uid, email: authEmail,
            provider: 'firebase-auth',
            source: 'firestore-admins'
          };
        }
        const data = (typeof snap.data === 'function') ? (snap.data() || {}) : {};
        const docEmail = (typeof data.email === 'string' && data.email) ? data.email : authEmail;
        const role = (typeof data.role === 'string') ? data.role : null;
        const active = data.active === true;
        if (!active) {
          return {
            enabled: true, ok: true, allowed: false,
            reason: 'inactive-admin',
            uid: uid, email: docEmail,
            provider: 'firebase-auth',
            source: 'firestore-admins'
          };
        }
        if (VALID_ROLES.indexOf(role) === -1) {
          return {
            enabled: true, ok: true, allowed: false,
            reason: 'invalid-role',
            uid: uid, email: docEmail,
            provider: 'firebase-auth',
            source: 'firestore-admins'
          };
        }
        return {
          enabled: true, ok: true, allowed: true,
          uid: uid,
          email: docEmail,
          role: role,
          active: true,
          provider: 'firebase-auth',
          source: 'firestore-admins'
        };
      })
      .catch(function (err) {
        return {
          enabled: true, ok: false, allowed: false,
          reason: (err && err.code) || 'firestore-error',
          message: (err && err.message) || 'Firestore read failed.',
          uid: uid, email: authEmail,
          provider: 'firebase-auth',
          source: 'firestore-admins'
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
       Şu an SADECE format kontrolü yapar; parola DOĞRULAMASI YAPMAZ.
       beta.2: production hostta MV_ENFORCE_FIREBASE_AUTH === true ise
       devLogin kapatılır (scaffold; default off — bkz. helper bloğu). */
    devLogin: function (username, password) {
      if (isDevLoginGuardEnforced()) {
        return { ok: false, error: 'Geliştirme girişi üretim ortamında devre dışı.' };
      }
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

    /* Firebase Auth wrapper namespace — signIn, signOut, currentUser
       (read-only snapshot) and onChange (state listener) are all LIVE
       behind a double guard; default repo placeholder config keeps
       every entry point a safe no-op. createSessionFromResult bridges
       a successful signIn into the existing sessionStorage gate;
       clearSessionAfterSignOut bridges a successful signOut by clearing
       the same key. Neither bridge is called automatically by its SDK
       counterpart — the two stages stay independently testable. onChange
       observes only: no bridge invocation, no sessionStorage touch, no
       DOM access, no redirect; its callback receives the same sanitized
       5-field shape that currentUser() returns. probeAdminAccess
       (v12.1.0-pre.3) is a manual allowlist probe: it reads the active
       user's admins/{uid} document only when invoked, returns a
       sanitized verdict, and never modifies sessionStorage or affects
       login gate behavior. See firebaseSignIn(), firebaseSignOut(),
       firebaseCurrentUser(), firebaseOnChange(),
       firebaseProbeAdminAccess(), createSessionFromFirebaseResult(),
       and clearSessionFromFirebaseSignOutResult() for per-method
       semantics. */
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

      onChange: function (callback) {
        return firebaseOnChange(callback);
      },

      currentUser: function () {
        return firebaseCurrentUser();
      },

      probeAdminAccess: function () {
        return firebaseProbeAdminAccess();
      }
    }
  };

  window.MV.auth = auth;
})();
