# Firebase Local Setup & Auth Wrapper Guide

> Bu doküman metavis1on **v12 Firebase Auth geçişinin local/staging
> doğrulama rehberidir.** Aktif kod değildir; admin Auth altyapısının
> güvenli geçişi için referans dokümandır.
>
> Belge sürümü: v12.0.0-beta.1 · Hedef faz: v12.0.0-beta.2+
>
> Bağlantılı dokümanlar:
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) — Genel mimari ve faz roadmap'i.
> - [`v12-readiness.md`](./v12-readiness.md) — Auth foundation kapsam dokümanı.
> - [`firebase-project-setup.md`](./firebase-project-setup.md) — Firebase Console manuel kontrol listesi.
> - [`debt-panel-audit.md`](./debt-panel-audit.md) — Borç paneli izolasyon politikası.

---

## İçindekiler

1. [Purpose](#1-purpose)
2. [Current Scope](#2-current-scope)
3. [Phase Log: alpha.6 → beta.1](#3-phase-log-alpha6--beta1)
4. [Local Config File](#4-local-config-file)
5. [Activation Paths](#5-activation-paths)
6. [DevTools Inspection](#6-devtools-inspection)
7. [Capability Matrix](#7-capability-matrix)
8. [Manual Sign-in Test Chain](#8-manual-sign-in-test-chain)
9. [Manual Sign-out Test Chain](#9-manual-sign-out-test-chain)
10. [Manual onChange Listener Example](#10-manual-onchange-listener-example)
11. [Admin Login/Logout Trial Walkthrough](#11-admin-loginlogout-trial-walkthrough)
12. [Troubleshooting](#12-troubleshooting)
13. [Security Notes](#13-security-notes)
14. [Next Roadmap](#14-next-roadmap)

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

v12.0.0-beta.1 itibarıyla durum:

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
- **Firestore SDK / read / write / CRUD** başlamadı.

---

## 3. Phase Log: alpha.6 → beta.1

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
| v12.0.0-beta.1 | _bu commit_ | Opt-in Firebase admin logout trial on `admin/dashboard.html`; trial bundle tamamlandı, docs senkronize edildi. |

> Notlar:
> - alpha.6 / alpha.7 / alpha.8 hash'leri local git log'dan
>   doğrulandı.
> - alpha.9 → alpha.19 hash'leri faz brief'lerinde sabit verildi ve
>   git log ile uyumlu.
> - alpha.6 → alpha.18 fazları wrapper katmanını inşa etti; alpha.19
>   ve beta.1 admin HTML wiring'ini opt-in flag arkasında bağladı.
>   Default davranış her zaman bit-identical kalır — trial flag
>   olmadan devLogin/logout yolu eski sonuçları üretir.

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
| Production devLogin guard | pending | `MV.auth.devLogin` format-only davranışı production'da hâlâ açık; beta.2+ fazına bırakıldı. |
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

### Default davranış (flag yok)

- Login form: `MV.auth.devLogin` → 350ms→500ms zinciri → `dashboard.html`.
- Dashboard logout: `MV.auth.logout` → 700ms toast→redirect zinciri.
- Bit-identical alpha.19 / beta.1 öncesi davranış; sessionStorage
  payload'unda `provider:'dev-session'`.

### Güvenlik notları (bkz. §13)

- Firebase ready + credential/signOut failure durumunda **silent
  downgrade asla yapılmaz**.
- Trial flag URL üzerinden production host'ta aktif olmaz.
- Explicit global flag bilinçli override'dır; default'ta hiçbir
  yerde set edilmez.

---

## 12. Troubleshooting

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

---

## 13. Security Notes

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
- **Production devLogin kapatma ileride ayrı fazdır.** Şu an
  `MV.auth.devLogin` format-only davranışı production'da hâlâ
  açık; bu v12.0.0-alpha.19 civarında bir flag arkasına alınacak
  ([`v12-readiness.md`](./v12-readiness.md) §7).
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

## 14. Next Roadmap

Tamamlanan adımlar (referans):

| Adım | Faz | Durum |
|---|---|---|
| `currentUser` live read | v12.0.0-alpha.16 | ✅ Tamamlandı (`4243ceb`). |
| `onChange` live listener | v12.0.0-alpha.17 | ✅ Tamamlandı (`9d19299`). |
| Auth wrapper cleanup + docs refresh | v12.0.0-alpha.18 | ✅ Tamamlandı (`876b7ac`). |
| Admin login opt-in Firebase trial | v12.0.0-alpha.19 | ✅ Tamamlandı (`8b58ad6`). |
| Admin logout opt-in trial + docs sync | v12.0.0-beta.1 | ✅ Mevcut faz. |

Önerilen sonraki sıra (her adım atomik commit):

| Adım | Hedef faz | Açıklama |
|---|---|---|
| Production devLogin guard | v12.0.0-beta.2 | `MV.auth.devLogin` format-only davranışı production host'ta kapatılır; emulator/staging flag'i altına alınır. HTML touch yok; sadece `shared/js/auth.js`. |
| Firestore rules foundation | v12.1.0 | Firestore SDK admin sayfalarına eklenir, rules emulator testleri koşulur, deploy gate açılır. Hâlâ write yok. |
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
