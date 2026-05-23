# Changelog

Bu dosya metavis1on portalı ve admin paneli için önemli sürüm
değişikliklerini özetler. Format [Keep a Changelog](https://keepachangelog.com/)
tarzına yakındır; her satır kısa ve anlamlı bir özet sunar. Teknik
detaylar için commit history referans alınır.

---

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
