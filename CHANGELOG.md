# Changelog

Bu dosya metavis1on portalı ve admin paneli için önemli sürüm
değişikliklerini özetler. Format [Keep a Changelog](https://keepachangelog.com/)
tarzına yakındır; her satır kısa ve anlamlı bir özet sunar. Teknik
detaylar için commit history referans alınır.

---

## [v12.0.0-alpha.14] — Guarded Firebase signOut and Logout Bridge

- `MV.auth.firebase.signOut()` **LIVE** moduna geçirildi ama
  double-guard arkasında — alpha.12 `signIn` pattern'inin simetriği.
  Yalnızca `MV_FIREBASE.isAuthReady() === true` iken gerçek
  `firebase.auth().signOut()` çağrılır. Default repo placeholder
  config ile **hâlâ no-op** davranır.
- **Guard sırası** (sıralı, ilk reddeden döner):
  1. `getFirebaseAuthReadiness().enabled === false` →
     `{ enabled:false, ok:false, reason:'missing-loader'|'disabled'|
     'placeholder'|'error' }`.
  2. `getAuthProvider()` null veya `.auth` function değil →
     `{ enabled:true, ok:false, reason:'no-provider' }`.
  3. `provider.auth()` throw → `{ enabled:true, ok:false, reason:err.code
     || 'auth-init-error', message }`.
  4. Auth instance'da `signOut` function değil →
     `{ enabled:true, ok:false, reason:'no-sign-out-method' }`.
- **Başarı dönüşü:** `{ enabled:true, ok:true, provider:'firebase-auth' }`
- **Hata dönüşü:** `{ enabled:true, ok:false, reason: err.code ||
  'firebase-sign-out-error', message: err.message || 'Firebase sign-out
  failed.' }`. `auth/network-request-failed` gibi Firebase error code'ları
  olduğu gibi forward edilir.
- `MV.auth.firebase.clearSessionAfterSignOut(result)` bridge helper'ı
  eklendi — alpha.13 `createSessionFromResult` pattern'inin simetriği.
  Strict validation ile çağrılır; eksik veya hatalı bir result hiçbir
  koşulda session temizlemez.
- **Deliberate decoupling:** `signOut()` bu bridge'i **otomatik
  çağırmaz**. İki aşama (Firebase Auth signOut + local session clear)
  bağımsız test edilebilir. Devtools'tan manuel zincirleme:
  ```js
  const r = await MV.auth.firebase.signOut();
  if (r.ok) MV.auth.firebase.clearSessionAfterSignOut(r);
  ```
- **clearSessionAfterSignOut validation matrisi** (her biri reddedilir,
  session temizlenmez, dönüş `{ ok:false, reason:'invalid-firebase-
  sign-out-result' }`):
  - `result` falsy veya object değil
  - `result.enabled !== true`
  - `result.ok !== true`
  - `result.provider !== 'firebase-auth'`
  - `sessionStorage.removeItem` throw → `{ ok:false, reason:'session-
    clear-failed' }`
- **Başarı dönüşü:** `{ ok:true, cleared:true, provider:'firebase-auth' }`
- Bridge implementasyonu `sessionStorage.removeItem(SESSION_KEY)` çağrısını
  **inline** yapıyor (mevcut `logout()` ile aynı try/catch pattern'i).
  Self-contained — gelecekte `logout()` redirect/hook gibi yan etkiler
  kazanırsa bile bridge davranışı stabil kalır.
- **inspect() güncellemesi:** `capabilities` objesine yeni değerler:
  - `signOut`: `'live'` (isAuthReady true) | `'no-op'` (false). Eski
    sabit `'dry-run'` kaldırıldı.
  - `sessionBridge: 'available'` (yeni alan, alpha.13).
  - `logoutBridge: 'available'` (yeni alan, bu faz).
  `mode`, `signIn`, `onChange`, `currentUser` capability değerleri
  değişmedi.
- **signIn / createSessionFromResult / onChange / currentUser değişmedi.**
  Mock harness regression doğrulandı:
  - `signIn` placeholder ve ready phase'lerinde aynı sonuç + session
    auto-write yok.
  - `createSessionFromResult` valid input ile session yazıyor, invalid
    inputlarda yazmıyor.
  - `onChange` ready iken `ready-no-execute` simulated; callback
    tetiklenmiyor.
  - `currentUser` her durumda `null`.
- **Davranış matrisi (signOut):**
  | Faz | `isAuthReady` | `signOut()` | SDK signOut | Session |
  |---|---|---|---|---|
  | Default repo | false | `ok:false, reason:'placeholder'` | 0 | unchanged |
  | Ready + success | true | `ok:true, provider:'firebase-auth'` | 1 | unchanged (manuel bridge gerekli) |
  | Ready + reject | true | `ok:false, reason:err.code, message` | 1 | unchanged |
- **Side-effect kontrolü:** mock harness Phase A/B/C boyunca her
  wrapper'ı çağırdı. SDK call sayaçları doğru:
  - `signOut` SDK: yalnızca live + tüm guard'ları geçen çağrı sayısı kadar.
  - `firebase.auth()`: yalnızca live signIn/signOut çağrısı sayısı kadar.
  - `onAuthStateChanged`: **0** (callback tetiklenme: 0).
  - 7 invalid clearSessionAfterSignOut input testinde 0 session
    değişikliği.
- **Mevcut `MV.auth` API bit-identical:** `isAuthed`, `getUser`,
  `devLogin`, `requireAdmin`, `logout` davranışı, `SESSION_KEY`
  (`'mv_admin_session'`), `SESSION_TTL_MS` (8 saat), redirect path,
  sessionStorage payload şekli değişmedi. Mock harness devLogin →
  isAuthed → logout zinciri eski sonuçları üretti.
- Admin login formu ve dashboard logout akışı **henüz Firebase'e
  bağlanmadı**. Hiçbir HTML değişmedi. Wrapper aktivasyonu devtools'tan
  veya gelecek bir commit'ten gelir.
- `shared/config/firebase.js`, `shared/config/site.js`,
  `shared/config/firebase.local.example.js`, `.gitignore`, admin HTML
  dosyaları, `admin/borc/index.html`, `borc.html`, `index.html` ve
  diğer `shared/js/*` dosyaları **değişmedi**. Firestore SDK, CRUD,
  `onAuthStateChanged`, gerçek Firebase config commit edilmedi. Gerçek
  apiKey / projectId / appId / UID / email repo'ya girmedi.

## [v12.0.0-alpha.13] — Firebase Session Bridge

- `MV.auth.firebase.createSessionFromResult(result)` helper'ı eklendi.
  Başarılı bir `firebaseSignIn()` sonucunu mevcut sessionStorage tabanlı
  `mv_admin_session` gate'ine güvenli şekilde aktarır. Strict validation
  ile çağrılır; eksik veya hatalı bir result hiçbir koşulda session
  yazmaz.
- **Deliberate decoupling:** `signIn()` bu bridge'i **otomatik
  çağırmaz**. İki aşama (Firebase Auth çağrısı + local session yazımı)
  bağımsız test edilebilir. Admin formuna bağlanmadan önce devtools'tan
  manuel zincirleme yapılabilir:
  ```js
  const r = await MV.auth.firebase.signIn('admin@x','pw');
  if (r.ok) MV.auth.firebase.createSessionFromResult(r);
  ```
- **Validation matrisi** (her biri reddedilir, session yazılmaz,
  dönüş `{ ok:false, reason:'invalid-firebase-result' }`):
  - `result` falsy veya object değil
  - `result.enabled !== true`
  - `result.ok !== true`
  - `result.provider !== 'firebase-auth'`
  - `result.uid` string değil veya boş
  - `result.email` string değil veya boş
  - `sessionStorage.setItem` throw ederse →
    `{ ok:false, reason:'session-write-failed' }`
- **Yazılan session objesi** (mevcut `readSession()` doğrulamasıyla
  uyumlu):
  ```js
  {
    authed: true,            // readSession gate'i için
    username: result.email,  // getUser().username olarak görünür
    email: result.email,     // carry-through (getUser bunu döndürmez)
    uid: result.uid,         // carry-through
    loginAt: Date.now(),     // TTL hesaplaması için (8 saat)
    provider: 'firebase-auth'
  }
  ```
  `SESSION_KEY` (`'mv_admin_session'`) ve `SESSION_TTL_MS` (8 saat)
  değişmedi.
- **Başarı dönüşü:**
  ```js
  {
    ok: true,
    provider: 'firebase-auth',
    user: { uid, email, provider: 'firebase-auth', loginAt }
  }
  ```
- **Gate uyumluluğu** (mock harness doğrulandı):
  - `MV.auth.isAuthed()` Firebase-bridged session ile `true` döner.
  - `MV.auth.getUser()` `{ username:email, provider:'firebase-auth',
    loginAt }` döner — mevcut shape korunur.
  - `MV.auth.requireAdmin()` Firebase session varken `true` döner,
    redirect yapmaz; session yoksa `false` döner ve redirect yapar.
  - `MV.auth.logout()` Firebase-bridged session'ı da temizler
    (`SESSION_KEY` tek source-of-truth).
- **Diğer Firebase wrapper'ları değişmedi:** `signIn` alpha.12 live
  davranışı, `signOut` / `onChange` dry-run, `currentUser` null,
  `inspect` side-effect-free.
- **Mevcut `MV.auth` API bit-identical:** `isAuthed`, `getUser`,
  `devLogin`, `requireAdmin`, `logout` davranışı, `SESSION_KEY`,
  `SESSION_TTL_MS`, redirect path değişmedi. Mock harness'ta devLogin
  → isAuthed → logout zinciri eski sonuçları üretti.
- **Side-effect kontrolü:** 12 invalid input testinde 0 session
  yazımı; valid input testinde tam 1 session yazımı + okuma
  uyumluluğu. `signIn` live success path'inde **0 session yazımı**
  (caller'ın bridge'i manuel çağırması zorunlu).
- Admin login formu **henüz Firebase'e bağlanmadı**. Hiçbir HTML
  değişmedi; admin sayfaları hâlâ `MV.auth.devLogin` üzerinden çalışıyor.
- `shared/config/firebase.js`, `shared/config/site.js`,
  `shared/config/firebase.local.example.js`, `.gitignore`, admin HTML
  dosyaları, `admin/borc/index.html`, `borc.html`, `index.html` ve
  diğer `shared/js/*` dosyaları **değişmedi**. Firestore SDK, CRUD,
  `onAuthStateChanged`, gerçek Firebase config commit edilmedi. Gerçek
  apiKey / projectId / appId / UID / email repo'ya girmedi.

## [v12.0.0-alpha.12] — Guarded Firebase signIn Wrapper

- `MV.auth.firebase.signIn(email, password)` **LIVE** moduna geçirildi
  ama double-guard arkasında: yalnızca `MV_FIREBASE.isAuthReady() === true`
  iken gerçek `firebase.auth().signInWithEmailAndPassword(...)` çağrılır.
  Default repo placeholder config ile çalıştığı için **default'ta hâlâ
  no-op davranır.**
- **Guard sırası** (sıralı, ilk reddeden döner):
  1. `getFirebaseAuthReadiness().enabled === false` →
     `{ enabled:false, ok:false, reason:'<status>' }`. Reason değerleri:
     `'missing-loader'` | `'disabled'` | `'placeholder'` | `'error'`.
  2. email veya password string değil / boş →
     `{ enabled:true, ok:false, reason:'missing-credentials' }`.
  3. Email basic regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) geçmezse →
     `{ enabled:true, ok:false, reason:'invalid-email' }`.
  4. password < 6 karakter →
     `{ enabled:true, ok:false, reason:'invalid-password' }`.
  5. `getAuthProvider()` null veya `.auth` function değil →
     `{ enabled:true, ok:false, reason:'no-provider' }`.
  6. `provider.auth()` throw → `{ enabled:true, ok:false, reason:err.code
     || 'auth-init-error', message }`.
  7. Auth instance'da `signInWithEmailAndPassword` function değil →
     `{ enabled:true, ok:false, reason:'no-sign-in-method' }`.
- **Başarı dönüşü:**
  ```
  { enabled:true, ok:true, uid, email, provider:'firebase-auth' }
  ```
- **Hata dönüşü** (SDK Promise reject):
  ```
  { enabled:true, ok:false, reason: err.code || 'firebase-auth-error',
    message: err.message || 'Firebase sign-in failed.' }
  ```
  `auth/wrong-password`, `auth/user-not-found`, `auth/too-many-requests`
  gibi Firebase Auth error code'ları olduğu gibi forward edilir.
- `signOut()`, `onChange()`, `currentUser()` **hâlâ dry-run**. Ready
  iken `signOut` ve `onChange` `{ enabled:true, simulated:true,
  reason:'ready-no-execute' }` döner; `currentUser()` her durumda
  `null`. Bu metodlar hiçbir koşulda gerçek SDK çağırmaz.
- `inspect()` güncellendi: yeni alanlar `mode` ve `capabilities`.
  - `mode`: `'dry-run'` (isAuthReady false) | `'partial-live'`
    (isAuthReady true; signIn live, gerisi dry-run).
  - `capabilities`: `{ signIn: 'live'|'no-op', signOut: 'dry-run',
    onChange: 'dry-run', currentUser: 'dry-run' }`.
- **Mevcut `MV.auth` API bit-identical:** `isAuthed`, `getUser`,
  `devLogin`, `requireAdmin`, `logout` davranışı, `SESSION_KEY`
  (`'mv_admin_session'`), 8 saat TTL, redirect path değişmedi. Mock
  harness'ta dev login → isAuthed → logout zinciri aynı sonucu üretti.
- **Side-effect kontrolü:** mock harness Phase A/B/C boyunca her
  wrapper'ı çağırdı. SDK call sayaçları:
  - `signInWithEmailAndPassword`: yalnızca live + tüm guard'ları geçen
    çağrı sayısı kadar (validation guard'lar SDK'yı tetiklemedi).
  - `firebase.auth()`: yalnızca live signIn çağrısı sayısı kadar.
  - `signOut`: **0**, `onAuthStateChanged`: **0**, callback
    tetiklenme: **0**.
  - `sessionStorage`: clean — `signIn` mevcut session gate'ine
    dokunmuyor (caller, sonuçtaki `uid` ile devLogin/sessionStorage
    akışını ayrı bağlayacak).
- **Davranış matrisi:**
  | Faz | `isAuthReady` | `signIn(valid)` | SDK çağrısı |
  |---|---|---|---|
  | Default repo | false | `ok:false, reason:'placeholder'` | 0 |
  | Local config + opt-in (alpha.10) | true | `ok:true, uid, email` veya `ok:false, reason:err.code` | 1 / call |
- **Admin sayfaları bu wrapper'ı çağırmıyor.** Hiçbir HTML değişmedi;
  login formu hâlâ `MV.auth.devLogin` üzerinden sessionStorage gate
  kullanıyor. Wrapper aktivasyonu devtools'tan veya gelecek bir
  commit'ten gelir.
- `shared/config/firebase.js` (alpha.10 loader), `shared/config/site.js`,
  `shared/config/firebase.local.example.js`, `.gitignore`, admin HTML
  dosyaları, `admin/borc/index.html`, `borc.html`, `index.html` ve
  diğer `shared/js/*` dosyaları **değişmedi**. Firestore SDK, CRUD,
  deploy, emulator veya gerçek Firebase config commit edilmedi. Gerçek
  apiKey / projectId / appId / measurementId / UID / email repo'ya
  girmedi.

## [v12.0.0-alpha.11] — Firebase Auth Dry-run Inspection

- `MV.auth.firebase` namespace'i **dry-run** moduna geçirildi. Wrapper'lar
  hâlâ side-effect-free; gerçek SDK çağrısı yok. Fark: artık readiness
  durumuna göre iki ayrı dönüş şekli sunuyor.
- Yeni metod: `MV.auth.firebase.inspect()`. Yapılandırılmış snapshot
  döner:
  ```
  {
    enabled, reason, status,
    hasLoader, hasAuthSdk, isAuthReady, hasProvider,
    localConfig: { enabled, status },
    mode: 'dry-run'
  }
  ```
  Devtools'tan tek çağrıyla wiring durumu okunabilir. Side-effect yok
  (`MV_FIREBASE.getAuthProvider()` yalnızca namespace ref'i okur,
  `.auth()` çağrılmaz).
- `dormantResult()` → `dryRunResult()` olarak yeniden adlandırıldı.
  Davranış:
  - **Unready** (placeholder / missing-loader / disabled / error):
    eskisi gibi `{ enabled: false, reason: '<status>' }`.
  - **Ready** (gerçek config yüklü, app initialized, SDK var):
    `{ enabled: true, simulated: true, reason: 'ready-no-execute' }`.
- Wrapper davranışları:
  - `signIn(email, password)` → `Promise<dryRunResult>`. Ready iken bile
    `signInWithEmailAndPassword` **çağrılmaz**.
  - `signOut()` → `Promise<dryRunResult>`. Ready iken bile
    `firebase.auth().signOut()` **çağrılmaz**, sessionStorage'a
    dokunulmaz.
  - `onChange(callback)` → `{ enabled, simulated?, reason, unsubscribe }`.
    Ready iken bile `onAuthStateChanged` **çağrılmaz**, callback
    tetiklenmez, unsubscribe no-op.
  - `currentUser()` → her zaman `null` (ready iken bile auth instance
    okunmaz — spec gereği).
- **Anlam:** gerçek Firebase config (alpha.9/10 yollarıyla) yüklendiğinde
  bile `MV.auth.firebase` katmanı sadece "şu an gerçek login
  yapabilirdim" sinyali döner — alpha.12'de gerçek SDK çağrı yapısının
  açılmadan önce sahada doğrulanabilir hale gelir.
- **Mevcut `MV.auth` API bit-identical:** `isAuthed`, `getUser`,
  `devLogin`, `requireAdmin`, `logout` davranışı, `SESSION_KEY`
  (`'mv_admin_session'`), 8 saat TTL, redirect path değişmedi. Mock
  harness'ta dev login → isAuthed → logout zinciri aynı sonucu üretti.
- **Side-effect kontrolü:** mock harness placeholder + ready iki fazda
  her wrapper'ı çağırdı; SDK call sayaçları **0**:
  `firebase.auth()=0`, `signInWithEmailAndPassword=0`, `signOut=0`,
  `onAuthStateChanged=0`. `onChange` callback hiç tetiklenmedi.
  `currentUser()` her iki fazda da `null` döndü. `sessionStorage` clean
  bırakıldı (logout sonrası absent).
- `shared/config/firebase.js` (alpha.10 loader), admin HTML dosyaları,
  `admin/borc/index.html`, `borc.html`, `index.html`,
  `shared/config/site.js`, `shared/config/firebase.local.example.js`,
  `.gitignore` ve diğer `shared/js/*` dosyaları **değişmedi**.
  Firestore SDK, CRUD, deploy veya gerçek config commit edilmedi.
  Gerçek apiKey / projectId / appId / measurementId / UID / email
  repo'ya girmedi.

## [v12.0.0-alpha.10] — Opt-in Local Firebase Config Loader

- `shared/config/firebase.js` safe loader'a **default kapalı** bir local
  config auto-loader eklendi. Aktif olduğunda `shared/config/firebase.local.js`
  dosyasını `firebase.js`'in sibling'i olarak dinamik `<script>` ile
  yükler ve `window.MV_FIREBASE_CONFIG`'i hazır ederek `init()`'i
  retry'lar. Default repo davranışı **bit-identical** kalır: hiçbir
  ek script tag, hiçbir 404, hiçbir network isteği oluşmaz.
- **Opt-in koşulları (script-eval anında değerlendirilir):**
  - `window.MV_FIREBASE_AUTO_LOAD_LOCAL === true` (explicit flag —
    her host'ta çalışır, kodla deliberate seçimdir), VEYA
  - URL'de `?mvFirebaseLocal=1` (veya `=true`) **VE** host
    `localhost` / `127.0.0.1` / `0.0.0.0` / `file:` olduğunda.
  - Production-like host'ta `?mvFirebaseLocal=1` no-op'tur; loader
    `'off'` durumunda kalır.
- **Race-safe init retry:** local script `firebase.js` IIFE evaluation
  sırasında head'e eklenir. Admin sayfasının inline `MV_FIREBASE.init(window.firebase)`
  çağrısı bu yükleme bitmeden tetiklenirse: ilk `init()` placeholder
  döner ama `state.firebaseNamespace` saklanır. Local script `onload`'ı
  geldiğinde `tryRetryInit()` aynı namespace ile `api.init()`'i tekrar
  çağırır; config bu kez `looksReal()` geçtiği için `firebase.initializeApp(...)`
  bir kez çalışır ve status `'ready'` olur. Çift-init yok.
- **Hata tolerans:** dosya 404 dönerse veya yükleme hata verirse
  `onerror` sessizce yutulur, `getLocalConfigStatus()` `'error'`
  olur, sayfa bozulmaz. Console spam yok (debug log yalnızca
  `MV_DEBUG_FIREBASE === true` ise).
- **Yeni public helper'lar** (`MV_FIREBASE` üzerinde, side-effect kontrollü):
  - `isLocalConfigLoadEnabled()` — opt-in koşulları şu an geçerli mi?
  - `getLocalConfigStatus()` — `'off' | 'skipped' | 'loading' |
    'loaded' | 'error'`. Default `'off'`.
  - `loadLocalConfig()` — manuel trigger. Idempotent (ikinci çağrıda
    sadece mevcut status'u döner, ikinci script tag eklemez).
- **Path resolution:** `document.currentScript.src`'den base path
  hesaplanır (`.../shared/config/firebase.js` → `.../shared/config/firebase.local.js`).
  `currentScript` mevcut değilse (module script, eski tarayıcı vs.)
  status `'skipped'` olur — yine page-safe.
- `shared/config/firebase.local.example.js` güncellendi: artık iki yolu
  (manuel script tag — Path A vs. opt-in auto-loader — Path B) açıkça
  belgeliyor; gerçek değer yok, sadece placeholder.
- **Mevcut API yüzeyi bit-identical:** `configured`, `status`, `config`,
  `note`, `getConfig`, `isConfigured`, `isAvailable`, `isEnabled`,
  `hasAuthSdk`, `isAuthReady`, `getFirebaseNamespace`, `getAuthProvider`,
  `hasExternalConfig`, `getExternalConfig`, `resolveConfig`, `init`,
  `getApp`, `getStatus`, `getLastError` davranışları değişmedi.
- **No-side-effect kontrolü:** mock harness 9 senaryoda doğrulandı.
  Tüm başarılı yollar dahil `auth()` çağrı sayacı **0**:
  `signInWithEmailAndPassword`, `signOut`, `onAuthStateChanged` çağrısı
  yok. Firestore SDK eklenmedi. Gerçek API key / projectId / appId /
  measurementId / UID / email repo'ya girmedi.
- `.gitignore`, admin HTML dosyaları, `admin/borc/index.html`,
  `borc.html`, `index.html`, `shared/js/auth.js`, `shared/config/site.js`
  ve diğer `shared/js/*` dosyaları **değişmedi**. `MV.auth.firebase`
  wrapper'ı (alpha.8) hâlâ dormant. Mevcut login, logout ve
  sessionStorage tabanlı admin gate davranışı aynen korunuyor. Borç
  paneli ve public site etkilenmedi.

## [v12.0.0-alpha.9] — Gated Firebase Config Injection

- `shared/config/firebase.js` safe loader'a **opt-in** config injection
  desteği eklendi: `window.MV_FIREBASE_CONFIG` global'i tanımlı ve
  `looksReal()` denetiminden geçen bir objeyse, `init()` placeholder
  config yerine bunu kullanır ve `firebase.initializeApp(...)` ile
  uygulamayı başlatır. Aksi halde mevcut placeholder davranış aynen
  sürer; loader yine `'placeholder'` durumunda kalır ve
  `initializeApp` çağrılmaz.
- Yeni inspection helper'ları (hepsi side-effect-free):
  - `hasExternalConfig()` — `window.MV_FIREBASE_CONFIG` bir object ise
    `true`. Object-değil tipler (string, sayı vs.) `false`.
  - `getExternalConfig()` — ham external config objesi veya `null`.
    Validation yapmaz.
  - `resolveConfig()` — `looksReal(external)` ise external'i,
    değilse built-in `placeholderConfig`'i döner. Loader içinde
    `init()` de aynı kararı uygular.
- Internal `readExternalConfig()` helper: `window.MV_FIREBASE_CONFIG`'i
  güvenli şekilde okur (try/catch), object değilse `null` döner.
  Erişim hataları yutulur.
- **`init()` akışı:** namespace sanity check → namespace yakalanır →
  external config okunur ve `looksReal()` geçerse `state.config`'e
  yazılır → `looksReal(state.config)` placeholder gate'i → gerçek ise
  `firebase.initializeApp(state.config)` çağrılır. Mevcut sıralama,
  hata yönetimi ve geriye uyumlu API yüzeyi korunur.
- Yeni dosya: `shared/config/firebase.local.example.js` — yalnızca
  placeholder değerlerle (`'YOUR_API_KEY'` vb.) bir şablon. Üst kısımda
  "DO NOT commit real values" uyarıları ve nasıl bağlanacağına dair
  notlar var. Bu dosya commitleniyor ama loader'a referansı yok;
  manuel olarak `firebase.local.js`'e kopyalanıp HTML'den yüklenir.
- `.gitignore` güncellendi: `shared/config/firebase.local.js` ignore
  edildi. Örnek dosya (`firebase.local.example.js`) commit'lenebilir
  kalır; gerçek local config (`firebase.local.js`) git'e **giremez**.
- **Geriye uyumluluk:** mevcut tüm API yüzeyi
  (`configured`, `status`, `config`, `note`, `getConfig`,
  `isConfigured`, `isAvailable`, `isEnabled`, `hasAuthSdk`,
  `isAuthReady`, `getFirebaseNamespace`, `getAuthProvider`, `init`,
  `getApp`, `getStatus`, `getLastError`) bit-identical davranıyor.
  Default repo'da `window.MV_FIREBASE_CONFIG` tanımlı olmadığı için
  placeholder yol seçilir ve hiçbir admin sayfası davranışı değişmez.
- **No-side-effect kuralı:** helper'lar veya `init()` placeholder branch'i
  network isteği, DOM mutation, storage erişimi veya Auth listener
  oluşturmaz. Mock harness'ta config-real başarı yolu bile `auth()`
  call sayacını 0'da bıraktı.
- `shared/js/auth.js` (alpha.8 wrapper'ı dahil), admin HTML, borç
  paneli ve public site **değişmedi**. Firestore SDK, CRUD, Auth
  sign-in, gerçek Firebase config değerleri eklenmedi. Gerçek
  apiKey/projectId/appId/measurementId, UID, email, parola repo'ya
  girmedi.

## [v12.0.0-alpha.8] — Passive Firebase Auth Wrapper

- `shared/js/auth.js` içine pasif `MV.auth.firebase` alt-namespace'i
  eklendi. Wrapper'lar **double guard** arkasında çalışır:
  `window.MV_FIREBASE` yok veya `isAuthReady() === false` ise her metod
  no-op döner. Bu fazda config placeholder olduğu için her çağrı
  no-op'tur.
- Yeni metodlar:
  - `MV.auth.firebase.isReady()` — `{ enabled, reason }` döner.
    Reason değerleri: `'missing-loader'` | `'disabled'` |
    `'placeholder'` | `'error'` | `'ready'`. Side-effect yok.
  - `MV.auth.firebase.signIn(email, password)` —
    `Promise<{ enabled:false, reason }>` döner.
    `signInWithEmailAndPassword` **çağrılmaz**.
  - `MV.auth.firebase.signOut()` —
    `Promise<{ enabled:false, reason }>` döner.
    `firebase.auth().signOut()` **çağrılmaz**, sessionStorage'a
    dokunulmaz.
  - `MV.auth.firebase.onChange(callback)` —
    `{ enabled:false, reason, unsubscribe: fn }` döner.
    `onAuthStateChanged` **çağrılmaz**, callback tetiklenmez,
    unsubscribe no-op.
  - `MV.auth.firebase.currentUser()` — `null` döner.
    `firebase.auth().currentUser` okunmaz.
- Internal helper'lar (IIFE-scoped, dışa açılmadı):
  `getFirebaseAuthReadiness()`, `dormantResult()`.
- **Geriye uyumluluk:** mevcut `MV.auth.isAuthed`, `MV.auth.getUser`,
  `MV.auth.devLogin`, `MV.auth.logout`, `MV.auth.requireAdmin` davranışı
  bit-identical. `SESSION_KEY` (`'mv_admin_session'`), 8 saat TTL,
  redirect path, login form akışı değişmedi. Mock harness'ta dev login
  → isAuthed → logout zinciri aynı sonucu üretti.
- **Side-effect kontrolü:** mock Firebase namespace enjekte edilip
  `MV_FIREBASE.init()` çağrıldıktan sonra bile her wrapper çağrısı
  sonrası sayaçlar: `initializeApp=0`, mock `auth()=0`,
  `signInWithEmailAndPassword=0`, `signOut=0`, `onAuthStateChanged=0`.
  Wrapper'lar Auth instance oluşturmadı, network/DOM/storage'a
  dokunmadı, callback tetiklemedi.
- Hiçbir admin sayfası bu wrapper'ları çağırmıyor; yalnızca scaffold
  olarak yer alıyor. Gerçek sign-in akışı gelecek fazda, aynı readiness
  guard arkasında wrapper gövdeleri değiştirilerek aktive edilecek.
- `admin/*.html`, `admin/borc/index.html`, `borc.html`, `index.html`,
  `shared/config/firebase.js`, `shared/config/site.js` değişmedi.
  Firestore SDK, CRUD, deploy, gerçek Firebase config eklenmedi.

## [v12.0.0-alpha.7] — Firebase Auth Readiness Helpers

- `shared/config/firebase.js` safe loader'a beş yeni **pasif** helper
  fonksiyonu eklendi:
  - `isEnabled()` — `isAvailable()` ile aynı semantik (alias). Yalnızca
    gerçek config + başarılı `initializeApp` durumunda `true`. Placeholder,
    SDK yok veya hata varsa `false`.
  - `hasAuthSdk()` — `init()` sırasında yakalanan Firebase namespace'inde
    `auth` özelliğinin function olduğunu kontrol eder. `firebase.auth()`'u
    **çağırmaz**; salt namespace varlık denetimi.
  - `isAuthReady()` — `isAvailable() && hasAuthSdk()`. Placeholder
    config'te `false`, app init edilmemişse `false`.
  - `getFirebaseNamespace()` — `init()` çağrısında saklanan namespace'i
    veya `null` döner. Sadece inspection helper.
  - `getAuthProvider()` — `isAuthReady()` `true` ise namespace'i,
    değilse `null` döner. **Bu fazda hiçbir koşulda `firebase.auth()`
    çağırmaz**, Auth instance veya listener oluşturmaz.
- Internal state'e yeni alan: `state.firebaseNamespace`. `init()`
  içinde, namespace sanity check'ten **sonra** ama placeholder
  gate'inden **önce** saklanır → placeholder config bile olsa
  `hasAuthSdk()` SDK varlığını doğru raporlar, ama `isAvailable()` /
  `isAuthReady()` `false` kalmaya devam eder.
- **Geriye uyumluluk:** `configured`, `status`, `config`, `note`,
  `getConfig()`, `isConfigured()`, `isAvailable()`, `init()`, `getApp()`,
  `getStatus()`, `getLastError()` davranışı bit-identical.
  Placeholder config altında `init(window.firebase)` hâlâ sessizce
  `false` döner ve `getStatus()` `'placeholder'` kalır.
- **Side-effect kontrolü:** yeni helper'ların hiçbiri
  `firebase.initializeApp(...)`, `firebase.auth()`, network isteği,
  Auth state listener, DOM, sessionStorage veya localStorage'a
  dokunmaz.
- `shared/js/auth.js`, admin HTML dosyaları, `admin/borc/index.html`,
  `borc.html` ve public site (`index.html`) **değişmedi**. Auth wrapper,
  login davranış değişikliği, Firestore SDK, CRUD, deploy veya gerçek
  Firebase config eklenmedi. `signInWithEmailAndPassword`,
  `onAuthStateChanged`, `getFirestore` yok.
- Mevcut login, logout ve sessionStorage tabanlı admin gate davranışı
  değiştirilmedi.

## [v12.0.0-alpha.6] — Firebase Auth SDK Passive Load

- Borç paneli dışındaki admin sayfalarına Firebase Auth **compat** SDK
  script tag'i passive şekilde eklendi (10.8.1):
  - `admin/index.html`
  - `admin/dashboard.html`
  - `admin/announcements.html`
  - `admin/events.html`
  - `admin/apps.html`
  - `admin/logs.html`
- SDK URL:
  `https://www.gstatic.com/firebasejs/10.8.1/firebase-auth-compat.js`
  (App SDK ile aynı sürüm; compat formu kullanılıyor, böylece namespace
  `window.firebase.auth` olarak hazır olur).
- Konum: shared script bloğunda `firebase-app-compat.js`'in **hemen
  ardına**, `../shared/config/firebase.js` loader'ının **öncesine**
  eklendi. Yeni sıra:
  `site.js → firebase-app-compat.js → firebase-auth-compat.js →
  firebase.js → core.js → theme.js → auth.js`.
- **Davranış:** admin sayfaları yüklendiğinde `window.firebase` ve
  `window.firebase.auth` artık tanımlı; ancak `MV_FIREBASE.init()` hâlâ
  placeholder config algılayıp `initializeApp`'i çağırmaz, sessizce
  `false` döner ve `getStatus()` `'placeholder'` olarak kalır.
  `firebase.auth()` çağrılmadığı için Auth state listener, login, logout
  veya Auth backend isteği oluşmaz.
- **Network etkisi:** admin sayfaları artık her load'da ikinci bir CDN
  GET'i atar (`firebase-auth-compat.js`). Firebase Auth backend'e
  (`identitytoolkit.googleapis.com`, `securetoken.googleapis.com`) veya
  Firestore'a hiçbir istek yok.
- Firestore SDK, Auth wrapper, CRUD, deploy veya gerçek Firebase config
  eklenmedi. Hiçbir `firebase.auth()`, `firebase.initializeApp(...)`
  doğrudan çağrısı, `signInWithEmailAndPassword(...)`,
  `onAuthStateChanged(...)`, `getFirestore(...)` yok.
- `shared/js/auth.js` değiştirilmedi; sessionStorage tabanlı `MV.auth`
  gate'i aynen korunuyor.
- `admin/borc/index.html`, `borc.html` ve public site (`index.html`)
  dokunulmadı; borç paneli kendi modular Firebase setup'ını ve iki
  katmanlı gate'ini korumaya devam ediyor.
- Mevcut login, logout ve sessionStorage tabanlı admin gate davranışı
  değiştirilmedi.

## [v12.0.0-alpha.5] — Firebase App SDK Passive Load

- Borç paneli dışındaki admin sayfalarına Firebase App **compat** SDK
  script tag'i passive şekilde eklendi (10.8.1):
  - `admin/index.html`
  - `admin/dashboard.html`
  - `admin/announcements.html`
  - `admin/events.html`
  - `admin/apps.html`
  - `admin/logs.html`
- SDK URL:
  `https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js`
  (borç paneli ile aynı SDK sürümü; borç paneli modular form kullanırken
  admin sayfaları compat form kullanıyor — `window.firebase` global'i
  için).
- Konum: shared script bloğunda `site.js`'in hemen ardına,
  `firebase.js` loader'ının **öncesine** eklendi → loader çalıştığında
  `window.firebase` global'i hazır olur.
- **Davranış:** admin sayfaları yüklendiğinde `window.firebase` artık
  tanımlı; ancak `shared/config/firebase.js` loader'ı placeholder config
  algılar ve **`initializeApp`'i çağırmaz**. `MV_FIREBASE.init()`
  sessizce `false` döner, `getStatus()` `'placeholder'` olur.
  Davranışsal etki sıfır.
- **Network etkisi:** admin sayfaları artık her load'da
  `firebase-app-compat.js` CDN dosyası için bir GET isteği atar
  (~70 KB minified+gzip). Firebase backend'e (Auth, Firestore, Functions)
  hiçbir istek atılmıyor.
- Firebase Auth SDK, Firestore SDK, CRUD, deploy veya gerçek Firebase
  config eklenmedi. Hiçbir `firebase.initializeApp(...)` doğrudan
  çağrısı, `getAuth(...)`, `signInWithEmailAndPassword(...)`,
  `getFirestore(...)`, `onAuthStateChanged(...)` yok.
- `admin/borc/index.html`, `borc.html` ve public site (`index.html`)
  dokunulmadı; borç paneli kendi modular Firebase setup'ını ve iki
  katmanlı gate'ini korumaya devam ediyor.
- Mevcut login, logout ve sessionStorage tabanlı admin gate davranışı
  değiştirilmedi.

## [v12.0.0-alpha.4] — Firebase Init Call-site

- Borç paneli dışındaki admin sayfalarına fail-safe
  `MV_FIREBASE.init(window.firebase)` çağrı noktası eklendi:
  - `admin/index.html`
  - `admin/dashboard.html`
  - `admin/announcements.html`
  - `admin/events.html`
  - `admin/apps.html`
  - `admin/logs.html`
- Call-site konumu: her admin sayfasında shared script bloğunun
  (`site.js` → `firebase.js` → `core.js` → `theme.js` → `auth.js`,
  `apps.html`'de + `apps.js`) hemen ardına, ayrı küçük bir `<script>`
  bloğu olarak. Mevcut inline IIFE bloklarına dokunulmadı.
- Çağrı `window.MV_FIREBASE` ve `init` fonksiyon kontrolüyle guard
  edildi; `MV_FIREBASE` tanımsız bile olsa ReferenceError oluşmaz.
- Firebase SDK hâlâ eklenmediği için `window.firebase` tanımsız;
  loader'ın fail-safe yolu devreye girer ve `init()` sessizce `false`
  döner. `MV_FIREBASE.getStatus()` `'disabled'` olarak kalır.
- Auth wrapper, Firestore, CRUD, deploy veya gerçek Firebase config
  eklenmedi. Hiçbir `firebase.initializeApp(...)`, `getAuth(...)`,
  `signInWithEmailAndPassword(...)`, `getFirestore(...)`,
  `onAuthStateChanged(...)` çağrısı yok.
- `admin/borc/index.html`, `borc.html` ve public site (`index.html`)
  dokunulmadı; borç paneli kendi iki katmanlı gate'ini ve inline
  `firebaseConfig`'ini korumaya devam ediyor.
- **Davranışsal etki:** sıfır. Mevcut login, logout, sessionStorage
  tabanlı admin gate, modül akışları aynen çalışıyor; tek fark her
  admin sayfa load'unda fail-safe init çağrısının canlı çalıştırılıyor
  olması (sonucu silently `false`).

## [v12.0.0-alpha.3] — Firebase Loader Script Order

- Admin sayfalarındaki passive Firebase loader script'inden `defer`
  attribute'u kaldırıldı:
  - `admin/index.html`
  - `admin/dashboard.html`
  - `admin/announcements.html`
  - `admin/events.html`
  - `admin/apps.html`
  - `admin/logs.html`
- Yeni script sırası deterministik:
  `site.js` → `firebase.js` → `core.js` → `theme.js` → `auth.js`
  (alpha.2'de `defer` nedeniyle `firebase.js` non-defer scriptlerden sonra
  çalışıyordu; artık inline sırasında çalışır, sonraki fazlarda
  auth wrapper'ın `MV_FIREBASE`'i deterministik şekilde okumasına zemin
  hazırlandı).
- Firebase SDK script tag, Auth init, Auth wrapper, Firestore, CRUD veya
  deploy eklenmedi.
- `admin/borc/index.html`, `borc.html` ve public site (`index.html`)
  dokunulmadı.
- `shared/config/firebase.js` loader içeriği değişmedi.
- **Davranışsal etki:** sıfır. `window.MV_FIREBASE` global'i hâlâ pasif
  `status: 'disabled'` state ile dolar; hiçbir auth/login/modül davranışı
  değişmedi.

## [v12.0.0-alpha.2] — Passive Firebase Loader Integration

- `shared/config/firebase.js` loader'ı borç paneli dışındaki admin
  sayfalarına passive `<script src="../shared/config/firebase.js" defer></script>`
  olarak eklendi:
  - `admin/index.html`
  - `admin/dashboard.html`
  - `admin/announcements.html`
  - `admin/events.html`
  - `admin/apps.html`
  - `admin/logs.html`
- Script konumu: mevcut `shared/config/site.js`'in hemen ardına, mevcut
  script sırası bozulmadan eklendi (config'ler birlikte gruplandı).
- `defer` attribute kullanıldı; mevcut non-defer scriptlerden sonra
  çalışır, davranış sırasını bozmaz.
- `admin/borc/index.html` ve `borc.html` dokunulmadı; borç paneli kendi
  iki katmanlı gate'ini ([`debt-panel-audit.md`](docs/debt-panel-audit.md) §1)
  korumaya devam ediyor.
- Public site (`index.html`), `shared/js/auth.js`, `shared/config/site.js`
  ve `shared/config/firebase.js` dokunulmadı.
- Firebase SDK script tag, Auth init, Firestore, CRUD veya deploy
  eklenmedi.
- Hiçbir HTML'de `MV_FIREBASE.init(...)`, `firebase.initializeApp(...)`,
  `getAuth(...)`, `signInWithEmailAndPassword(...)` çağrısı yok.
- **Davranışsal etki:** admin sayfaları yüklendiğinde `window.MV_FIREBASE`
  global'i pasif `status: 'disabled'` state ile tanımlanır; başka hiçbir
  şey değişmez. Auth akışı, login, logout, modül davranışları aynı.

## [v12.0.0-alpha.1] — Firebase Config Safe Loader

- `shared/config/firebase.js` dormant placeholder safe loader iskeletine
  genişletildi (v10.0-alpha'dan beri repo'da var olan no-op IIFE dosyası
  yeni baştan yazılarak fail-safe API yüzeyine kavuşturuldu — yeni dosya
  oluşturulmadı).
- API yüzeyi: `configured`, `status`, `config`, `note`, `getConfig()`,
  `isConfigured()`, `isAvailable()`, `init(fbNamespace)`, `getApp()`,
  `getStatus()`, `getLastError()`. Backward-compat alanlar (`configured`,
  `config`, `note`) korundu.
- Placeholder algılama: boş string, `null`/`undefined`, `YOUR_*` literal
  listesi (`YOUR_API_KEY`, `YOUR_PROJECT_ID`, `YOUR_APP_ID` vb.) ve
  `<UPPER_SNAKE>` angle-bracket pattern'leri.
- Fail-safe davranış: Firebase namespace yoksa, config yoksa veya
  placeholder config algılanırsa `init()` sessizce `false` döner; hata
  durumunda exception yakalanır ve `getLastError()` üzerinden okunur,
  sayfa bozulmaz. Debug log opt-in (`window.MV_DEBUG_FIREBASE = true`).
- Gerçek Firebase API key / projectId / appId / measurementId / authDomain
  yazılmadı; yalnız `YOUR_*` placeholder değerleri.
- Firebase SDK script tag, `firebase.json`, `.firebaserc`,
  `firestore.rules`, `firestore.indexes.json` eklenmedi.
- **Hiçbir HTML dosyası bu script'i yüklemediği için runtime davranışı
  değişmedi.** Borç paneli, public site ve admin auth akışı etkilenmedi.
- Firestore bağlantısı / write / CRUD / deploy / emulator yok.

## [v11.6.1] — Firebase Project Setup Checklist

- `docs/firebase-project-setup.md` eklendi.
- v12.0.0-alpha öncesi staging / production Firebase project hazırlığı
  belgelendi (project strategy, Console setup, Auth, Firestore, App
  Check checklists).
- Alias plan (`staging` / `prod`), config policy (client config secret
  değil, Rules + Auth + App Check güvenliktir), admin whitelist
  bootstrap planı ve "what must not be committed" listesi yazıldı.
- Borç paneli özel setup notları eklendi (mevcut Firebase project
  paylaşımı / izolasyonu, gerçek borç verisi staging'e taşınmaz).
- v12.0.0-alpha pre-flight checklist eklendi.
- **Dokümantasyon tutarsızlığı düzeltildi:**
  `shared/config/firebase.js` dosyası v10.0-alpha'dan beri repo'da
  dormant placeholder olarak mevcut (no-op IIFE; hiçbir HTML yüklemiyor;
  runtime etkisi yok). Önceki dokümanlar "mevcut değildir" / "yeni
  dosya" diyordu — yanlış. `docs/firebase-transition-plan.md` §1 ve
  `docs/v12-readiness.md` §3 / §5 / §7 ifadeleri "var olan placeholder
  v12.0.0-alpha'da safe loader olarak genişletilebilir" olarak
  güncellendi.
- `docs/README.md` güncellendi: yeni setup dokümanı Current Documents
  altına eklendi.
- Runtime dosyalara dokunulmadı (`shared/config/firebase.js` dahil —
  yalnız var olduğu doğru kayda alındı).
- Firebase SDK / config / kod eklenmedi.
- `firebase.json`, `.firebaserc`, `firestore.rules`,
  `firestore.indexes.json` oluşturulmadı.
- Gerçek Firebase project ID / API key / UID / e-mail / secret
  dokümana yazılmadı; yalnız placeholder kullanıldı.

## [v11.6.0] — v12 Readiness Summary

- `docs/v12-readiness.md` eklendi.
- v11 boyunca tamamlanan işler (public portal, admin dashboard,
  read-only modüller, documentation, Firebase planning, debt panel
  protection) özetlendi.
- Mevcut dokümanlar tablosu, v12.0.0-alpha scope + out-of-scope listesi
  ve runtime dokunma matrisi belgelendi.
- Önerilen v12.0.0-alpha commit planı (Firebase config placeholder,
  auth wrapper, dev gate guard, no Firestore write, smoke test) yazıldı.
- v12 entry criteria, kalan riskler ve Go/Hold karar matrisi eklendi.
- `docs/README.md` güncellendi: yeni readiness dokümanı Current Documents
  altına eklendi.
- Runtime dosyalara dokunulmadı.
- Firebase SDK / config / kod eklenmedi.
- `firebase.json`, `.firebaserc`, `firestore.rules`,
  `firestore.indexes.json` oluşturulmadı; deploy komutu çalıştırılmadı.

## [v11.5.4] — Deployment Checklist

- `docs/deployment-checklist.md` eklendi.
- Environment strategy (local / emulator-staging / production)
  belgelendi; veri akış kuralı ve production verisi izolasyonu
  netleştirildi.
- Firebase / Auth / Firestore Rules / App Check / debt panel
  deployment kontrolleri belgelendi.
- Pre-deployment, smoke test, rollback ve Go/No-Go karar şablonları
  eklendi.
- Deployment log template şablonu yazıldı.
- `docs/README.md` güncellendi: yeni checklist dokümanı Current
  Documents altına taşındı; planlanan listeden çıkarıldı.
- Runtime dosyalara dokunulmadı.
- Firebase SDK / config / kod eklenmedi.
- `firebase.json`, `.firebaserc`, `firestore.rules`,
  `firestore.indexes.json` oluşturulmadı; deploy komutu
  çalıştırılmadı; emulator kurulmadı.

## [v11.5.3] — Firebase Rules Test Plan

- `docs/firebase-rules-test-plan.md` eklendi.
- Firestore Security Rules için rol bazlı pozitif/negatif test
  senaryoları belgelendi (anonymous, authenticated non-admin, viewer,
  admin, owner ve disabled admin rolleri).
- Borç paneli için özel test senaryoları (D-01 … D-14) eklendi; public
  read deny, audit logging gereksinimleri ve regression kontrolü
  tanımlandı.
- Read/write beklenti matrisi, emulator test stratejisi, test data
  placeholder şeması, expected report template, deployment gate
  checklist ve rollback planı yazıldı.
- `docs/README.md` güncellendi: yeni test plan dokümanı Current Documents
  altına taşındı; planlanan listeden çıkarıldı.
- Runtime dosyalara dokunulmadı.
- Firebase SDK / config / kod eklenmedi.
- `firebase.json`, `.firebaserc`, `firestore.rules`,
  `firestore.indexes.json` oluşturulmadı; emulator kurulmadı.

## [v11.5.2] — Debt Panel Security Audit

- `docs/debt-panel-audit.md` eklendi.
- Borç panelinin mevcut gate (dış `MV.auth` + iç Firebase Auth),
  storage (Firestore koleksiyonları + localStorage/sessionStorage
  key'leri), yönlendirme zinciri ve risk haritası read-only olarak
  belgelendi.
- `docs/README.md` güncellendi: yeni audit dokümanı Current Documents
  altına taşındı; planlanan listeden çıkarıldı.
- Runtime dosyalara dokunulmadı.
- Firebase SDK / config / kod eklenmedi.

## [v11.5.0] — Documentation Index & Changelog

- `CHANGELOG.md` (bu dosya) eklendi.
- `docs/README.md` (doküman indeksi) eklendi.
- Repo kökü `README.md` eklendi.
- v12 Firebase fazı öncesi dokümantasyon yapısı netleştirildi.
- Runtime kodu değişmedi.

## [v11.4.0] — Firebase Transition Plan

- `docs/firebase-transition-plan.md` eklendi.
- Firebase Auth akışı, Firestore koleksiyon planı, collection şemaları,
  read/write matrisi ve security rules taslak mantığı belgelendi.
- v12.0 → v12.6 uygulama roadmap'i tanımlandı.
- Borç paneli için özel güvenlik politikası (Debt Panel Special Policy)
  yazıldı.
- Runtime dosyalara dokunulmadı.

## [v11.3.1] — Read-only Admin Modules UX

- Admin modül sayfalarına skip-to-content link eklendi.
- announcements, events, apps modüllerine read-only arama / filtre eklendi.
- apps modülüne ek olarak Tümü / Public / Admin segmented filtresi geldi.
- 3 modüle kapalı `<details>` raw JSON viewer eklendi (`textContent` ile
  XSS güvenli).
- logs sayfasına Firebase `adminLogs` bilgi kartı eklendi.
- Firebase / CRUD / kalıcı veri yazma eklenmedi.

## [v11.3.0] — Read-only Admin Module Scaffolds

- `admin/announcements.html`, `admin/events.html`, `admin/apps.html`,
  `admin/logs.html` oluşturuldu.
- 4 modül için ortak görsel iskelet `admin/admin-modules.css` eklendi.
- Dashboard'daki "Yakında" kartları gerçek modül linklerine dönüştürüldü;
  "Read-only" rozetleriyle dürüstlük korundu.
- `MV.auth.requireAdmin` gate her sayfada zorunlu tutuldu.

## [v11.2.0] — Admin Command Center

- Admin login (`admin/index.html`) görsel olarak cilalandı; "Yetkili
  Yönetim Alanı" rozeti, optimize logo asset (srcset 1x/2x) ve alt
  bilgi satırı eklendi.
- Admin dashboard sidebar yapısından tek-kolon Command Center yapısına
  dönüştürüldü.
- Hero, 4 stat kartı, hızlı erişim kartları, statik sistem durumu ve
  sürüm timeline'ı eklendi.
- Auth / logout / saat tick davranışı korundu.

## [v11.1.5] — Logo Asset Optimization

- `assets/logo-mark-64.png` (5.3 KB) ve `assets/logo-mark-128.png`
  (16.7 KB) üretildi.
- Ana sayfada büyük `assets/logo.png` (~1.21 MB) yerine küçük asset
  kullanılmaya başlandı; retina için `srcset 1x/2x`.
- Orijinal `assets/logo.png` korundu; ~%98.6 bandwidth tasarrufu.

## [v11.1.4] — Mobile Navigation Accessibility

- Mobil menü için focus-trap eklendi (Tab / Shift+Tab cycle,
  Escape ile burger'a dönüş).
- Body scroll-lock (`mv-nav-open` class) eklendi; yalnız mobile media
  query altında devrede.
- Nav ve footer logosuna `width`/`height` ile CLS mikro düzeltmesi yapıldı.

## [v11.1.3] — Accessibility and Mobile Navigation

- Mobil burger menü çalışır hale getirildi; aç/kapa, link click,
  backdrop click ve Escape ile kapanış.
- Skip-to-content linki eklendi.
- Hero `aria-labelledby`, tema butonları `aria-pressed` / anlamlı
  `aria-label`, Discord linkleri `rel="noopener noreferrer"` ile
  bütünleştirildi.

## [v11.1.2] — Favicon and Social Preview Assets

- 16/32/180/192/512 boyutlarında favicon zinciri eklendi.
- `site.webmanifest` oluşturuldu.
- `assets/og-card.png` (1200×630) sosyal paylaşım görseli olarak
  Open Graph ve Twitter meta etiketlerine bağlandı.

## [v11.1.1] — SEO Metadata and Sitemap

- Open Graph ve Twitter card meta etiketleri eklendi.
- `robots.txt` ve `sitemap.xml` oluşturuldu.
- `canonical` URL ve `theme-color` head zinciri tamamlandı.

## [v11.0.7] — v11 Landing Live Swap

- `index-v11.html` taşınarak canlı `index.html` haline getirildi.
- Eski landing dosyaları `archive/` altına alındı.

## [v11.0.x] — v11 Portal Foundation

- Shared design system (`shared/css/*`, `shared/js/*`) genişletildi.
- v11 landing iskelet sayfası oluşturuldu.
- Apps showcase, topluluk değerleri (community values), statik
  duyuru/etkinlik feed'i ve hafif reveal effect sistemi eklendi.

## [v10.x] — Modular Foundation

- `shared/`, `admin/`, `apps/`, `public/`, `archive/` klasör yapısı
  kuruldu.
- Borç paneli `admin/borc/` altına taşındı.
- Borç paneli için iki katmanlı güvenlik kapısı (dış oturum gate +
  iç Firebase Auth modal) sertleştirildi.

---

## Versioning Notes

- Sürüm numaraları semver tarzına yakındır ama strict semver garantisi
  vermez (statik site doğası gereği).
- "v11.x" public/admin UX ve docs fazlarını kapsar.
- "v12.x" Firebase Auth + Firestore aktivasyon fazlarını kapsayacaktır
  (bkz. [`docs/firebase-transition-plan.md`](docs/firebase-transition-plan.md)).
- Borç paneli kendi iç sürümlemesini ayrıca taşıyabilir; bu CHANGELOG
  yalnız portal kapsamı içindir.
