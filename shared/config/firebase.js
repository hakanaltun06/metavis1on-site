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
     configured         boolean  — backward-compat; stays false until init succeeds
     status             string   — 'disabled' | 'placeholder' | 'ready' | 'error'
     config             object   — backward-compat; stays null until init succeeds
     note               string   — human-readable status
     getConfig()        → real config or null
     isConfigured()     → true only when config is non-placeholder
     isAvailable()      → true only when configured AND app initialized
     init(fbNamespace)  → returns boolean; safe to call repeatedly
     getApp()           → initialized Firebase app or null
     getStatus()        → current status string
     getLastError()     → last init error or null

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

  var state = {
    config: placeholderConfig,
    app: null,
    status: 'disabled',
    lastError: null,
    initialized: false
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
})();
