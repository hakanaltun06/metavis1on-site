# Firebase Local Setup & Auth Wrapper Guide

> Bu doküman metavis1on **v12 Firebase Auth geçişinin local/staging
> doğrulama rehberidir.** Aktif kod değildir; admin Auth altyapısının
> güvenli geçişi için referans dokümandır.
>
> Belge sürümü: v12.1.0-pre.2 · Hedef faz: v12.1.0+
>
> Bağlantılı dokümanlar:
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) — Genel mimari ve faz roadmap'i.
> - [`v12-readiness.md`](./v12-readiness.md) — Auth foundation kapsam dokümanı.
> - [`firebase-project-setup.md`](./firebase-project-setup.md) — Firebase Console manuel kontrol listesi.
> - [`firebase-admin-authorization.md`](./firebase-admin-authorization.md) — `admins/{uid}` allowlist sözleşmesi (v12.1.0-pre.2).
> - [`firestore-data-model.md`](./firestore-data-model.md) — Koleksiyon alan tabloları (v12.1.0-pre.2).
> - [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) — Rules test stratejisi + foundation draft test kapsamı.
> - [`debt-panel-audit.md`](./debt-panel-audit.md) — Borç paneli izolasyon politikası.

---

## İçindekiler

1. [Purpose](#1-purpose)
2. [Current Scope](#2-current-scope)
3. [Phase Log: alpha.6 → v12.1.0-pre.2](#3-phase-log-alpha6--v1210-pre2)
4. [Local Config File](#4-local-config-file)
5. [Activation Paths](#5-activation-paths)
6. [DevTools Inspection](#6-devtools-inspection)
7. [Capability Matrix](#7-capability-matrix)
8. [Manual Sign-in Test Chain](#8-manual-sign-in-test-chain)
9. [Manual Sign-out Test Chain](#9-manual-sign-out-test-chain)
10. [Manual onChange Listener Example](#10-manual-onchange-listener-example)
11. [Admin Login/Logout Trial Walkthrough](#11-admin-loginlogout-trial-walkthrough)
12. [Trial Persistence and Production devLogin Guard](#12-trial-persistence-and-production-devlogin-guard)
13. [Firestore Passive SDK Readiness Layer](#13-firestore-passive-sdk-readiness-layer)
14. [Troubleshooting](#14-troubleshooting)
15. [Security Notes](#15-security-notes)
16. [Next Roadmap](#16-next-roadmap)

---

## 1. Purpose

Bu doküman **yalnızca** v12 admin Auth foundation geçişini kapsar:

- metavis1on **v12 Firebase Auth** geçişinin local/staging doğrulama
  rehberidir.
- **Borç paneli migration rehberi değildir.** Borç paneli
  (`admin/borc/index.html`) v12.0 – v12.5 boyunca kod düzeyinde
  dokunulmuyor; kendi inline `firebaseConfig`'ini ve kendi auth
  zincirini koruyor ([`debt-panel-audit.md`](./debt-panel-audit.md) §1.5).
- **Public site migration rehberi değildir.** `index.html` ve
  `MV_SITE` v12.2.0'a kadar tek kaynak; bu doküman public site verisini
  kapsamaz.
- **Amaç:** admin Auth altyapısının (login formu, dashboard logout,
  ileride listener'lar) güvenli geçişini, hangi katmanın hangi fazda
  bağlandığını ve devtools'tan nasıl doğrulanacağını anlatmaktır.

---

## 2. Current Scope

v12.1.0-pre.1 itibarıyla durum:

- **Firebase App SDK** admin sayfalarında **pasif şekilde yüklü**
  (alpha.5). Public site etkilenmez.
- **Firebase Auth SDK** admin sayfalarında **pasif şekilde yüklü**
  (alpha.6). Login formuna bağlı değil.
- **Config loader** var — `shared/config/firebase.js` placeholder ile
  güvenli no-op yapar (alpha.9 gated injection).
- **Local config opt-in loader** var — `firebase.local.js`
  query/flag ile yüklenebilir (alpha.10).
- **Auth wrapper** var — `MV.auth.firebase` namespace (alpha.8
  scaffold; alpha.11 dry-run inspection).
- **`signIn()`** ready olduğunda **live** çalışır (alpha.12);
  placeholder config ile no-op.
- **`signOut()`** ready olduğunda **live** çalışır (alpha.14);
  placeholder config ile no-op.
- **`currentUser()`** ready olduğunda **live-read** çalışır
  (alpha.16); sanitized 5-field snapshot veya `null`; placeholder
  config ile `null`.
- **`onChange()`** ready olduğunda **live-listener** çalışır
  (alpha.17); gerçek `onAuthStateChanged` listener kurar, callback
  sanitized snapshot/null alır; placeholder config ile no-op.
- **Session bridge** (`createSessionFromResult`) ve **logout bridge**
  (`clearSessionAfterSignOut`) **available** (alpha.13 + alpha.14).
  Caller bunları manuel çağırmak zorunda; `signIn` / `signOut`
  otomatik bridge çağırmaz.
- **Auth wrapper layer readiness guard arkasında tam hazır;**
  signIn / signOut / currentUser / onChange dört yüzeyi de ready
  iken live, placeholder'da no-op.
- **Admin login formu** (`admin/index.html`) **opt-in trial moduna
  alındı** (alpha.19). Flag yoksa default `MV.auth.devLogin` bit-identical
  çalışır; flag varsa Firebase signIn + session bridge zinciri
  kullanılır. Bkz. §11 Trial Walkthrough.
- **Dashboard logout** (`admin/dashboard.html`) **opt-in trial moduna
  alındı** (beta.1). Aynı flag pattern; flag yoksa `MV.auth.logout`
  bit-identical; flag varsa Firebase signOut + logout bridge zinciri.
- **Trial flag persistence available** (beta.2). Dev hostta
  `?mvFirebaseLogin=1` (veya `=true`) `sessionStorage` key
  `mv_firebase_login_trial = '1'` yazar; `?mvFirebaseLogin=0`
  (veya `=false`) temizler. Production hostta query param **no-op**
  kalır. Aynı browser session boyunca login → dashboard navigasyonu
  query string'i kaybetse bile trial aktif kalır.
- **Production devLogin guard scaffold available** (beta.2).
  `MV.auth.devLogin` davranışı default'ta aynen çalışmaya devam eder.
  Yalnız `window.MV_ENFORCE_FIREBASE_AUTH === true` set edildiğinde
  **ve** host bir dev host değilse devLogin kapatılır ve
  `{ ok:false, error:'Geliştirme girişi üretim ortamında devre dışı.' }`
  döner. Default enforce **OFF**; enforce eşik koşulları §12.4'te.
- **Trial status UX available** (beta.3). `admin/index.html` ve
  `admin/dashboard.html` üzerinde `isFirebaseLoginTrialEnabled()`
  true ise küçük "Firebase Trial Aktif" göstergesi çıkar; default
  modda görünmez. Salt operatör görünürlüğüdür — güvenlik sınırı
  değildir.
- **Firestore passive SDK readiness layer available**
  (v12.1.0-pre.1). 6 admin sayfasına `firebase-firestore-compat.js`
  pasif olarak eklendi; `MV_FIREBASE` üzerine `hasFirestoreSdk` /
  `isFirestoreReady` / `getFirestoreProvider` / `inspectFirestore`
  helper'ları eklendi. **Hiçbir read / write / CRUD / collection /
  doc / onSnapshot çağrısı yok.** Sadece readiness probe ediliyor;
  ne wrapper'da ne admin sayfalarında `firebase.firestore()` çağrısı
  yapılmıyor. Detay §13.
- **Firestore read / write / CRUD** başlamadı. v12.2+ (read) ve
  v12.3+ (write) fazlarına bırakıldı.

---

## 3. Phase Log: alpha.6 → v12.1.0-pre.2

| Faz | Commit | Özet |
|---|---|---|
| v12.0.0-alpha.6 | `892ec7a` | Firebase Auth SDK admin sayfalarına eklendi (pasif). |
| v12.0.0-alpha.7 | `cba5e41` | Firebase Auth readiness helper'ları (`isAuthReady`, `getAuthProvider`) eklendi. |
| v12.0.0-alpha.8 | `3881523` | Passive Firebase Auth wrapper (`MV.auth.firebase`) scaffold edildi; tüm metodlar no-op. |
| v12.0.0-alpha.9 | `b7065e4` | Gated external config injection — `window.MV_FIREBASE_CONFIG` placeholder/real ayrımıyla loader'a aktarılır. |
| v12.0.0-alpha.10 | `60d6193` | Opt-in local config loader (`firebase.local.js`) — query param ve explicit flag. |
| v12.0.0-alpha.11 | `d6f58b1` | Firebase Auth dry-run inspection — `inspect()` ve structured snapshot. |
| v12.0.0-alpha.12 | `15e3e97` | Guarded Firebase `signIn` wrapper live; double-guard + Firebase error code forward. |
| v12.0.0-alpha.13 | `87afe9c` | Firebase signIn result → `mv_admin_session` bridge (`createSessionFromResult`). |
| v12.0.0-alpha.14 | `f37345b` | Guarded Firebase `signOut` + logout bridge (`clearSessionAfterSignOut`). |
| v12.0.0-alpha.15 | `9845eea` | Firebase local setup + Auth wrapper guide dokümante edildi (bu doküman ilk sürümü). |
| v12.0.0-alpha.16 | `4243ceb` | Guarded Firebase `currentUser` live read; sanitized 5-field snapshot veya null. |
| v12.0.0-alpha.17 | `9d19299` | Guarded Firebase `onChange` listener; sanitized callback, safe unsubscribe. |
| v12.0.0-alpha.18 | `876b7ac` | Auth wrapper cleanup (`dryRunResult` removed) + capability docs refresh. |
| v12.0.0-alpha.19 | `8b58ad6` | Opt-in Firebase admin login trial on `admin/index.html`; default `devLogin` bit-identical. |
| v12.0.0-beta.1 | `b0cb84b` | Opt-in Firebase admin logout trial on `admin/dashboard.html`; trial bundle tamamlandı, docs senkronize edildi. |
| v12.0.0-beta.2 | `2711ce9` | Trial flag `sessionStorage` persistence (login + dashboard) + production `devLogin` guard scaffold (`MV_ENFORCE_FIREBASE_AUTH`, default OFF). |
| v12.0.0-beta.3 | `e6b269b` | Trial status UX (operator-visible "Firebase Trial Aktif" göstergesi) + production enforce checklist dokümante edildi. Runtime auth davranışı değişmedi. |
| v12.1.0-pre.1 | `d228823` | Passive Firestore SDK readiness layer — 6 admin sayfasına `firebase-firestore-compat.js` pasif yüklendi + `MV_FIREBASE` üzerine `hasFirestoreSdk` / `isFirestoreReady` / `getFirestoreProvider` / `inspectFirestore` helper'ları eklendi. Hiçbir read/write/CRUD çağrısı yok. |
| v12.1.0-pre.2 | _bu commit_ | Firebase admin authorization & rules contract — `docs/firebase-admin-authorization.md` (allowlist sözleşmesi) + `docs/firestore-data-model.md` (koleksiyon alan tabloları) + `firestore.rules` foundation draft (default deny + `admins/{uid}` self-read + owner-managed write + content collection'lar kapalı + catch-all). Runtime kod değişmedi; bu doküman + `firebase-rules-test-plan.md` + `v12-readiness.md` + `README.md` + `CHANGELOG.md` güncellendi. |

> Notlar:
> - alpha.6 / alpha.7 / alpha.8 hash'leri local git log'dan
>   doğrulandı.
> - alpha.9 → alpha.19 hash'leri faz brief'lerinde sabit verildi ve
>   git log ile uyumlu.
> - alpha.6 → alpha.18 fazları wrapper katmanını inşa etti; alpha.19
>   ve beta.1 admin HTML wiring'ini opt-in flag arkasında bağladı.
>   beta.2 bu wiring'i kullanılabilir hale getirdi (persistence) ve
>   production devLogin'i ileride enforce edebilmek için scaffold
>   ekledi. beta.3 operatör görünürlüğü ve enforce checklist'ini
>   ekledi; auth runtime davranışı değişmedi. Default davranış her
>   zaman bit-identical kalır — trial flag olmadan devLogin/logout
>   yolu eski sonuçları üretir, `MV_ENFORCE_FIREBASE_AUTH` set
>   edilmedikçe production devLogin açık kalır, indicator yalnız
>   trial aktifken görünür.

---

## 4. Local Config File

**Gerçek Firebase config repo'ya commit edilmez.** Bu kural
istisnasızdır.

### Local dosya konumu

```
shared/config/firebase.local.js
```

Bu dosya `.gitignore` altındadır; Git tarafından izlenmez.

### Template

```
shared/config/firebase.local.example.js
```

Bu **example** dosyası repo'da commitli olarak durur ve yalnızca
**placeholder** değerler içerir (`YOUR_API_KEY`, `YOUR_PROJECT_ID`,
vs.). Loader'ın `looksReal()` kontrolü placeholder pattern'lerini
reddeder; yani example dosyası kazara yüklense bile loader
**placeholder** state'inde kalır.

### Kullanım

1. `firebase.local.example.js`'i aynı klasöre `firebase.local.js`
   adıyla kopyala.
2. `firebase.local.js` içindeki placeholder değerleri **kendi**
   Firebase project değerlerinle değiştir.
3. `firebase.local.js` dosyasını **asla commitleme**.

### Kesin uyarılar

- **Gerçek `apiKey` example dosyasına yazılmaz.** Example dosyası
  template'tir; içindeki değerler bilinçli placeholder'dır.
- **Gerçek config CHANGELOG'a, docs içine veya commit mesajına
  yazılmaz.** Bu doküman dahil.
- **`firebase.local.js` commitlenmez.** Dosya `.gitignore` altında
  olsa bile `git add -f firebase.local.js` gibi force ekleme
  yapılmaz.
- **Public repo'ya gerçek config girilmez.** Firebase apiKey
  teknik olarak public client identifier'dır ama yine de repo'ya
  yazmıyoruz — gerçek güvenlik ileride Firestore Rules + Auth +
  App Check ile sağlanacak.

---

## 5. Activation Paths

Local config'i loader'a görünür kılmak için iki yol var. **Default
repo davranışı her iki yolda da kapalıdır.**

### Path A — Manual script tag

`firebase.local.js` dosyasını HTML'den **`firebase.js`'ten önce**
manuel olarak yüklemek. Bu yöntem her host'ta çalışır.

> **Not:** Şu an admin HTML dosyalarına manuel script tag
> **eklenmiş değildir.** Yani Path A bu repo'da default olarak
> aktif değil. Eklenirse ayrı bir commit faz'ında, açıkça
> dokümante edilerek yapılacak.

### Path B — Opt-in auto-loader

`firebase.js` içindeki opt-in loader, `firebase.local.js`'i
sibling olarak dinamik `<script>` ile yükler. Aşağıdaki iki
koşuldan biri gerekir:

**URL query param (yalnız dev host):**

```
?mvFirebaseLocal=1
```

veya

```
?mvFirebaseLocal=true
```

- Yalnız `localhost` / `127.0.0.1` / `0.0.0.0` / `file:`
  protokolünde çalışır.
- Production host'ta query param **no-op** kalır (loader sessiz
  şekilde reddeder). Tipo veya yanlış host bombardımanı production
  davranışını değiştirmez.

**Explicit flag (her host'ta çalışır, bilinçli override):**

```js
window.MV_FIREBASE_AUTO_LOAD_LOCAL = true;
```

`firebase.js` çalışmadan **önce** set edilmelidir.

- Bu bilinçli bir kod-içi override'dır; kazara açılmaz.
- Production'da bu flag set edilmemeli — set edilirse loader
  local config'i hosta bakmadan yüklemeyi dener.

---

## 6. DevTools Inspection

Browser DevTools console'undan loader / wrapper durumunu okumak
için kullanılabilecek **side-effect-free** komutlar:

```js
MV_FIREBASE.getStatus();             // 'ready' | 'placeholder' | 'disabled' | 'error' | ...
MV_FIREBASE.isAvailable();           // boolean — App SDK + init başarılı mı?
MV_FIREBASE.isAuthReady();           // boolean — App ready + Auth SDK var + provider live?
MV_FIREBASE.getLocalConfigStatus();  // 'off' | 'skipped' | 'loading' | 'loaded' | 'error'
MV.auth.firebase.inspect();          // wrapper snapshot (mode, capabilities, localConfig…)
```

### Beklenen durumlar

**Default repo (placeholder config, opt-in flag yok):**

| Sorgu | Değer |
|---|---|
| `MV_FIREBASE.getStatus()` | `'placeholder'` |
| `MV_FIREBASE.isAvailable()` | `false` |
| `MV_FIREBASE.isAuthReady()` | `false` |
| `MV_FIREBASE.getLocalConfigStatus()` | `'off'` veya `'skipped'` |
| `MV.auth.firebase.inspect().mode` | `'dry-run'` |
| `MV.auth.firebase.signIn(...)` | `{ enabled:false, ok:false, reason:'placeholder' }` |
| `MV.auth.firebase.signOut()` | `{ enabled:false, ok:false, reason:'placeholder' }` |

**Local config ready (Path B, gerçek `firebase.local.js` yüklü):**

| Sorgu | Değer |
|---|---|
| `MV_FIREBASE.getStatus()` | `'ready'` |
| `MV_FIREBASE.isAvailable()` | `true` |
| `MV_FIREBASE.isAuthReady()` | `true` |
| `MV_FIREBASE.getLocalConfigStatus()` | `'loaded'` |
| `MV.auth.firebase.inspect().mode` | `'partial-live'` |
| `MV.auth.firebase.inspect().capabilities.signIn` | `'live'` |
| `MV.auth.firebase.inspect().capabilities.signOut` | `'live'` |
| `MV.auth.firebase.inspect().capabilities.currentUser` | `'live-read'` |
| `MV.auth.firebase.inspect().capabilities.onChange` | `'live-listener'` |
| `MV.auth.firebase.inspect().capabilities.sessionBridge` | `'available'` |
| `MV.auth.firebase.inspect().capabilities.logoutBridge` | `'available'` |

Ready state'te wrapper'ın dört ana yüzeyi (signIn, signOut,
currentUser, onChange) hepsi guard arkasında live çalışır. Mode
`'partial-live'` kalır — bu admin HTML rewire'ın yapılmadığını
gösterir (form/handler hâlâ devLogin/logout zincirinde).

---

## 7. Capability Matrix

| Capability | Current State | Notes |
|---|---|---|
| Firebase App SDK | loaded on admin pages | Pasif yükleme — init guard placeholder ise no-op (alpha.5). |
| Firebase Auth SDK | loaded on admin pages | Pasif yükleme — login formuna bağlı değil (alpha.6). |
| External config injection | available | `window.MV_FIREBASE_CONFIG` Path A/B üzerinden enjekte edilebilir (alpha.9). |
| Local config opt-in loader | available | Query param + explicit flag desteklenir (alpha.10). |
| `inspect()` | available | Side-effect-free snapshot (alpha.11). |
| `signIn()` | live when ready | `isAuthReady=true` iken gerçek SDK çağrısı; aksi `placeholder` no-op (alpha.12). |
| `createSessionFromResult()` | available | Strict validation; başarılı result → `mv_admin_session` (alpha.13). |
| `signOut()` | live when ready | `isAuthReady=true` iken gerçek SDK çağrısı; aksi `placeholder` no-op (alpha.14). |
| `clearSessionAfterSignOut()` | available | Strict validation; başarılı result → session clear (alpha.14). |
| `currentUser()` | live-read when ready | `isAuthReady=true` iken `auth.currentUser` property'si okunur; sanitized 5-field snapshot veya `null`. Hiçbir SDK method invoke etmez (alpha.16). |
| `onChange()` | live-listener when ready | `isAuthReady=true` iken gerçek `onAuthStateChanged` listener kurar; callback sanitized snapshot/null alır; safe unsubscribe (alpha.17). |
| Auth wrapper layer | ready behind guard | signIn / signOut / currentUser / onChange dört yüzeyi de ready iken live, placeholder'da no-op (alpha.6 → alpha.17). |
| Admin login form Firebase mode | opt-in trial available | `admin/index.html` flag arkasında `signIn` + `createSessionFromResult`. Default hâlâ `devLogin` (alpha.19). |
| Dashboard logout Firebase mode | opt-in trial available | `admin/dashboard.html` flag arkasında `signOut` + `clearSessionAfterSignOut`. Default hâlâ `MV.auth.logout` (beta.1). |
| Trial flag persistence | available | Dev hostta `?mvFirebaseLogin=1/true` → `sessionStorage 'mv_firebase_login_trial'='1'`; `?mvFirebaseLogin=0/false` temizler. Login → dashboard navigasyonu boyunca trial korunur. Production'da query param no-op (beta.2). |
| Production devLogin guard scaffold | available, enforce pending | `shared/js/auth.js` içinde scaffold mevcut; `MV_ENFORCE_FIREBASE_AUTH === true` set edilmedikçe production'da `MV.auth.devLogin` hâlâ format-only davranışıyla açık. Enforce eşik koşulları §12.4'te (beta.2 scaffold, beta.3 checklist). |
| Trial status UX | available | `admin/index.html` ve `admin/dashboard.html` üzerinde `#firebaseTrialIndicator` elementi `isFirebaseLoginTrialEnabled()` true ise "Firebase Trial Aktif" gösterir; default modda hiç görünmez. Operatör görünürlüğüdür, güvenlik sınırı değil (beta.3). |
| Firestore SDK passive load | available | 6 admin sayfasına `firebase-firestore-compat.js` `firebase-auth-compat.js`'ten sonra, `shared/config/firebase.js`'den önce yüklendi. Public site / borç paneli etkilenmedi. Yalnız SDK script — `firebase.firestore()` çağrısı yapılmıyor (v12.1.0-pre.1). |
| Firestore readiness helpers | available, passive only | `MV_FIREBASE.hasFirestoreSdk` / `isFirestoreReady` / `getFirestoreProvider` / `inspectFirestore`. Side-effect-free; sadece probe ve report. Provider getter ready iken namespace döner ama wrapper hiçbir method invoke etmez (v12.1.0-pre.1). |
| Firestore read | pending | v12.2.0+ Read-only admin modules Firebase read fazına bırakıldı. |
| Firestore write / CRUD | pending | v12.3.0+ CRUD fazına bırakıldı; modül başına create/update/delete + `adminLogs` write desenleri. |
| Firestore | not started | Firestore SDK admin sayfalarına eklenmedi. |
| CRUD | not started | announcements / events / apps modülleri read-only. |
| Debt panel migration | out of scope | `admin/borc/index.html` v12.0 – v12.5 boyunca dokunulmaz. |

---

## 8. Manual Sign-in Test Chain

DevTools console'undan **gerçek local config ready** iken
çalıştırılabilecek zincir. **Placeholder değerler kullan**;
gerçek admin email/password buraya yazılmaz, dokümana
commitlenmez.

```js
// 1) Firebase Auth çağrısı (live when ready)
const result = await MV.auth.firebase.signIn(
  'admin@example.com',
  'PLACEHOLDER_PASSWORD'
);
result;
// Beklenen ready: { enabled:true, ok:true, uid, email, provider:'firebase-auth' }
// Beklenen placeholder: { enabled:false, ok:false, reason:'placeholder' }

// 2) Session bridge (manuel — signIn otomatik çağırmaz)
if (result.ok) {
  MV.auth.firebase.createSessionFromResult(result);
}

// 3) Gate doğrulaması
MV.auth.isAuthed();    // true (mv_admin_session yazıldıysa)
MV.auth.getUser();     // { username: email, provider: 'firebase-auth', loginAt }
```

> **Uyarı:** Bu zincir gerçek local/staging config ready ise
> Firebase backend'e **gerçek login isteği** gönderir. Test için
> gerçek admin hesabı yerine ayrı bir test hesabı kullanılması
> önerilir. Sonuçtaki `uid` / `email` repo'ya commitlenmez.

---

## 9. Manual Sign-out Test Chain

DevTools console'undan **logged-in oturum** üzerinde çalıştırılabilecek
zincir:

```js
// 1) Firebase Auth signOut (live when ready)
const result = await MV.auth.firebase.signOut();
result;
// Beklenen ready: { enabled:true, ok:true, provider:'firebase-auth' }
// Beklenen placeholder: { enabled:false, ok:false, reason:'placeholder' }

// 2) Logout bridge (manuel — signOut otomatik çağırmaz)
if (result.ok) {
  MV.auth.firebase.clearSessionAfterSignOut(result);
}

// 3) Gate doğrulaması
MV.auth.isAuthed();    // false (mv_admin_session temizlendiyse)
```

> **Uyarı:** `signOut()` **otomatik session temizlemez.**
> `clearSessionAfterSignOut(result)` ayrı çağrılır. İki aşama
> bilinçli olarak ayrı tutuluyor (Firebase Auth çağrısı + local
> session clear). Bu sayede ikisi bağımsız test edilebilir ve
> gelecekteki `logout()` yan etkileri bridge davranışını
> değiştirmez.

---

## 10. Manual onChange Listener Example

DevTools console'undan Firebase Auth state değişimlerini gözlemlemek
için kullanılabilecek zincir (alpha.17 ile live hale geldi):

```js
// Listener kur (sanitized callback)
const sub = MV.auth.firebase.onChange(function (user) {
  console.log('auth state:', user);
});

sub;
// Beklenen ready: { enabled:true, ok:true, provider:'firebase-auth', unsubscribe:fn }
// Beklenen placeholder: { enabled:false, ok:false, reason:'placeholder', unsubscribe:fn }

// Listener'ı kapat (her durumda çağrılabilir — placeholder'da no-op)
sub.unsubscribe();
```

**Davranış garantileri:**

- Callback yalnız iki şeyden birini alır:
  - Sanitized 5-field snapshot — `{ uid, email, emailVerified,
    displayName, provider:'firebase-auth' }`
  - `null` (signed out)
- Raw Firebase user objesi callback'e **hiçbir koşulda** verilmez.
  `refreshToken`, `accessToken`, `getIdToken`, `providerData`,
  `metadata`, `phoneNumber`, `photoURL`, `tenantId`, `stsTokenManager`
  alanları **filtrelenir**.
- `onChange()` `sessionStorage`'a **yazmaz / silmez**.
- `onChange()` `createSessionFromResult` veya
  `clearSessionAfterSignOut` bridge'lerini **çağırmaz**.
- `onChange()` `requireAdmin` veya `redirect` **tetiklemez**.
- `sub.unsubscribe()` her durumda çağrılabilir bir function'dır
  ve `try/catch` ile sarılmıştır — SDK'dan dönen unsubscribe
  patlasa bile sayfayı bozmaz.

> **Uyarı:** Listener gerçek local/staging config ready ise Firebase
> Auth SDK arka planda token refresh için ağ kullanabilir. Bu
> davranış SDK'ya aittir; wrapper ekstra fetch başlatmaz.

---

## 11. Admin Login/Logout Trial Walkthrough

§8–§10 devtools console üzerinden doğrudan wrapper çağrı zincirini
gösteriyor. Bu bölüm **admin HTML formları/butonları üzerinden**
opt-in trial'ın nasıl etkinleştirildiğini ve hangi davranışların
beklendiğini özetler.

### Trial fazları

| Faz | Sayfa | Eklenen davranış |
|---|---|---|
| v12.0.0-alpha.19 | `admin/index.html` | Login form submit'i flag arkasında `MV.auth.firebase.signIn` + `createSessionFromResult` zincirine bağlandı. |
| v12.0.0-beta.1 | `admin/dashboard.html` | Logout butonu flag arkasında `MV.auth.firebase.signOut` + `clearSessionAfterSignOut` zincirine bağlandı. |

İki sayfa **aynı opt-in flag**'ı paylaşır — tek aktivasyonla zincirin
tamamı (login → dashboard → logout) Firebase moduna geçer.

### Opt-in kanalları

**1. Explicit global flag** (her host'ta çalışır):

```js
window.MV_ADMIN_FIREBASE_LOGIN = true;
```

Bu, sayfanın script bloku çalışmadan **önce** (örn. ilk
`<script>` tag içinde veya devtools'tan ilk submit/click öncesi)
set edilmelidir.

**2. URL query param** (yalnız dev host: `localhost` / `127.0.0.1`
/ `0.0.0.0` / `file:`):

```
http://localhost:8080/admin/index.html?mvFirebaseLogin=1
http://localhost:8080/admin/dashboard.html?mvFirebaseLogin=true
```

Production host (örn. `admin.metavis1on.com`) üzerinde query param
**sessizce ignore** edilir; davranış default'a düşer.

### Login akışı (alpha.19) — opt-in aktif iken

```
1) Form submit (email + password)
2) MV.auth.firebase.signIn(email, password)
3) Branch:
   ├─ enabled:false (Firebase not ready) → devLogin fallback
   ├─ ok:true → createSessionFromResult → mv_admin_session yazılır
   │           → "Giriş başarılı..." toast/feedback → /dashboard.html
   └─ enabled:true, ok:false → friendly Türkçe error
                              → buton reset
                              → devLogin fallback YOK (silent
                                downgrade güvenlik açığı)
```

### Logout akışı (beta.1) — opt-in aktif iken

```
1) Logout button click → buton disabled + "Çıkış yapılıyor..."
2) MV.auth.firebase.signOut()
3) Branch:
   ├─ enabled:false (Firebase not ready) → MV.auth.logout fallback
   │                                       → "Oturum kapatıldı." toast
   │                                       → /admin/index.html
   ├─ ok:true → clearSessionAfterSignOut → mv_admin_session silinir
   │           → "Oturum kapatıldı." toast → /admin/index.html
   └─ enabled:true, ok:false → friendly error toast
                              → buton reset
                              → session KORUNUR (silent downgrade YOK)
                              → operatör retry edebilir
```

### Doğrulama (DevTools'tan)

Opt-in aktifken `MV.auth.firebase.inspect()` çağırıldığında:

```js
inspect().mode === 'partial-live'
inspect().capabilities.signIn === 'live'
inspect().capabilities.signOut === 'live'
```

Login sonrası session içeriği:

```js
JSON.parse(sessionStorage.getItem('mv_admin_session'))
// { authed:true, username:<email>, email, uid, loginAt, provider:'firebase-auth' }
```

Logout sonrası:

```js
sessionStorage.getItem('mv_admin_session') === null
```

`window.MV_DEBUG_AUTH = true` set edildiğinde her iki sayfada da
`[alpha.19 login]` ve `[beta.1 logout]` prefixli console log'lar
(signIn/signOut result, bridge result, fallback nedeni) yazılır.

beta.3 ile her iki sayfada "Firebase Trial Aktif" rozet/pill
görünür hale gelir (login üstünde `.admin-auth-badge`, dashboard
üst barında `.adm-pill`); detay §12.3'te.

### Default davranış (flag yok)

- Login form: `MV.auth.devLogin` → 350ms→500ms zinciri → `dashboard.html`.
- Dashboard logout: `MV.auth.logout` → 700ms toast→redirect zinciri.
- Bit-identical alpha.19 / beta.1 öncesi davranış; sessionStorage
  payload'unda `provider:'dev-session'`.

### Güvenlik notları (bkz. §15)

- Firebase ready + credential/signOut failure durumunda **silent
  downgrade asla yapılmaz**.
- Trial flag URL üzerinden production host'ta aktif olmaz.
- Explicit global flag bilinçli override'dır; default'ta hiçbir
  yerde set edilmez.

---

## 12. Trial Persistence and Production devLogin Guard

beta.2 iki kontrollü iyileştirme ekledi: trial flag'in aynı browser
session boyunca korunması ve `MV.auth.devLogin`'in production'da
ileride güvenle kapatılabilmesi için kontrollü guard scaffold'u.
Aşağıdaki bölümler her ikisini ayrı ayrı açıklar.

### 12.1 Trial Flag Persistence

**Sorun.** beta.1 öncesinde `?mvFirebaseLogin=1` yalnız o tek
sayfa'nın query string'inde aktifti. Login formu submit edip
dashboard'a yönlendiği anda query string kaybolur, dashboard'daki
logout butonu trial flag'i göremezdi. Operatör tek aktivasyonla
login + logout zincirinin tümünü Firebase moduna alamıyordu.

**Çözüm.** Dev host + `?mvFirebaseLogin=1` (veya `=true`) artık
`sessionStorage` key `mv_firebase_login_trial`'i `'1'` olarak yazar.
Aynı browser session boyunca login → dashboard navigasyonu query
string'i kaybetse bile trial aktif kalır.

| URL / Flag | Dev host | Production host |
|---|---|---|
| `?mvFirebaseLogin=1` | sessionStorage yazılır → trial aktif | no-op (ignore) |
| `?mvFirebaseLogin=true` | sessionStorage yazılır → trial aktif | no-op (ignore) |
| `?mvFirebaseLogin=0` | sessionStorage temizlenir → trial pasif | no-op (ignore) |
| `?mvFirebaseLogin=false` | sessionStorage temizlenir → trial pasif | no-op (ignore) |
| Param yok | sessionStorage'a dokunulmaz; mevcut state korunur | sessionStorage'a dokunulmaz |
| `window.MV_ADMIN_FIREBASE_LOGIN = true` | host bağımsız aktif | host bağımsız aktif |

**Trial aktivasyon önceliği** (her iki sayfada da `isFirebaseLoginTrialEnabled`):

```
1. window.MV_ADMIN_FIREBASE_LOGIN === true  → aktif (her host)
2. Dev host + ?mvFirebaseLogin=1 veya =true → aktif (immediate)
3. sessionStorage 'mv_firebase_login_trial' === '1' → aktif
4. (yukarıdakilerin hiçbiri yoksa) pasif
```

**Persistence yazımı `MV.auth.isAuthed()` / `MV.auth.requireAdmin`
short-circuit'inden ÖNCE çalışır.** Aksi halde login sayfası
"zaten authed → dashboard" kestirme yolunu kullanırsa
sessionStorage'a yazım olmadan zıplardı. Hem `admin/index.html`
hem `admin/dashboard.html` IIFE'leri en üstte
`persistFirebaseLoginTrialIfRequested()` çağırır.

**Helper iskeleti (HTML duplication kabul edildi — bu fazda
shared helper'a taşımak kapsam dışı):**

| Helper | Görev |
|---|---|
| `isDevHost()` | `localhost` / `127.0.0.1` / `0.0.0.0` / `file:` tanır. |
| `getFirebaseLoginTrialParam()` | Query string'den `mvFirebaseLogin` değerini okur (yoksa `null`). |
| `persistFirebaseLoginTrialIfRequested()` | Dev host + valid değer → sessionStorage write/clear; production'da no-op. |
| `isFirebaseLoginTrialPersisted()` | sessionStorage'da `'1'` mı bakar. |
| `isFirebaseLoginTrialEnabled()` | Yukarıdaki üç kanaldan birini OR'lar. |

**DevTools doğrulaması (dev host'ta):**

```js
// Aktive et
window.location.href = './index.html?mvFirebaseLogin=1';

// sessionStorage'da yazıldığını doğrula
sessionStorage.getItem('mv_firebase_login_trial'); // → '1'

// Dashboard'a geç (query string olmadan); trial aktif kalır
window.location.href = './dashboard.html';

// Deaktive et
window.location.href = './dashboard.html?mvFirebaseLogin=0';
sessionStorage.getItem('mv_firebase_login_trial'); // → null
```

**Production host'ta query param sessizce ignore edilir:**

```js
// Production'da
// admin.example.com/admin/index.html?mvFirebaseLogin=1
sessionStorage.getItem('mv_firebase_login_trial'); // → null (yazılmadı)
// isFirebaseLoginTrialEnabled() → false (param production'da read edilmiyor)
```

### 12.2 Production devLogin Guard Scaffold

**Sorun.** `MV.auth.devLogin` v10 fazlarından beri format-only
geçici dev oturumu üretir; gerçek parola kontrolü yapmaz. Production
ortamında Firebase Auth tam wiring'e kadar bu fonksiyonun arka kapı
kalmaması istenir.

**Karar.** beta.2 yalnız **scaffold** ekler. Default'ta production
hostta `devLogin` hâlâ format-only davranışıyla **açık** kalır —
çünkü Firebase production config henüz default loader path'inde
hazır değil; şimdi kapatmak operatörü kilitler. Enforce beta.3+
fazına bırakıldı.

**Aktivasyon koşulu:**

```js
// İki koşul birden gerekir
isProductionHost  === true   // !localhost && !127.0.0.1 && !0.0.0.0 && !file:
window.MV_ENFORCE_FIREBASE_AUTH === true
```

| Koşul | `MV.auth.devLogin(u, p)` dönüşü |
|---|---|
| Dev host (her zaman) | Mevcut format-only davranış. |
| Production host + enforce flag **yok** | Mevcut format-only davranış (default). |
| Production host + enforce flag **true** | `{ ok:false, error:'Geliştirme girişi üretim ortamında devre dışı.' }` |

**Garantiler:**

- Guard SADECE `devLogin`'in giriş noktasını değiştirir; başka hiçbir
  davranış (`isAuthed`, `requireAdmin`, `logout`, `getUser`,
  `MV.auth.firebase.*`) etkilenmez.
- `MV.auth` üzerinde yeni public API yüzeyi açılmadı; guard internal
  helper'lar (`isProductionHostForDevLoginGuard`,
  `isDevLoginGuardEnforced`).
- Dev host detection guard içinde de aynı pattern (`localhost` /
  `127.0.0.1` / `0.0.0.0` / `file:`); HTML helper'larıyla simetrik.
- `SESSION_KEY` (`'mv_admin_session'`), `SESSION_TTL_MS` (8 saat) ve
  `mv_admin_session` payload şekli **bit-identical**.

**DevTools doğrulaması (production hostta):**

```js
// Default (enforce flag yok) — devLogin çalışır
MV.auth.devLogin('admin', 'PLACEHOLDER').ok;  // → true

// Enforce flag set
window.MV_ENFORCE_FIREBASE_AUTH = true;

// devLogin kapanır
MV.auth.devLogin('admin', 'PLACEHOLDER');
// → { ok:false, error:'Geliştirme girişi üretim ortamında devre dışı.' }
```

**DevTools doğrulaması (dev hostta — guard kapalı kalmalı):**

```js
window.MV_ENFORCE_FIREBASE_AUTH = true; // dev host'ta etkisiz
MV.auth.devLogin('admin', 'PLACEHOLDER').ok; // → true (dev hostta her zaman açık)
```

### 12.3 Operator Visibility (Trial Status UX)

**Sorun.** beta.2 ile trial bir sayfada aktive edildiğinde tüm
oturum boyunca persistent olarak kalıyor. Operatör hangi modda
olduğunu unutabilir; "Firebase mi devLogin mi çalışıyor?" sorusu
sessizce kalıyor.

**Çözüm.** beta.3 her iki admin sayfasına küçük bir
`#firebaseTrialIndicator` elementi ekledi:

- `admin/index.html` üzerinde "Yetkili Yönetim Alanı" badge'inin
  yanında "Firebase Trial Aktif" rozeti (`.admin-auth-badge`
  shape, mor accent).
- `admin/dashboard.html` üzerinde üst bar action'larında, "Ana
  Siteye Dön" / "Çıkış Yap" butonlarından önce "Firebase Trial
  Aktif" pill'i (`.adm-pill` shape, mor accent).

**Davranış garantileri:**

- Element HTML'de inline `style="display:none"` ile gelir —
  default sayfa yüklemesinde **kesinlikle flash etmez**.
- `updateFirebaseTrialIndicator()` IIFE sonunda çağrılır;
  `isFirebaseLoginTrialEnabled()` true ise `display:inline-flex`,
  değilse `display:none`.
- Try/catch sarmalı sayesinde DOM yokken veya sessionStorage
  erişimi başarısızken sayfa bozulmaz.
- **Güvenlik mekanizması değildir.** Submit handler / logout
  handler hangi yolu seçeceğine bağımsız olarak karar verir;
  indicator yalnız o kararın aynasıdır. Operatör indicator'ı
  CSS ile gizlese bile trial davranışı değişmez.
- Yeni CSS class eklenmedi; mevcut `.admin-auth-badge` /
  `.adm-pill` shape'i kullanıldı + inline style ile mor accent.
- Yeni event listener / interval eklenmedi; indicator dinamik
  olarak güncellenmez (page load anındaki state'i yansıtır).

**DevTools doğrulaması:**

```js
// Default (flag yok) — indicator hidden
document.getElementById('firebaseTrialIndicator').style.display;
// → 'none'

// Trial aktive et (dev host)
sessionStorage.setItem('mv_firebase_login_trial', '1');
// Sayfayı yeniden yükle. Indicator artık görünür:
document.getElementById('firebaseTrialIndicator').style.display;
// → 'inline-flex'
// Visible text: "Firebase Trial Aktif"

// Trial deaktive et
sessionStorage.removeItem('mv_firebase_login_trial');
// Sayfayı yeniden yükle. Indicator gizlenir.
```

### 12.4 Production Enforce Checklist

beta.2 `MV_ENFORCE_FIREBASE_AUTH` guard'ını ekledi ama
**default'u OFF** tuttu. Production enforce'a geçmeden önce
aşağıdaki yedi adımın her biri canlı production hostta sırayla
doğrulanmalı. Bir adımın bile başarısız olması enforce'u
durdurma sebebidir.

```
[1] Local config ready
    - shared/config/firebase.local.js gerçek production
      project değerleriyle yüklü (Path A manuel script tag
      veya Path B opt-in loader).
    - looksReal() placeholder testini geçiyor.

[2] MV_FIREBASE.getStatus() === 'ready'
    - DevTools console üzerinden doğrula.
    - 'placeholder' / 'disabled' / 'error' durumunda DURDUR.

[3] MV.auth.firebase.inspect() capabilities ready
    - mode === 'partial-live'
    - capabilities.signIn === 'live'
    - capabilities.signOut === 'live'
    - capabilities.currentUser === 'live-read'
    - capabilities.onChange === 'live-listener'
    - sessionBridge === 'available'
    - logoutBridge === 'available'
    - Yukarıdakilerin herhangi biri 'no-op' ise DURDUR.

[4] Login trial success
    - window.MV_ADMIN_FIREBASE_LOGIN = true (veya dev host'ta
      ?mvFirebaseLogin=1) ile production login form'undan
      gerçek admin hesabıyla giriş yapılıyor.
    - Beklenen: friendly success feedback +
      mv_admin_session.provider === 'firebase-auth'.
    - Wrong-password / network failure friendly Türkçe mesaj
      gösteriyor, devLogin'e SİLENT DOWNGRADE YOK.

[5] Dashboard logout trial success
    - Aynı oturum içinde logout butonu Firebase yolunu
      kullanıyor (beta.1 + beta.2 persistence ile).
    - sessionStorage 'mv_admin_session' temizleniyor;
      './index.html' redirect çalışıyor.
    - "Firebase Trial Aktif" indicator login ve dashboard
      üzerinde görünüyor (beta.3).

[6] devLogin fallback artık gereksiz mi doğrulandı
    - Production Firebase ready iken devLogin'e düşmek
      gereksiz mi? Bilinen admin'lerin tümü Firebase
      Auth + admin allowlist üzerinden giriş yapabiliyor mu?
    - Backup admin erişim kanalı (örn. owner UID Firebase
      Console'da) hazır mı?
    - HAYIR ise enforce'u erteleyin.

[7] MV_ENFORCE_FIREBASE_AUTH true test
    - Yukarıdaki 6 adım PASS olduktan SONRA:
    - DevTools'tan window.MV_ENFORCE_FIREBASE_AUTH = true set
      et, MV.auth.devLogin('test', '...') çağrısı
      { ok:false, error:'Geliştirme girişi üretim ortamında
      devre dışı.' } döndüğünü doğrula.
    - Firebase Auth login zinciri yine çalışıyor mu doğrula.
    - HAYIR ise scaffold koşul mantığını gözden geçir, DURDUR.
```

Bu checklist tamamlandıktan sonra `MV_ENFORCE_FIREBASE_AUTH`
true olarak production loader path'ine bilinçli olarak alınabilir
(ayrı paket faz, beta.4+). Checklist tek başına flag'i flip
etmez — yalnız enforce'a geçmek için gereken ön doğrulamayı
listeler.

**Erken enforce riski.** Bu checklist tamamlanmadan enforce
edilirse operatör admin paneline giremez hale gelir. Guard
scaffold tek başına bu durumu çözmez — yalnız kapatma
mekanizması sağlar. devLogin format-only olduğu için bugünkü
operasyonel anahtardır; Firebase tarafı tam ready olmadan
kapatılırsa kayıt yok.

---

## 13. Firestore Passive SDK Readiness Layer

v12.1.0-pre.1 Firestore tarafına geçişin **ilk pasif altyapısını**
kurdu. Bu bölüm SDK script yüklenmesini, `MV_FIREBASE` üzerine
eklenen readiness helper'larını ve bu fazda yapılmayanları açıkça
listeler.

### 13.1 Bu Fazda Yapılmayanlar (kritik)

- **Hiçbir `firebase.firestore()` çağrısı yapılmıyor.** Ne loader
  içinde, ne `MV.auth.firebase` wrapper'ında, ne admin sayfalarında.
- **Hiçbir read** yok: `collection()` / `doc()` / `getDoc()` /
  `getDocs()` / `onSnapshot()` / `query()` / `where()` /
  `orderBy()` / `limit()` çağrısı 0.
- **Hiçbir write** yok: `setDoc()` / `updateDoc()` / `deleteDoc()` /
  `addDoc()` / `writeBatch()` / `runTransaction()` çağrısı 0.
- **Hiçbir CRUD** açılmadı. announcements / events / apps modülleri
  hâlâ read-only static; logs modülü hâlâ statik özet.
- **Firestore network** açılmadı. SDK script CDN'den yüklense bile
  `firebase.firestore()` invoke edilmediği için tek bir Firestore
  istek paketi gönderilmiyor.

### 13.2 SDK Script Yükleme

Aşağıdaki 6 admin sayfasına `firebase-firestore-compat.js`
`firebase-auth-compat.js`'ten **sonra**, `shared/config/firebase.js`'den
**önce** eklendi:

- `admin/index.html`
- `admin/dashboard.html`
- `admin/announcements.html`
- `admin/events.html`
- `admin/apps.html`
- `admin/logs.html`

Script tag sırası (her sayfada):

```html
<script src="../shared/config/site.js"></script>
<script src=".../firebase-app-compat.js"></script>
<script src=".../firebase-auth-compat.js"></script>
<script src=".../firebase-firestore-compat.js"></script>  <!-- v12.1.0-pre.1 -->
<script src="../shared/config/firebase.js"></script>
<script src="../shared/js/core.js"></script>
<script src="../shared/js/theme.js"></script>
<script src="../shared/js/auth.js"></script>
```

**Dokunulmayan sayfalar:**
- `index.html` (public site) — Firebase SDK hiç yüklenmiyor.
- `borc.html` — yalnız meta-refresh / JS redirect.
- `admin/borc/index.html` — kendi inline `firebaseConfig`'iyle
  izole çalışır; v12 wrapper'ı ile karışmaz.

### 13.3 Readiness Helper API'si

`MV_FIREBASE` üzerine 4 yeni helper eklendi. Auth tarafındaki
(`hasAuthSdk` / `isAuthReady` / `getAuthProvider`) helper'larıyla
**simetrik**; tamamı side-effect-free, hiçbir method invoke etmiyor.

| Helper | Görev |
|---|---|
| `hasFirestoreSdk()` | Captured namespace'in `firestore` property'si callable mı? SDK presence probe'u. |
| `isFirestoreReady()` | `isAvailable() && hasFirestoreSdk()` — app init + SDK presence birlikte mi? |
| `getFirestoreProvider()` | Ready ise namespace döner, değilse `null`. Caller `.firestore()`'u kendisi çağırır (bu fazda kimse çağırmıyor). |
| `inspectFirestore()` | Structured snapshot — `enabled`, `reason`, `status`, `hasFirestoreSdk`, `isFirestoreReady`, `hasProvider`, `mode:'passive'`, `capabilities: { read:'no-op', write:'no-op', crud:'no-op' }`. |

### 13.4 DevTools Doğrulama

**Default repo (placeholder config, opt-in flag yok):**

```js
MV_FIREBASE.hasFirestoreSdk();   // true  — SDK script yüklendi
MV_FIREBASE.isFirestoreReady();  // false — config placeholder, app init yok
MV_FIREBASE.getFirestoreProvider(); // null
MV_FIREBASE.inspectFirestore();
// → {
//     enabled: false,
//     reason: 'placeholder',
//     status: 'placeholder',
//     hasLoader: true,
//     hasFirestoreSdk: true,
//     isFirestoreReady: false,
//     hasProvider: false,
//     mode: 'passive',
//     capabilities: { read:'no-op', write:'no-op', crud:'no-op', sdkPresent:'yes' }
//   }
```

**Local config ready (Path B, gerçek `firebase.local.js` yüklü):**

```js
MV_FIREBASE.isFirestoreReady(); // true
MV_FIREBASE.getFirestoreProvider() === window.firebase; // true (namespace, NOT instance)
MV_FIREBASE.inspectFirestore().mode; // 'passive' (CRUD hâlâ kapalı)
MV_FIREBASE.inspectFirestore().capabilities; // read/write/crud hepsi 'no-op'
```

Mode ready iken bile **`'passive'`** kalır — bu, wrapper'da hiçbir
read/write surface açılmadığını sinyalize eder. Bunu değiştiren
faz v12.2+ olacak.

### 13.5 Garantiler

- `getFirestoreProvider()` ready iken namespace'i (window.firebase)
  döner; **Firestore instance'ı dönmez**. Caller'lar `.firestore()`'u
  kendileri invoke etmek zorunda — bu fazda hiçbir caller bunu
  yapmıyor.
- Yeni helper'lar mevcut API yüzeyini bozmaz: `init`, `getStatus`,
  `getConfig`, `isConfigured`, `isAvailable`, `isEnabled`,
  `hasAuthSdk`, `isAuthReady`, `getAuthProvider`,
  `hasExternalConfig`, `getExternalConfig`, `resolveConfig`,
  `isLocalConfigLoadEnabled`, `getLocalConfigStatus`,
  `loadLocalConfig`, `getLastError`, `getApp` — hepsi
  **bit-identical**.
- `MV.auth` ve `MV.auth.firebase.*` wrapper davranışı **bit-identical**.
- Admin login/logout trial davranışı, trial persistence, trial
  status indicator — hepsi **bit-identical**.
- `MV_ENFORCE_FIREBASE_AUTH` guard scaffold davranışı **bit-identical**.
- Borç paneli, public site, shared/css, assets, firebase.json,
  .firebaserc, firestore.rules, firestore.indexes.json,
  .gitignore — **dokunulmadı**.

---

## 14. Troubleshooting

Aşağıdaki tablo wrapper'dan dönen anormal durumların yorumudur.

| Belirti | Olası neden | Çözüm |
|---|---|---|
| `MV_FIREBASE.getStatus()` → `'placeholder'` | Config yok veya placeholder pattern'i `looksReal()` kontrolünden geçmedi. | `firebase.local.js`'i Path B opt-in ile yükle; gerçek değerler içerip içermediğini doğrula. |
| `MV_FIREBASE.getStatus()` → `'disabled'` | Loader hazır değil veya init çağrılmamış. | Console'da `MV_FIREBASE` namespace'inin yüklendiğini ve `firebase.js`'in çalıştığını doğrula. |
| `MV_FIREBASE.getLocalConfigStatus()` → `'error'` | `firebase.local.js` 404 veya yükleme hatası. | Dosyanın doğru klasörde olduğunu (`shared/config/firebase.local.js`) ve syntax error içermediğini kontrol et. |
| `MV_FIREBASE.isAuthReady()` → `false` | App ready değil veya Auth SDK yüklenmemiş. | `MV_FIREBASE.isAvailable()` + Auth SDK script tag'inin admin HTML'de yüklendiğini doğrula. |
| `signIn(...)` → `{ enabled:false, ok:false, reason:'placeholder' }` | Ready değil; default repo davranışı. | Local config'i etkinleştir (Path B). |
| `signIn(...)` → `{ ok:false, reason:'auth/wrong-password' }` | Firebase Auth gerçek hata döndü. | Credential'ı doğrula; ready zincirinin bozulmadığını gösterir (live SDK çağrıldı). |
| `signIn(...)` → `{ ok:false, reason:'invalid-email' }` | Email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) geçmedi. | Email formatını düzelt. |
| `signIn(...)` → `{ ok:false, reason:'invalid-password' }` | Password < 6 karakter. | Test parolasını uzat (Firebase Auth minimum 6 karakter). |
| Session yazılmıyor (login sonrası `isAuthed()` false) | `createSessionFromResult` çağrılmadı. | Bridge'i manuel çağır — `signIn` otomatik session yazmaz. |
| `requireAdmin()` geçmiyor | `mv_admin_session` oluşmamış veya 8 saatlik TTL geçmiş. | Login zincirini tekrar et; bridge'in çağrıldığını doğrula. |
| `signOut(...)` ok ama hâlâ logged-in görünüyor | `clearSessionAfterSignOut` çağrılmadı. | Bridge'i manuel çağır — `signOut` otomatik session clear yapmaz. |
| `signOut(...)` → `{ ok:false, reason:'auth/network-request-failed' }` | Firebase Auth network hatası. | Bağlantıyı kontrol et; SDK error code'u olduğu gibi forward edilir. |
| `currentUser()` → `null` ama logged-in olduğun belli | Auth state listener henüz tetiklenmemiş olabilir veya provider acquisition başarısız. | `inspect()` çağırarak `hasProvider` / `isAuthReady` durumunu doğrula; gerekirse `onChange` ile state değişimini gözlemle. |
| `onChange(...)` → `{ enabled:false, ok:false, reason:'invalid-callback' }` | Verilen değer function değil. | Callback'i function olarak ver. |
| `onChange(...)` → `{ enabled:true, ok:false, reason:'no-auth-state-listener' }` | Auth instance `onAuthStateChanged` method'una sahip değil — SDK versiyonu uyumsuz olabilir. | Firebase Auth SDK script tag'ini ve versiyonunu doğrula. |
| `sub.unsubscribe()` çağrısı sessizce geçti ama callback hâlâ tetikleniyor | Aynı callback için birden fazla `onChange` çağrısı yapılmış olabilir; her biri kendi `sub` objesini döner. | Her `onChange` çağrısı için dönen `sub.unsubscribe()`'i ayrı ayrı çağır. |
| `?mvFirebaseLogin=1` set ettim ama login formu hâlâ `devLogin` çalışıyor | Production host'ta query param ignore edilir; veya `firebase.local.js` yüklü değil → `signIn` `enabled:false` → safe fallback. | Localhost / 127.0.0.1 / file: kullan **veya** `window.MV_ADMIN_FIREBASE_LOGIN = true` set et. `MV_FIREBASE.isAuthReady() === true` olduğunu doğrula. |
| Login başarılı oldu ama dashboard'da `getUser().username` boş | Bridge `username` alanı için `result.email` kullanır; SDK email döndürmediyse `null` olabilir. | DevTools'tan `JSON.parse(sessionStorage.getItem('mv_admin_session'))` ile email alanını doğrula. |
| Logout butonuna bastım, hata toast'u çıktı ama hâlâ logged-in | beta.1 davranışı: Firebase ready + signOut fail → session **bilinçli olarak** korunur; operatör retry edebilir. | Toast'taki hata mesajını oku; bağlantı/yetki sorunu giderildikten sonra butona tekrar bas. Gerçekten devLogin'e düşmek istiyorsan trial flag'ini kapat. |
| `?mvFirebaseLogin=1` ile login açtım, dashboard'da trial kapandı | beta.2 öncesi pattern düşünülüyor olabilir; veya `sessionStorage` ayrı tab/window kapsamında olduğu için aynı browser session değil. | Aynı tab içinde devam et. DevTools'tan `sessionStorage.getItem('mv_firebase_login_trial')` ile yazımı doğrula. Production hostta query param ignore edilir. |
| Dev hostta `?mvFirebaseLogin=0` çalışmadı, trial hâlâ aktif | URL'i ziyaret ederken `MV_ADMIN_FIREBASE_LOGIN` global flag set edilmiş olabilir — bu flag sessionStorage'dan bağımsız öncelik kazanır. | `window.MV_ADMIN_FIREBASE_LOGIN` değerini DevTools'tan oku; `false`/`undefined` olduğunu doğrula. |
| Production'da `MV_ENFORCE_FIREBASE_AUTH = true` set ettim, devLogin hâlâ çalışıyor | Host gerçekten dev olabilir (örn. local proxy `localhost` adıyla çalışıyor); veya flag set edilmeden önce devLogin çağrıldı. | `isDevHost()` mantığını (`localhost` / `127.0.0.1` / `0.0.0.0` / `file:`) doğrula; flag set'inin ilk submit'ten önce çalıştığını kontrol et. |
| Dev hostta `MV_ENFORCE_FIREBASE_AUTH = true` ama devLogin hâlâ açık | beta.2 davranışı: dev hostta enforce flag **etkisizdir** (operatörü local geliştirmede kilitlememek için). | Bu beklenen davranıştır; production guard'i test etmek için gerçek production hostuna gerek var veya host hostname'ini geçici olarak değiştir (yalnız test için). |
| "Firebase Trial Aktif" indicator default modda görünüyor | Bu görünmemeli; `window.MV_ADMIN_FIREBASE_LOGIN`, sessionStorage `mv_firebase_login_trial` ve `?mvFirebaseLogin=` query'sini doğrula. Üç kanaldan biri true ise indicator beklenen şekilde görünür. | DevTools console: `window.MV_ADMIN_FIREBASE_LOGIN`, `sessionStorage.getItem('mv_firebase_login_trial')`, `new URLSearchParams(location.search).get('mvFirebaseLogin')` ile state'i doğrula. Beklenmedik true varsa kaynağı temizle. |
| Trial aktif ama indicator görünmüyor | `updateFirebaseTrialIndicator()` IIFE sonunda çağrılır; DOM yokken sessizce çıkar. Element ID değişmiş olabilir veya inline style override edilmiş olabilir. | DevTools: `document.getElementById('firebaseTrialIndicator')` ile element'in varlığını kontrol et; `style.display` değerini incele. Sayfayı reload et. |
| Indicator'ı CSS ile gizledim, trial hâlâ aktif gibi davranıyor | Beklenen davranış. Indicator yalnız operatör görünürlüğüdür; submit handler / logout handler kararı bağımsız `isFirebaseLoginTrialEnabled()` ile alır. Gizleme güvenlik etkisi yapmaz. | Trial'ı gerçekten kapatmak için `?mvFirebaseLogin=0` veya sessionStorage key'i temizle. |

---

## 15. Security Notes

- **Client Firebase config secret değildir** ama yine de repo'ya
  gerçek değer commitlenmez. Bu policy iki nedenden değerli:
  (a) repo public tree'sini belirli bir Firebase project'e
  bağlamaz, (b) yanlış environment config'inin commit'le sızma
  riskini sıfırlar.
- **Gerçek yetki güvenliği** ileride üç katmanda sağlanır:
  Firebase Auth UID + Firestore Security Rules + opsiyonel
  custom claims / admin allowlist
  ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md)).
  Şu an wrapper sadece auth çağrılarını temiz şekilde
  yapılandırır; gerçek yetki katmanı v12.1.0+ Firestore Rules
  foundation'da gelir.
- **`sessionStorage` bridge geçici köprüdür.** `mv_admin_session`
  mevcut admin gate'inin (`MV.auth.requireAdmin`) tek
  source-of-truth'u olduğu için bridge yazılıyor. Firebase Auth
  persistence'a tam geçiş (`onChange` + `currentUser` live) ayrı
  faz; o zaman `sessionStorage` payload'u backward compat için
  tutulup tutulmayacağı ayrı karar olacak.
- **Production devLogin kapatma scaffold mevcut, enforce pending.**
  beta.2 `shared/js/auth.js` içine kontrollü guard ekledi:
  `window.MV_ENFORCE_FIREBASE_AUTH === true` set edildiğinde **ve**
  host bir dev host değilse `MV.auth.devLogin` kapanır ve
  `{ ok:false, error:'Geliştirme girişi üretim ortamında devre dışı.' }`
  döner. Default enforce **OFF** — Firebase production config +
  admin allowlist production smoke test'i tamamlanmadan true'ya
  alınmamalı; aksi halde operatör admin paneline giremez. Bkz.
  §12.2 + §12.3 ([`v12-readiness.md`](./v12-readiness.md) §7).
- **Admin authorization gap — enforce için kritik ön koşul.**
  v12.1.0-pre.2 itibarıyla `mv_admin_session` bridge'i geçerli bir
  Firebase Auth oturumunu admin gate'e çevirir; **rol/allowlist
  kontrolü içermez.** Yani enforce flag'i tek başına açılırsa,
  Firebase Auth Email/Password provider'ına eklenen herhangi bir
  e-posta admin paneline girer. Bu boşluk `admins/{uid}` allowlist
  sözleşmesi ve `firestore.rules` foundation draft ile **contract
  düzeyinde** kapatıldı (v12.1.0-pre.2); ancak runtime'da
  `admins/{uid}` okumak v12.1.0 fazına bırakıldı. Detay:
  [`firebase-admin-authorization.md`](./firebase-admin-authorization.md)
  §1 ve §7. **Enforce flag'i, allowlist runtime tarafında okunup
  gate'e bağlanmadan production'da true yapılmaz.**
- **Borç paneli izole tutuluyor.** `admin/borc/index.html` kendi
  inline `firebaseConfig`'i ve kendi auth gate'i ile çalışır;
  v12 Auth wrapper'ı ile karışmaz. Borç paneli v12.0 – v12.5
  boyunca kod düzeyinde dokunulmaz
  ([`debt-panel-audit.md`](./debt-panel-audit.md)).
- **Bu doküman gerçek credential içermez.** Bütün örnekler
  placeholder değerlerdir (`admin@example.com`,
  `PLACEHOLDER_PASSWORD`, `YOUR_API_KEY`, vs.). Gerçek UID /
  email / apiKey / projectId bu dokümana eklenmez. PR review
  sırasında bu kural ayrıca kontrol edilir.

---

## 16. Next Roadmap

Tamamlanan adımlar (referans):

| Adım | Faz | Durum |
|---|---|---|
| `currentUser` live read | v12.0.0-alpha.16 | ✅ Tamamlandı (`4243ceb`). |
| `onChange` live listener | v12.0.0-alpha.17 | ✅ Tamamlandı (`9d19299`). |
| Auth wrapper cleanup + docs refresh | v12.0.0-alpha.18 | ✅ Tamamlandı (`876b7ac`). |
| Admin login opt-in Firebase trial | v12.0.0-alpha.19 | ✅ Tamamlandı (`8b58ad6`). |
| Admin logout opt-in trial + docs sync | v12.0.0-beta.1 | ✅ Tamamlandı (`b0cb84b`). |
| Trial persistence + production devLogin guard scaffold | v12.0.0-beta.2 | ✅ Tamamlandı (`2711ce9`). |
| Trial status UX + production enforce checklist | v12.0.0-beta.3 | ✅ Tamamlandı (`e6b269b`). |
| Production auth enforcement readiness audit | v12.0.0-beta.4 | ✅ Tamamlandı (read-only audit; kod yok, commit yok). Karar B — kısmen hazır; canlı production smoke test öncesi enforce açılmaz. |
| Passive Firestore SDK readiness layer | v12.1.0-pre.1 | ✅ Mevcut faz. |

Önerilen sonraki sıra (her adım atomik commit):

| Adım | Hedef faz | Açıklama |
|---|---|---|
| Production devLogin guard enforce | v12.0.0-beta.5+ | §12.4 checklist'i ve beta.4 audit'inde listelenen operasyonel ön koşullar tamamlandıktan sonra `MV_ENFORCE_FIREBASE_AUTH` true'ya alınır. HTML touch yok; deploy zinciri tarafı. |
| Firestore rules foundation | v12.1.0 | Firestore Security Rules taslakları + emulator testleri + deploy gate. SDK zaten yüklü (pre.1); bu adım rules + ilk gerçek `firebase.firestore()` çağrılarına izin verir ama hâlâ write yok. |
| Read-only admin modules Firebase read | v12.2.0 | announcements / events / apps modülleri Firestore'dan read yapar (write hâlâ yok). |
| CRUD | v12.3.0+ | Modül başına create/update/delete; paired `adminLogs` write desenleri. |

Bu roadmap [`v12-readiness.md`](./v12-readiness.md) §7'deki commit
planının devamıdır; revert-friendly atomik adımlar olarak
yürütülür.

---

## Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v12.0.0-alpha.15 | 2026-05-23 | İlk Firebase local setup + Auth wrapper guide dokümanı. Phase log (alpha.6 → alpha.14), local config policy, activation paths, DevTools inspection, capability matrix, manuel signIn/signOut test zincirleri, troubleshooting, security notes ve next roadmap belgelendi. Runtime davranışı değişmedi. |
| v12.0.0-alpha.18 | 2026-05-23 | Auth wrapper katmanı `signIn` / `signOut` / `currentUser` / `onChange` dört yüzeyiyle ready behind guard durumuna geldikten sonra doküman tazelendi. Phase log alpha.15/16/17 satırlarıyla genişletildi; Current Scope alpha.17 state'ini yansıtır; DevTools ready tablosu `currentUser:'live-read'` + `onChange:'live-listener'` + bridge satırları ile güncellendi; Capability Matrix `live-read`/`live-listener` durumlarını gösterir; yeni §10 "Manual onChange Listener Example" eklendi; Troubleshooting tablosu `currentUser` / `onChange` / `unsubscribe` belirtileriyle genişletildi; Next Roadmap tamamlanan/önümüzdeki adımlar olarak iki tabloya bölündü; alpha.19 (admin login trial), alpha.20 (logout trial), alpha.21 (devLogin guard) sıraları güncellendi. Runtime davranışı değişmedi. |
| v12.0.0-beta.1 | 2026-05-23 | Admin auth trial bundle tamamlandı: dashboard logout opt-in trial (`admin/dashboard.html`) eklendi; alpha.19 login trial ile aynı flag/host pattern paylaşılır. Phase log alpha.18 + alpha.19 + beta.1 satırlarıyla genişletildi; başlık `alpha.6 → beta.1`. Current Scope login/logout trial bullet'larıyla güncellendi. Capability Matrix iki satır "opt-in trial available" + production devLogin guard "pending" satırı ile yenilendi. Yeni §11 "Admin Login/Logout Trial Walkthrough" eklendi (TOC: §11/§12/§13 → §12/§13/§14). Troubleshooting tablosu 4 yeni satırla genişletildi (trial flag debug, session payload, signOut failure). Next Roadmap beta.2 devLogin guard + Firestore foundation sırasına güncellendi. Runtime davranışı değişmedi; default flag-off path bit-identical kaldı. |
| v12.0.0-beta.2 | 2026-05-23 | Trial flag persistence + production devLogin guard scaffold ile doküman tazelendi. Belge sürümü v12.0.0-beta.1 → beta.2, hedef faz beta.3+. Phase log beta.1 hash'i `b0cb84b` olarak doğrulandı ve beta.2 satırı eklendi; başlık `alpha.6 → beta.2`. Current Scope `Trial flag persistence available` + `Production devLogin guard scaffold available` bullet'ları eklendi. Capability Matrix iki yeni satırla genişletildi (trial flag persistence available; production devLogin guard scaffold available, enforce pending). Yeni §12 "Trial Persistence and Production devLogin Guard" bölümü eklendi (§12.1 persistence rules + helpers + devtools doğrulama, §12.2 enforce koşulları + dönüş matrisi + helper garantileri, §12.3 beta.3 enforce eşik koşulları). Troubleshooting tablosu 4 yeni satırla genişletildi (persistence kayıp, `=0` çalışmadı, production enforce çalışmadı, dev hostta enforce etkisiz). Security Notes maddesi enforce flag policy'siyle güncellendi. Next Roadmap beta.3 enforce hedefiyle yenilendi. Runtime davranışı değişmedi; default flag-off path + default enforce-off path bit-identical kaldı. |
| v12.0.0-beta.3 | 2026-05-23 | Trial status UX + production enforce checklist ile doküman tazelendi. Belge sürümü beta.2 → beta.3, hedef faz beta.4+. Phase Log beta.2 hash'i `2711ce9` olarak doğrulandı ve beta.3 satırı eklendi; başlık `alpha.6 → beta.3`. Current Scope `Trial status UX available` bullet'ı eklendi. Capability Matrix'e "Trial status UX — available" satırı eklendi. §12 yeniden yapılandırıldı: yeni §12.3 "Operator Visibility (Trial Status UX)" (HTML element konumları, davranış garantileri, DevTools doğrulama) + §12.4 "Production Enforce Checklist" (7 adımlı sıralı doğrulama bloğu) + erken enforce risk notu. §11 walkthrough'a indicator referansı eklendi. Troubleshooting tablosu 3 yeni satırla genişletildi (indicator default modda görünüyor, indicator trial aktifken görünmüyor, indicator CSS ile gizleme). Next Roadmap beta.4 enforce hedefiyle yenilendi; beta.2 hash'i `2711ce9` olarak doğrulandı. Runtime auth davranışı değişmedi; yeni şey yalnız iki sayfaya inline-styled, default-hidden indicator + bir `updateFirebaseTrialIndicator()` helper. |
| v12.1.0-pre.1 | 2026-05-24 | Passive Firestore SDK readiness layer ile doküman tazelendi. Belge sürümü beta.3 → v12.1.0-pre.1, hedef faz v12.1.0+. Phase Log beta.3 hash'i `e6b269b` olarak doğrulandı + beta.4 (audit, kod yok) ve v12.1.0-pre.1 satırları eklendi; başlık `alpha.6 → v12.1.0-pre.1`. Current Scope `Firestore passive SDK readiness layer available` bullet'ı eklendi; "Firestore SDK / read / write / CRUD başlamadı" satırı v12.2/v12.3 sırasına göre revize edildi. Capability Matrix'e 4 yeni satır eklendi (Firestore SDK passive load, Firestore readiness helpers, Firestore read pending, Firestore write/CRUD pending). Yeni §13 "Firestore Passive SDK Readiness Layer" bölümü (§13.1 bu fazda yapılmayanlar, §13.2 SDK script yükleme + 6 admin sayfa listesi + script tag sırası, §13.3 readiness helper API tablosu, §13.4 DevTools doğrulama placeholder/ready ayrımı, §13.5 garantiler). TOC: §13 Troubleshooting → §14, §14 Security Notes → §15, §15 Next Roadmap → §16. §11 walkthrough Security Notes referansı `bkz. §14` → `bkz. §15`. Next Roadmap'e beta.5 enforce + v12.1.0 rules foundation sıraları eklendi. Runtime auth davranışı değişmedi; admin sayfalarında ek bir CDN script + `MV_FIREBASE` üzerinde 4 passive helper. Hiçbir Firestore read/write/CRUD/`firebase.firestore()` çağrısı yok. |
| v12.1.0-pre.2 | 2026-05-24 | Firebase admin authorization & rules contract fazı için doküman tazelendi. Belge sürümü v12.1.0-pre.1 → v12.1.0-pre.2; hedef faz v12.1.0+. Bağlantılı dokümanlar listesine [`firebase-admin-authorization.md`](./firebase-admin-authorization.md), [`firestore-data-model.md`](./firestore-data-model.md) ve [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) eklendi. Phase Log v12.1.0-pre.1 hash'i `d228823` olarak doğrulandı ve v12.1.0-pre.2 satırı eklendi; başlık `alpha.6 → v12.1.0-pre.2`. Security Notes (§15) "Admin authorization gap — enforce için kritik ön koşul" bullet'ı eklendi (`mv_admin_session` bridge rol/allowlist içermez; allowlist runtime'a bağlanmadan enforce true yapılmaz). Runtime auth davranışı **bit-identical** — `MV.auth.firebase.*`, `MV.auth.*`, `MV_FIREBASE.*`, trial flag persistence, indicator, production devLogin guard scaffold (default OFF) dokunulmadı. Yeni şey: `firestore.rules` foundation draft (default deny + `admins/{uid}` self-read + owner-managed write + content collection'lar kapalı + catch-all) ve iki yeni doc. Hiçbir runtime Firestore çağrısı yok; admin HTML / shared/js / shared/config dokunulmadı. |
