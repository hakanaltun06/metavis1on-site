/* ============================================================================
   metavis1on — Firebase Local Config (EXAMPLE)
   ----------------------------------------------------------------------------
   THIS FILE IS A TEMPLATE. Copy it next to itself as `firebase.local.js`
   and fill in your environment-specific Firebase values there. The repo
   ignores `firebase.local.js` via .gitignore, so real credentials never
   land in version control.

   How it wires up — pick ONE of the two paths:

     Path A — manual script tag (works on any host, requires HTML edit):
       1) Create `shared/config/firebase.local.js` with the same shape
          below but real values for your Firebase project.
       2) Load it from an HTML page BEFORE `shared/config/firebase.js`:
            <script src="../shared/config/firebase.local.js"></script>
            <script src="../shared/config/firebase.js"></script>
          (or anywhere before `MV_FIREBASE.init(window.firebase)` runs).
       3) The safe loader picks `window.MV_FIREBASE_CONFIG` up through
          `resolveConfig()` inside `init()` and only upgrades from
          placeholder to real config when `looksReal()` accepts it.

     Path B — opt-in auto-loader (no HTML edit, dev-host only by default):
       1) Create `shared/config/firebase.local.js` as above.
       2) EITHER set `window.MV_FIREBASE_AUTO_LOAD_LOCAL = true` before
          `shared/config/firebase.js` runs (explicit, works on any host),
          OR open the page with the URL query `?mvFirebaseLocal=1`
          (refused outside `localhost` / `127.0.0.1` / `0.0.0.0` / file:).
       3) The loader injects `<script src="firebase.local.js">` as a
          sibling of `firebase.js`, swallows 404 silently, and on
          successful load re-attempts `init()` with the namespace it
          captured during the first call.
       4) Optional inspection from devtools:
            MV_FIREBASE.isLocalConfigLoadEnabled()  → boolean
            MV_FIREBASE.getLocalConfigStatus()
                → 'off' | 'skipped' | 'loading' | 'loaded' | 'error'
            MV_FIREBASE.loadLocalConfig()           → manual trigger

   IMPORTANT:
     - DO NOT put real apiKey / projectId / appId into THIS example file
       and commit it. The values below are intentional placeholders that
       fail the loader's looksReal() check, so even if someone loads this
       file as-is the loader stays in placeholder/disabled state.
     - DO NOT rename this file to `firebase.local.js` and then commit it.
       That filename is gitignored on purpose.
     - Firebase apiKey is a PUBLIC client identifier (security lives in
       Firestore Rules + Auth + App Check), but committing it still tags
       this repo with a specific Firebase project — keep the values out
       of the public tree.
   ============================================================================ */
window.MV_FIREBASE_CONFIG = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID'
};
