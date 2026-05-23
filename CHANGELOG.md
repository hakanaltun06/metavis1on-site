# Changelog

Bu dosya metavis1on portalı ve admin paneli için önemli sürüm
değişikliklerini özetler. Format [Keep a Changelog](https://keepachangelog.com/)
tarzına yakındır; her satır kısa ve anlamlı bir özet sunar. Teknik
detaylar için commit history referans alınır.

---

## [v12.0.0-alpha.19] — Opt-in Firebase Admin Login Trial

- `admin/index.html` login formu Firebase Auth trial modunu destekleyecek
  şekilde güncellendi. Bu, alpha.6 → alpha.18 boyunca inşa edilen
  `MV.auth.firebase` wrapper katmanının **ilk HTML wiring noktası**.
- **Trial OFF by default.** Hiçbir bayrak yokken submit handler eski
  `MV.auth.devLogin` → `sessionStorage` → 350ms→500ms redirect
  zincirini **bit-identical** çalıştırır. Mevcut layout, CSS, form
  field isimleri, butonlar, hata/success mesajları, focus davranışı
  ve `MV.auth.isAuthed()` redirect kısayolu değişmedi.
- **Opt-in kanalları** (ikisinden biri yeterli):
  1. `window.MV_ADMIN_FIREBASE_LOGIN === true` — explicit global flag,
     her host'ta çalışır (bilinçli kod-içi override).
  2. URL query `?mvFirebaseLogin=1` veya `?mvFirebaseLogin=true` —
     yalnız dev host'lar (`localhost` / `127.0.0.1` / `0.0.0.0` /
     `file:`); production host'ta sessiz şekilde ignore edilir.
- **Karar matrisi (her submit'te):**
  | Koşul | Yol |
  |---|---|
  | Trial flag yok | `runDevLogin` (bit-identical default) |
  | Trial flag var, wrapper yok | `runDevLogin` (defensive fallback) |
  | Trial flag var, wrapper var, `signIn` `enabled:false` | `runDevLogin` (Firebase not ready → fallback) |
  | Trial flag var, wrapper var, `signIn` `ok:true` | `createSessionFromResult` → mevcut 500ms redirect |
  | Trial flag var, wrapper var, `signIn` `enabled:true, ok:false` | Friendly error mesajı, **devLogin fallback YOK** |
- **Güvenlik kararı:** Firebase ready + credential failure (örn.
  `auth/wrong-password`) durumunda **kesinlikle devLogin fallback
  yapılmaz**. Bir credential kontrolünün sessiz şekilde dev-session
  oluşturmaya düşmesi güvenlik açığı olur. Bu nedenle `enabled:true,
  ok:false` her zaman görünür hata + butonu reset şeklinde sonuçlanır.
- **Firebase not-ready fallback:** placeholder / disabled / missing-loader
  / error gibi readiness reason'larında (`enabled:false`) form
  sessizce eski devLogin yoluna döner. Default repo (placeholder
  config) bu yolu kullanır — yani trial flag set edilse bile gerçek
  Firebase config yüklü değilse davranış default'ı koruyacaktır.
- **Başarılı login zinciri:**
  ```
  MV.auth.firebase.signIn(u, p)
    → { enabled:true, ok:true, uid, email, provider:'firebase-auth' }
  MV.auth.firebase.createSessionFromResult(result)
    → { ok:true } → sessionStorage 'mv_admin_session' yazılır
  showInfo('Giriş başarılı, panel yükleniyor...')
  setTimeout(redirect, 500) → ./dashboard.html
  ```
  Mevcut `MV.auth.requireAdmin` gate'i değişmeden çalışır; dashboard
  oturumu Firebase-bridged session ile gate'i geçer.
- **Hata mesajı mapping** (kullanıcı dostu Türkçe; raw Firebase
  error code'ları console'a `MV_DEBUG_AUTH === true` iken loglanır):
  - `auth/wrong-password` / `auth/user-not-found` /
    `auth/invalid-credential` / `auth/invalid-login-credentials` →
    "E-posta veya şifre hatalı."
  - `auth/invalid-email` / `invalid-email` → "Geçerli bir e-posta gir."
  - `invalid-password` → "Parola en az 6 karakter olmalı."
  - `missing-credentials` → "E-posta ve şifre zorunludur."
  - `auth/too-many-requests` → "Çok fazla deneme yapıldı. Bir süre
    sonra tekrar dene."
  - `auth/network-request-failed` → "Bağlantı hatası. İnternet veya
    Firebase bağlantısını kontrol et."
  - `auth/user-disabled` → "Bu hesap devre dışı bırakılmış."
  - `no-provider` / `no-sign-in-method` / `auth-init-error` →
    "Firebase giriş altyapısı hazır değil."
  - Bilinmeyen → "Firebase giriş denemesi başarısız oldu."
- **Debug log:** `window.MV_DEBUG_AUTH === true` set edildiğinde
  `[alpha.19 login]` prefixli console log'lar (signIn result, bridge
  result, fallback nedeni, unexpected throw). Default davranış sıfır
  console spam.
- **Promise.catch güvenliği:** `signIn` Promise'i beklenmedik bir
  throw atarsa form donmaz; generic hata gösterilir, buton reset
  edilir.
- **Dokunulmayan dosyalar / kapsam dışı:**
  - `shared/js/auth.js` değişmedi — `MV.auth.firebase` API yüzeyi
    ve davranışı bit-identical (alpha.18 baseline).
  - `shared/config/firebase.js`, `shared/config/firebase.local.example.js`,
    `shared/config/site.js` değişmedi.
  - `admin/dashboard.html` (logout), `admin/announcements.html`,
    `admin/events.html`, `admin/apps.html`, `admin/logs.html`
    değişmedi.
  - `admin/borc/index.html`, `borc.html`, `index.html` değişmedi.
  - `shared/js/core.js`, `theme.js`, `apps.js`, `shared/css/*`,
    `assets/*`, `firebase.json`, `.firebaserc`, `firestore.rules`,
    `firestore.indexes.json`, `.gitignore`, `docs/*` değişmedi.
  - `requireAdmin`, `logout`, `SESSION_KEY` (`'mv_admin_session'`),
    `SESSION_TTL_MS` (8 saat), redirect path, sessionStorage payload
    şekli **bit-identical**.
  - Firestore SDK eklenmedi; CRUD yok; gerçek Firebase config /
    apiKey / projectId / appId / UID / email repo'ya girmedi.

## [v12.0.0-alpha.18] — Auth Wrapper Cleanup and Capability Docs Refresh

- Kullanılmayan `dryRunResult()` helper'ı `shared/js/auth.js`'ten
  kaldırıldı. Helper alpha.11'de eklenip alpha.17'de son tüketicisi
  (eski `onChange` no-op) `firebaseOnChange` ile değiştirildikten
  sonra orphan kalmıştı. Grep doğrulaması: `dryRunResult` artık
  kod içinde sıfır mention (CHANGELOG'daki historical mention
  alpha.11 satırı içinde; o referans değiştirilmedi).
- `MV.auth.firebase` API yüzeyi bit-identical kaldı: `inspect`,
  `signIn`, `createSessionFromResult`, `signOut`,
  `clearSessionAfterSignOut`, `currentUser`, `onChange`. Hiçbir
  metod imzası veya dönüş şekli değişmedi.
- `docs/firebase-local-setup.md` alpha.16 / alpha.17 sonrası
  tazelendi:
  - Belge sürümü v12.0.0-alpha.15 → alpha.18; hedef faz alpha.19+.
  - **Current Scope** alpha.17 state'ini yansıtacak şekilde
    yeniden yazıldı. `currentUser` (live-read) ve `onChange`
    (live-listener) durumları eklendi; eski "dry-run" satırı
    kaldırıldı; "Auth wrapper layer artık readiness guard
    arkasında tam hazır" beyanı eklendi.
  - **Phase Log** tablosuna alpha.15 (`9845eea`), alpha.16
    (`4243ceb`), alpha.17 (`9d19299`) satırları eklendi. Başlık
    "alpha.6 → alpha.14" → "alpha.6 → alpha.17". TOC anchor'u
    da güncellendi.
  - **DevTools Inspection** ready durumu tablosu:
    `currentUser:'live-read'`, `onChange:'live-listener'`,
    `sessionBridge:'available'`, `logoutBridge:'available'`
    satırları eklendi; eski "ready iken bile dry-run" paragrafı
    güncellendi.
  - **Capability Matrix** satırları güncellendi: `currentUser()`
    → "live-read when ready", `onChange()` → "live-listener
    when ready", yeni "Auth wrapper layer" satırı (ready behind
    guard).
  - Yeni **§10 Manual onChange Listener Example** bölümü eklendi:
    `MV.auth.firebase.onChange(cb)` zinciri, sanitized callback
    payload garantileri ve safe `unsubscribe` notları. Önceki
    §10/§11/§12 → §11/§12/§13'e shift edildi; TOC güncellendi.
  - **Troubleshooting** tablosuna 4 yeni satır: `currentUser` null
    edge case, `onChange invalid-callback`, `no-auth-state-listener`,
    `unsubscribe` çoklu-listener davranışı.
  - **Next Roadmap** tamamlanan adımlar (alpha.16/17/18) ve
    önümüzdeki adımlar (alpha.19 login trial, alpha.20 logout
    trial, alpha.21 devLogin guard) olarak iki tabloya bölündü.
  - Sürüm Notu satırı v12.0.0-alpha.18 ile genişletildi.
- `docs/v12-readiness.md` Auth Wrapper Layer Status bölümü tazelendi:
  `currentUser` ve `onChange` artık "live behind guard" olarak
  listelendi; "*Auth wrapper layer is complete behind readiness
  guards; HTML wiring is the next controlled phase.*" sonuç cümlesi
  eklendi; HTML wiring alpha.19/alpha.20 trial fazlarına yönlendirildi.
  Sürüm tablosuna alpha.18 satırı eklendi.
- `docs/README.md` Firebase Local Setup doküman açıklaması
  alpha.14 → alpha.17 phase log kapsamı ve "signIn / signOut /
  onChange test zincirleri" referansıyla genişletildi.
- **Runtime davranışı değişmedi.** Bu faz tamamen housekeeping +
  dokümantasyon fazıdır. `MV.auth.firebase.*` metodlarının davranışı
  bit-identical: signIn/signOut ready iken live + auto-bridge yok;
  currentUser ready iken sanitized live-read; onChange ready iken
  sanitized live-listener; placeholder'da hepsi no-op. Mevcut
  `MV.auth` API (`isAuthed`, `getUser`, `devLogin`, `requireAdmin`,
  `logout`, `SESSION_KEY`, `SESSION_TTL_MS`, redirect path,
  sessionStorage payload) tek bir bit dahi değişmedi.
- Admin login formu, dashboard logout, requireAdmin, sessionStorage
  gate **dokunulmadı**. `admin/*.html`, `admin/borc/index.html`,
  `borc.html`, `index.html`, `shared/config/firebase.js`,
  `shared/config/firebase.local.example.js`, `shared/config/site.js`,
  `shared/js/core.js`, `shared/js/theme.js`, `shared/js/apps.js`,
  `.gitignore`, `firebase.json`, `.firebaserc`, `firestore.rules`,
  `firestore.indexes.json` ve `assets/*` **değişmedi**. Firestore
  SDK eklenmedi; CRUD yok; gerçek Firebase config / apiKey /
  projectId / appId / UID / email repo'ya girmedi.

## [v12.0.0-alpha.17] — Guarded Firebase onChange Listener

- `MV.auth.firebase.onChange(callback)` readiness guard arkasında
  gerçek Firebase Auth `onAuthStateChanged` listener kurabilecek hale
  getirildi. Default repo ve placeholder config altında `onChange()`
  güvenli no-op döner (`enabled:false, ok:false, reason:'<status>',
  unsubscribe:no-op`) ve callback hiçbir koşulda tetiklenmez.
- **Guard sırası** (sıralı, ilk reddeden döner; her durumda
  `unsubscribe` çağrılabilir bir function):
  1. `callback` function değil → `{ enabled:false, ok:false,
     reason:'invalid-callback' }`.
  2. `window` veya `window.MV_FIREBASE` yok → `{ enabled:false, ok:false,
     reason:'missing-loader' }`.
  3. `getFirebaseAuthReadiness().enabled === false` → `{ enabled:false,
     ok:false, reason:'<status>' }`. Reason değerleri: `'missing-loader'`
     | `'disabled'` | `'placeholder'` | `'error'`.
  4. `getAuthProvider()` null veya `.auth` function değil →
     `{ enabled:true, ok:false, reason:'no-provider' }`.
  5. `provider.auth()` throw → `{ enabled:true, ok:false, reason:err.code
     || 'auth-init-error', message }`.
  6. Auth instance'da `onAuthStateChanged` function değil →
     `{ enabled:true, ok:false, reason:'no-auth-state-listener' }`.
  7. `authInstance.onAuthStateChanged(wrapped)` throw → `{ enabled:true,
     ok:false, reason:err.code || 'auth-state-listener-error', message }`.
- **Başarı dönüşü:** `{ enabled:true, ok:true, provider:'firebase-auth',
  unsubscribe:fn }`.
- **Callback payload sanitization:** wrapper, kullanıcı callback'ini bir
  iç sarmalayıcıdan geçirir. Firebase Auth raw `user` objesi callback'e
  **hiçbir koşulda** ham haliyle verilmez. Callback yalnız iki şeyden
  birini alır:
  - `null` (signed out / no user)
  - sanitized object — `currentUser()` ile aynı şekil:
    ```
    {
      uid: user.uid || null,
      email: user.email || null,
      emailVerified: !!user.emailVerified,
      displayName: user.displayName || null,
      provider: 'firebase-auth'
    }
    ```
  Şu alanlar / metodlar callback'e **kesinlikle sızmaz:**
  `refreshToken`, `accessToken`, `stsTokenManager`, `getIdToken`,
  `getIdTokenResult`, `providerData`, `metadata`, `phoneNumber`,
  `photoURL`, `tenantId`, ham `user` objesi.
- **`unsubscribe` güvenliği:** SDK'dan dönen unsubscribe function ise
  wrapper bunu `try/catch` ile sarar; çağrı throw etse bile sayfaya
  patlamaz (sessizce yutulur). SDK function dönmezse `unsubscribe`
  no-op olur. Wrapper'ın döndürdüğü `unsubscribe` her durumda
  çağrılabilir bir function'dır — call site ekstra null guard
  yapmak zorunda değildir.
- **`inspect()` capability güncellemesi:**
  - `onChange: 'live-listener'` (isAuthReady true).
  - `onChange: 'no-op'` (isAuthReady false). Eskiden her durumda
    `'dry-run'` idi.
  Diğer capability alanları (`signIn`, `signOut`, `currentUser`,
  `sessionBridge`, `logoutBridge`) değişmedi.
- **Side-effect kontratı (her durumda):**
  - `sessionStorage`'a **yazmaz / silmez**.
  - `createSessionFromResult` veya `clearSessionAfterSignOut` **çağırmaz**.
  - `MV.auth.requireAdmin` veya `redirect` **çağırmaz**.
  - DOM'a **dokunmaz**.
  - Sadece `authInstance.onAuthStateChanged` çağrısı yapar; başka SDK
    method'u tetiklemez.
- **Mevcut Firebase wrapper davranışları korundu (regression):**
  - `signIn`: ready iken live, otomatik session yazmaz.
  - `createSessionFromResult`: valid result ile session yazar, invalid
    inputlarda yazmaz.
  - `signOut`: ready iken live, otomatik session temizlemez.
  - `clearSessionAfterSignOut`: valid result ile session temizler,
    invalid inputlarda temizlemez.
  - `currentUser`: ready iken sanitized live-read; sessionStorage'a
    dokunmaz, SDK method invoke etmez.
  - `inspect`: side-effect-free.
- **Mevcut `MV.auth` API bit-identical:** `isAuthed`, `getUser`,
  `devLogin`, `requireAdmin`, `logout` davranışı, `SESSION_KEY`
  (`'mv_admin_session'`), `SESSION_TTL_MS` (8 saat), redirect path,
  sessionStorage payload şekli değişmedi. Mock harness'ta devLogin
  → isAuthed → logout zinciri eski sonuçları üretti.
- **Davranış matrisi (onChange):**
  | Faz | `callback` | `isAuthReady` | `onChange(cb)` | SDK | Callback |
  |---|---|---|---|---|---|
  | Invalid callback | non-fn | any | `enabled:false, reason:'invalid-callback'` | 0 | 0 |
  | Default repo | fn | false | `enabled:false, reason:'placeholder'` | 0 | 0 |
  | Ready + success | fn | true | `enabled:true, ok:true, unsubscribe:fn` | 1 | sanitized |
  | Ready + SDK throw | fn | true | `enabled:true, ok:false, reason:err.code` | 0 (sayılmaz) | 0 |
- **Side-effect kontrolü:** mock harness 6 phase boyunca `onChange`'i
  çağırdı. Sayaçlar:
  - `onAuthStateChanged` SDK: yalnız ready + valid callback durumunda
    çağrı sayısı kadar (1).
  - `firebase.auth()`: yalnız ready phase'lerde provider acquire için.
  - `signInWithEmailAndPassword`, `signOut`: 0 (onChange başka SDK
    method invoke etmez).
  - `sessionStorage.setItem` / `removeItem`: 0 (observation-only).
  - Sanitization testi: mock user'a inject edilen 7 sensitive field
    (`refreshToken`, `accessToken`, `getIdToken`, `providerData`,
    `metadata`, `phoneNumber`, `photoURL`, `tenantId`) **hiçbiri**
    callback payload'a sızmadı.
- Admin login formu ve dashboard logout akışı **henüz Firebase'e
  bağlanmadı**. Hiçbir HTML değişmedi. `admin/index.html` hâlâ
  `MV.auth.devLogin` üzerinden çalışıyor; `admin/dashboard.html` hâlâ
  `MV.auth.logout` üzerinden çalışıyor.
- `shared/config/firebase.js`, `shared/config/site.js`,
  `shared/config/firebase.local.example.js`, `.gitignore`, admin HTML
  dosyaları, `admin/borc/index.html`, `borc.html`, `index.html`,
  `docs/*` ve diğer `shared/js/*` dosyaları **değişmedi**. Firestore
  SDK, CRUD, gerçek Firebase config commit edilmedi. Gerçek apiKey /
  projectId / appId / UID / email repo'ya girmedi.

## [v12.0.0-alpha.16] — Guarded Firebase currentUser Live Read

- `MV.auth.firebase.currentUser()` readiness guard arkasında Firebase
  Auth `currentUser` bilgisini **read-only** okuyabilecek hale getirildi.
  Default repo ve placeholder config altında `currentUser()` hâlâ
  `null` döner (davranış değişmedi).
- **Guard sırası** (sıralı, ilk reddeden `null` döner):
  1. `window` veya `window.MV_FIREBASE` yoksa → `null`.
  2. `getFirebaseAuthReadiness().enabled === false` → `null`.
     Reason değerleri: `'missing-loader'` | `'disabled'` | `'placeholder'`
     | `'error'`.
  3. `getAuthProvider()` null veya `.auth` function değil → `null`.
  4. `provider.auth()` throw → `null` (catch + sessiz yutma).
  5. `authInstance` falsy → `null`.
  6. `authInstance.currentUser` falsy → `null`.
- **Ready + active session** durumunda yalnız güvenli / sanitized /
  serializable alanlar döner:
  ```
  {
    uid: user.uid || null,
    email: user.email || null,
    emailVerified: !!user.emailVerified,
    displayName: user.displayName || null,
    provider: 'firebase-auth'
  }
  ```
  `phoneNumber`, `photoURL`, `providerData`, `metadata`, `tenantId`,
  `refreshToken`, `getIdToken` gibi diğer alanlar / metodlar **döndürülmez**.
- **Read-only kontrat (her durumda):**
  - `sessionStorage`'a **yazmaz**.
  - `sessionStorage`'dan **silmez**.
  - **Hiçbir** backend / network çağrısı başlatmaz.
  - `onAuthStateChanged` veya başka **listener kurmaz**.
  - DOM'a **dokunmaz**.
  - Sadece `authInstance.currentUser` property'sini okur — method
    çağırmaz.
- **`inspect()` capability güncellemesi:** `capabilities.currentUser`
  artık ready durumuna göre değer alır:
  - `'no-op'` (isAuthReady false) — eskiden `'dry-run'` idi.
  - `'live-read'` (isAuthReady true) — yeni değer.
  Diğer capability alanları (`signIn`, `signOut`, `onChange`,
  `sessionBridge`, `logoutBridge`) değişmedi.
- **`onChange()` hâlâ dry-run.** Bu fazda kesinlikle
  `onAuthStateChanged` listener kurulmadı. Ready iken bile
  `{ enabled:true, simulated:true, reason:'ready-no-execute',
  unsubscribe:no-op }` döner, callback tetiklenmez.
- **Mevcut Firebase wrapper davranışları korundu (regression):**
  - `signIn`: ready iken live, otomatik session yazmaz.
  - `createSessionFromResult`: valid result ile session yazar, invalid
    inputlarda yazmaz.
  - `signOut`: ready iken live, otomatik session temizlemez.
  - `clearSessionAfterSignOut`: valid result ile session temizler,
    invalid inputlarda temizlemez.
  - `inspect`: side-effect-free, sadece okuma.
- **Mevcut `MV.auth` API bit-identical:** `isAuthed`, `getUser`,
  `devLogin`, `requireAdmin`, `logout` davranışı, `SESSION_KEY`
  (`'mv_admin_session'`), `SESSION_TTL_MS` (8 saat), redirect path,
  sessionStorage payload şekli değişmedi. Mock harness'ta devLogin
  → isAuthed → logout zinciri eski sonuçları üretti.
- **Davranış matrisi (currentUser):**
  | Faz | `isAuthReady` | `auth.currentUser` | `currentUser()` |
  |---|---|---|---|
  | Default repo (placeholder) | false | n/a (provider yok) | `null` |
  | Ready + no signed-in user | true | `null` | `null` |
  | Ready + active session | true | user object | sanitized object |
  | Ready + provider throw | true | n/a | `null` (caught) |
- **Side-effect kontrolü:** mock harness Phase A (placeholder), Phase
  B (ready + currentUser null), Phase C (ready + mock user) boyunca
  `currentUser()` çağrıldı. Sayaçlar:
  - `firebase.auth()`: yalnız ready phase'lerde provider acquire için
    (her çağrıda 1, signIn/signOut için olanlar hariç).
  - `signInWithEmailAndPassword`: 0 (currentUser SDK method çağırmaz).
  - `signOut`: 0.
  - `onAuthStateChanged`: 0.
  - `sessionStorage.setItem` / `removeItem`: 0 (currentUser
    sessionStorage'a hiç dokunmaz).
- Admin login formu ve dashboard logout akışı **henüz Firebase'e
  bağlanmadı**. Hiçbir HTML değişmedi. `admin/index.html` hâlâ
  `MV.auth.devLogin` üzerinden çalışıyor; `admin/dashboard.html` hâlâ
  `MV.auth.logout` üzerinden çalışıyor.
- `shared/config/firebase.js`, `shared/config/site.js`,
  `shared/config/firebase.local.example.js`, `.gitignore`, admin HTML
  dosyaları, `admin/borc/index.html`, `borc.html`, `index.html`,
  `docs/*` ve diğer `shared/js/*` dosyaları **değişmedi**. Firestore
  SDK, CRUD, `onAuthStateChanged`, gerçek Firebase config commit
  edilmedi. Gerçek apiKey / projectId / appId / UID / email repo'ya
  girmedi.

## [v12.0.0-alpha.15] — Firebase Local Setup Documentation

- `docs/firebase-local-setup.md` eklendi. Firebase Auth wrapper
  katmanı için alpha.6 → alpha.14 phase log, capability matrix ve
  local/staging doğrulama rehberi tek dokümanda toplandı.
- Phase log her fazı commit hash + tek cümle açıklama ile içerir:
  alpha.6 (`892ec7a`), alpha.7 (`cba5e41`), alpha.8 (`3881523`),
  alpha.9 (`b7065e4`), alpha.10 (`60d6193`), alpha.11 (`d6f58b1`),
  alpha.12 (`15e3e97`), alpha.13 (`87afe9c`), alpha.14 (`f37345b`).
- Local config policy belgelendi: `shared/config/firebase.local.js`
  `.gitignore` altında, `firebase.local.example.js` placeholder
  template olarak repo'da. Gerçek `apiKey` / `projectId` / `appId`
  example dosyasına veya docs / CHANGELOG'a yazılmaz.
- İki activation path açıklandı: Path A (manuel script tag — şu an
  admin HTML'e eklenmemiş) ve Path B (opt-in auto-loader — query
  param `?mvFirebaseLocal=1` yalnız localhost / 127.0.0.1 /
  0.0.0.0 / file:; explicit `window.MV_FIREBASE_AUTO_LOAD_LOCAL =
  true` her host'ta bilinçli override).
- DevTools inspection komutları (`MV_FIREBASE.getStatus()`,
  `isAvailable()`, `isAuthReady()`, `getLocalConfigStatus()`,
  `MV.auth.firebase.inspect()`) ve default-repo / local-config-ready
  beklenen durum tabloları eklendi.
- Capability matrix: App SDK / Auth SDK loaded, external config
  injection / local opt-in loader / `inspect` / session+logout
  bridges available, `signIn` / `signOut` live when ready,
  `onChange` / `currentUser` dry-run, admin login + dashboard
  logout pending, Firestore / CRUD not started, debt panel out
  of scope.
- Manuel signIn / signOut test zincirleri placeholder credential'larla
  (`admin@example.com`, `PLACEHOLDER_PASSWORD`) belgelendi.
  `createSessionFromResult` / `clearSessionAfterSignOut`
  bridge'lerinin manuel çağrı zorunluluğu vurgulandı.
- Troubleshooting bölümü loader status'leri, wrapper hata kodları
  ve session bridge edge case'lerini kapsar.
- Security notes: client config secret değil ama yine de commit
  yok; gerçek yetki ileride Firestore Rules + Auth + custom claims;
  `sessionStorage` bridge geçici; production devLogin guard ayrı
  faz; borç paneli izole; doküman gerçek credential içermez.
- Next roadmap: alpha.16 (currentUser activation veya login trial
  karar noktası), alpha.17 (admin login opt-in trial), alpha.18
  (dashboard logout opt-in trial), alpha.19 (production devLogin
  guard), v12.1.0 (Firestore rules foundation), v12.2.0
  (read-only Firebase read), v12.3.0+ (CRUD).
- `docs/v12-readiness.md` "Auth Wrapper Layer Status" bölümü ile
  güncellendi: wrapper signIn/signOut seviyesinde hazır, session +
  logout bridge mevcut, admin HTML wiring pending, onChange /
  currentUser pending, Firestore pending, debt panel out of scope.
- `docs/README.md` Current Documents listesine yeni doküman eklendi.
- **Runtime davranışı değişmedi.** Bu faz tamamen dokümantasyon
  fazıdır. `shared/js/auth.js`, `shared/config/firebase.js`,
  `shared/config/firebase.local.example.js`, admin HTML dosyaları
  (`admin/index.html`, `admin/dashboard.html`,
  `admin/announcements.html`, `admin/events.html`, `admin/apps.html`,
  `admin/logs.html`), `admin/borc/index.html`, `borc.html`,
  `index.html`, `shared/config/site.js`, `.gitignore`, `firebase.json`,
  `.firebaserc`, `firestore.rules`, `firestore.indexes.json`
  dosyalarına **dokunulmadı**. Firestore SDK, CRUD,
  `onAuthStateChanged`, gerçek Firebase config commit edilmedi.
  Gerçek apiKey / projectId / appId / measurementId / UID / email
  repo'ya girmedi.

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
