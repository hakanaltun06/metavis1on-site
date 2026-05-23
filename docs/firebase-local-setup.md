# Firebase Local Setup & Auth Wrapper Guide

> Bu doküman metavis1on **v12 Firebase Auth geçişinin local/staging
> doğrulama rehberidir.** Aktif kod değildir; admin Auth altyapısının
> güvenli geçişi için referans dokümandır.
>
> Belge sürümü: v12.0.0-alpha.15 · Hedef faz: v12.0.0-alpha.16+
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
3. [Phase Log: alpha.6 → alpha.14](#3-phase-log-alpha6--alpha14)
4. [Local Config File](#4-local-config-file)
5. [Activation Paths](#5-activation-paths)
6. [DevTools Inspection](#6-devtools-inspection)
7. [Capability Matrix](#7-capability-matrix)
8. [Manual Sign-in Test Chain](#8-manual-sign-in-test-chain)
9. [Manual Sign-out Test Chain](#9-manual-sign-out-test-chain)
10. [Troubleshooting](#10-troubleshooting)
11. [Security Notes](#11-security-notes)
12. [Next Roadmap](#12-next-roadmap)

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

v12.0.0-alpha.14 itibarıyla durum (alpha.15 dokümantasyon fazı kod
davranışını değiştirmez):

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
- **Session bridge** (`createSessionFromResult`) ve **logout bridge**
  (`clearSessionAfterSignOut`) **available** (alpha.13 + alpha.14).
  Caller bunları manuel çağırmak zorunda; `signIn` / `signOut`
  otomatik bridge çağırmaz.
- **Admin login formu** (`admin/index.html`) **henüz Firebase'e
  bağlanmadı**. Hâlâ `MV.auth.devLogin` / sessionStorage gate'ini
  kullanıyor.
- **Dashboard logout** (`admin/dashboard.html`) **henüz Firebase'e
  bağlanmadı**. Hâlâ `MV.auth.logout` üzerinden çalışıyor.
- **Firestore SDK / read / write / CRUD** başlamadı.
- **`onChange` (onAuthStateChanged)** ve **`currentUser`** hâlâ
  dry-run (ready iken bile gerçek SDK'yı çağırmaz).

---

## 3. Phase Log: alpha.6 → alpha.14

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

> Notlar:
> - alpha.6 / alpha.7 / alpha.8 hash'leri local git log'dan
>   doğrulandı.
> - alpha.9 → alpha.14 hash'leri faz brief'inde sabit verildi ve
>   git log ile uyumlu.
> - Tüm fazlar **runtime davranış değiştirmeden** ya katman ekledi
>   ya da var olan katmanın guard'ını derinleştirdi. Hiçbir HTML
>   form rewire'ı yapılmadı.

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
| `MV.auth.firebase.inspect().capabilities.onChange` | `'dry-run'` |
| `MV.auth.firebase.inspect().capabilities.currentUser` | `'dry-run'` |

Ready state'te bile `onChange` ve `currentUser` hâlâ dry-run;
gerçek `onAuthStateChanged` ve `auth.currentUser` okuması ileride
ayrı fazlarda açılır.

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
| `onChange()` | dry-run | Ready iken bile `onAuthStateChanged` çağrılmaz; callback tetiklenmez. |
| `currentUser()` | dry-run / null | Her durumda `null` döner; `auth.currentUser` okunmaz. |
| Admin login form Firebase mode | pending | `admin/index.html` hâlâ `MV.auth.devLogin` / sessionStorage. |
| Dashboard logout Firebase mode | pending | `admin/dashboard.html` hâlâ `MV.auth.logout`. |
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

## 10. Troubleshooting

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

---

## 11. Security Notes

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

## 12. Next Roadmap

Önerilen sıra (her adım kendi alpha sürümünde, atomik commit):

| Adım | Hedef faz | Açıklama |
|---|---|---|
| `currentUser` activation veya login trial karar noktası | v12.0.0-alpha.16 | `MV.auth.firebase.currentUser()` gerçek `auth.currentUser` okumasına geçer **veya** admin login form opt-in trial'ı başlatılır; ikisinden hangisinin önce geleceği bu fazda kararlaştırılır. |
| Admin login opt-in Firebase trial | v12.0.0-alpha.17 | `admin/index.html` form submit handler'ı `MV.auth.firebase.signIn` + `createSessionFromResult` zincirine **opt-in flag arkasında** bağlanır. Default davranış hâlâ devLogin. |
| Dashboard logout opt-in Firebase trial | v12.0.0-alpha.18 | `admin/dashboard.html` logout handler'ı `MV.auth.firebase.signOut` + `clearSessionAfterSignOut` zincirine **opt-in flag arkasında** bağlanır. |
| Production devLogin guard | v12.0.0-alpha.19 | `MV.auth.devLogin` format-only davranışı production host'ta kapatılır; emulator/staging flag'i altına alınır. |
| Firestore rules foundation | v12.1.0 | Firestore SDK admin sayfalarına eklenir, rules emulator testleri koşulur, deploy gate açılır. Hâlâ write yok. |
| Read-only admin modules Firebase read | v12.2.0 | announcements / events / apps modülleri Firestore'dan read yapar (write hâlâ yok). |
| CRUD | v12.3.0+ | Modül başına create/update/delete; paired `adminLogs` write desenleri. |

Bu roadmap [`v12-readiness.md`](./v12-readiness.md) §7'deki commit
planının alpha faz devamıdır; revert-friendly atomik adımlar olarak
yürütülür.

---

## Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v12.0.0-alpha.15 | 2026-05-23 | İlk Firebase local setup + Auth wrapper guide dokümanı. Phase log (alpha.6 → alpha.14), local config policy, activation paths, DevTools inspection, capability matrix, manuel signIn/signOut test zincirleri, troubleshooting, security notes ve next roadmap belgelendi. Runtime davranışı değişmedi. |
