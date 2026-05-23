/* ============================================================================
   metavis1on — Firebase Config Safe Loader
   ----------------------------------------------------------------------------
   Fail-safe scaffold for future Firebase integration. Passive in this phase.

   - No HTML page currently loads this script; runtime impact is zero.
   - No real Firebase credentials live here. All values are placeholders;
     real config is injected per-environment outside this repo.
   - Firebase apiKey is a public client identifier — security lives in
     Firestore Security Rules + Auth + App Check, not in config secrecy.
     See docs/firebase-transition-plan.md §2 and docs/firebase-project-setup.md §8.
   - Borç paneli (admin/borc/index.html) continues to use its own inline
     firebaseConfig (docs/debt-panel-audit.md §1.5); this loader does not
     affect it.

   API surface on window.MV_FIREBASE:
     configured             boolean — backward-compat; stays false until init succeeds
     status                 string  — 'disabled' | 'placeholder' | 'ready' | 'error'
     config                 object  — backward-compat; stays null until init succeeds
     note                   string  — human-readable status
     getConfig()            → real config or null
     isConfigured()         → true only when config is non-placeholder
     isAvailable()          → true only when configured AND app initialized
     isEnabled()            → alias of isAvailable(); convenience for call-sites
     init(fbNamespace)      → returns boolean; safe to call repeatedly
     getApp()               → initialized Firebase app or null
     getStatus()            → current status string
     getLastError()         → last init error or null

   Auth readiness helpers (passive — never call firebase.auth(), never hit
   the network, never create an Auth instance or state listener):
     hasAuthSdk()           → true if a Firebase namespace was supplied AND
                              its `auth` property is callable; reflects SDK
                              presence only, independent of init success
     isAuthReady()          → true only when isAvailable() AND hasAuthSdk()
     getFirebaseNamespace() → the namespace captured during init(), or null
     getAuthProvider()      → namespace when isAuthReady() is true, else null;
                              callers must invoke `.auth()` themselves later

   Gated config injection (opt-in, repo stays placeholder by default):
     A real per-environment config may be supplied through the global
     `window.MV_FIREBASE_CONFIG`. If that global is absent OR fails the
     placeholder check, the loader keeps its built-in placeholderConfig
     and init() refuses to call firebase.initializeApp(). The repo never
     ships real credentials; consumers create `shared/config/firebase.local.js`
     locally (gitignored) and load it before `MV_FIREBASE.init()`. An
     example shape lives at `shared/config/firebase.local.example.js`.
     Inspection helpers (all side-effect-free):
       hasExternalConfig() → true if window.MV_FIREBASE_CONFIG is an object
       getExternalConfig() → the raw external config object or null
       resolveConfig()     → external when looksReal(), else placeholder

   Opt-in local config auto-loader (off by default — no network on default):
     Enables sideloading `shared/config/firebase.local.js` as a sibling
     `<script>` so MV_FIREBASE_CONFIG can be supplied without editing any
     admin HTML. Triggers ONLY when one of these holds at script-eval time:
       window.MV_FIREBASE_AUTO_LOAD_LOCAL === true            (explicit flag)
       URL has ?mvFirebaseLocal=1 AND host is localhost / 127.0.0.1 /
       0.0.0.0 / file://                                       (dev-host gate)
     On production-like hosts the query-param path is refused, so
     ?mvFirebaseLocal=1 is a no-op outside local development.
     Failure to fetch (404, network error) is swallowed silently — no
     console spam, page never breaks, status stays placeholder.
     On successful load, init() is re-attempted using the namespace
     captured during the first init() call (no double-init).
     Inspection helpers:
       isLocalConfigLoadEnabled() → true if opt-in conditions hold now
       getLocalConfigStatus()     → 'off' | 'skipped' | 'loading' |
                                     'loaded' | 'error'
       loadLocalConfig()          → manual trigger; idempotent, returns
                                     the resulting status. Useful from
                                     devtools when opt-in was not preset.

   Debug logging is opt-in via window.MV_DEBUG_FIREBASE = true (no console
   spam by default).
   ============================================================================ */
(function () {
  'use strict';

  var placeholderConfig = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_AUTH_DOMAIN',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  };

  var PLACEHOLDER_LITERALS = [
    'YOUR_API_KEY', 'YOUR_AUTH_DOMAIN', 'YOUR_PROJECT_ID',
    'YOUR_STORAGE_BUCKET', 'YOUR_MESSAGING_SENDER_ID', 'YOUR_APP_ID',
    'YOUR_MEASUREMENT_ID'
  ];

  function isPlaceholderValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;
    if (value.trim() === '') return true;
    if (PLACEHOLDER_LITERALS.indexOf(value) !== -1) return true;
    if (/^<[A-Z0-9_]+>$/.test(value)) return true;
    return false;
  }

  function looksReal(config) {
    if (!config || typeof config !== 'object') return false;
    if (isPlaceholderValue(config.apiKey)) return false;
    if (isPlaceholderValue(config.projectId)) return false;
    return true;
  }

  function readExternalConfig() {
    try {
      if (typeof window === 'undefined') return null;
      var ext = window.MV_FIREBASE_CONFIG;
      if (!ext || typeof ext !== 'object') return null;
      return ext;
    } catch (_) {
      return null;
    }
  }

  function isLocalHost() {
    try {
      if (typeof window === 'undefined' || !window.location) return false;
      if (window.location.protocol === 'file:') return true;
      var h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
    } catch (_) {
      return false;
    }
  }

  function hasLocalQueryParam() {
    try {
      if (typeof window === 'undefined' || !window.location) return false;
      var qs = window.location.search || '';
      if (!qs) return false;
      var pairs = qs.replace(/^\?/, '').split('&');
      for (var i = 0; i < pairs.length; i++) {
        if (!pairs[i]) continue;
        var eqIdx = pairs[i].indexOf('=');
        var k = eqIdx === -1 ? pairs[i] : pairs[i].slice(0, eqIdx);
        var v = eqIdx === -1 ? '' : pairs[i].slice(eqIdx + 1);
        try { k = decodeURIComponent(k); } catch (_) { /* keep raw */ }
        try { v = decodeURIComponent(v); } catch (_) { /* keep raw */ }
        if (k === 'mvFirebaseLocal' && (v === '1' || v === 'true')) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function isOptInActive() {
    try {
      if (typeof window === 'undefined') return false;
      if (window.MV_FIREBASE_AUTO_LOAD_LOCAL === true) return true;
      if (hasLocalQueryParam() && isLocalHost()) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function resolveLocalConfigUrl() {
    try {
      if (typeof document === 'undefined') return null;
      var cs = document.currentScript;
      if (!cs || !cs.src) return null;
      var src = cs.src;
      var qIdx = src.indexOf('?');
      var path = qIdx === -1 ? src : src.slice(0, qIdx);
      var slash = path.lastIndexOf('/');
      if (slash === -1) return null;
      return path.slice(0, slash + 1) + 'firebase.local.js';
    } catch (_) {
      return null;
    }
  }

  var localState = {
    status: 'off',
    attempted: false,
    url: null
  };

  var state = {
    config: placeholderConfig,
    app: null,
    status: 'disabled',
    lastError: null,
    initialized: false,
    firebaseNamespace: null
  };

  var debugEnabled = false;
  try {
    debugEnabled = !!(typeof window !== 'undefined' && window.MV_DEBUG_FIREBASE);
  } catch (_) {
    debugEnabled = false;
  }

  function debugLog() {
    if (!debugEnabled) return;
    try {
      if (typeof console !== 'undefined' && typeof console.log === 'function') {
        console.log.apply(console, arguments);
      }
    } catch (_) { /* no-op */ }
  }

  function tryRetryInit() {
    if (state.initialized && state.app) return;
    if (!state.firebaseNamespace) return;
    try {
      api.init(state.firebaseNamespace);
    } catch (_) { /* swallow — page must not break */ }
  }

  function loadLocalConfig() {
    if (localState.attempted) return localState.status;
    localState.attempted = true;
    if (typeof document === 'undefined' || !document.createElement || !document.head) {
      localState.status = 'skipped';
      debugLog('[MV_FIREBASE] local config load skipped: no DOM available.');
      return localState.status;
    }
    var url = resolveLocalConfigUrl();
    if (!url) {
      localState.status = 'skipped';
      debugLog('[MV_FIREBASE] local config load skipped: cannot resolve sibling URL.');
      return localState.status;
    }
    localState.url = url;
    localState.status = 'loading';
    try {
      var s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = function () {
        localState.status = 'loaded';
        debugLog('[MV_FIREBASE] local config loaded:', url);
        tryRetryInit();
      };
      s.onerror = function () {
        localState.status = 'error';
        debugLog('[MV_FIREBASE] local config load error (likely 404):', url);
      };
      document.head.appendChild(s);
    } catch (e) {
      localState.status = 'error';
      debugLog('[MV_FIREBASE] local config load threw:', e);
    }
    return localState.status;
  }

  var api = {
    configured: false,
    status: state.status,
    config: null,
    note: 'Firebase config placeholder is present but not active.',

    getConfig: function () {
      return looksReal(state.config) ? state.config : null;
    },

    isConfigured: function () {
      return looksReal(state.config);
    },

    isAvailable: function () {
      return api.isConfigured() && state.app !== null;
    },

    isEnabled: function () {
      return api.isAvailable();
    },

    hasAuthSdk: function () {
      var ns = state.firebaseNamespace;
      return !!(ns && typeof ns.auth === 'function');
    },

    isAuthReady: function () {
      return api.isAvailable() && api.hasAuthSdk();
    },

    getFirebaseNamespace: function () {
      return state.firebaseNamespace;
    },

    getAuthProvider: function () {
      return api.isAuthReady() ? state.firebaseNamespace : null;
    },

    hasExternalConfig: function () {
      return readExternalConfig() !== null;
    },

    getExternalConfig: function () {
      return readExternalConfig();
    },

    resolveConfig: function () {
      var ext = readExternalConfig();
      return looksReal(ext) ? ext : placeholderConfig;
    },

    isLocalConfigLoadEnabled: function () {
      return isOptInActive();
    },

    getLocalConfigStatus: function () {
      return localState.status;
    },

    loadLocalConfig: function () {
      return loadLocalConfig();
    },

    getStatus: function () {
      return state.status;
    },

    getLastError: function () {
      return state.lastError;
    },

    getApp: function () {
      return state.app;
    },

    init: function (firebaseNamespace) {
      if (state.initialized && state.app) {
        return true;
      }
      if (!firebaseNamespace || typeof firebaseNamespace.initializeApp !== 'function') {
        state.status = 'disabled';
        api.status = 'disabled';
        debugLog('[MV_FIREBASE] init aborted: no Firebase namespace available.');
        return false;
      }
      state.firebaseNamespace = firebaseNamespace;
      var ext = readExternalConfig();
      if (looksReal(ext)) {
        state.config = ext;
      }
      if (!looksReal(state.config)) {
        state.status = 'placeholder';
        api.status = 'placeholder';
        debugLog('[MV_FIREBASE] init aborted: placeholder config — no real apiKey/projectId.');
        return false;
      }
      try {
        state.app = firebaseNamespace.initializeApp(state.config);
        state.initialized = true;
        state.status = 'ready';
        api.status = 'ready';
        api.configured = true;
        api.config = state.config;
        return true;
      } catch (err) {
        state.lastError = err;
        state.status = 'error';
        api.status = 'error';
        debugLog('[MV_FIREBASE] init failed:', err);
        return false;
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.MV_FIREBASE = api;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.MV_FIREBASE = api;
  }

  if (isOptInActive()) {
    loadLocalConfig();
  }
})();
