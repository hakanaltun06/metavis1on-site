# Firebase Rules Test Plan

> Bu doküman, metavis1on projesinde Firebase / Firestore Security Rules
> üretim ortamına alınmadan önce uygulanacak test stratejisini açıklar.
> **Aktif rules dosyası bu doküman değildir;** v12.1.0-pre.2 itibarıyla
> repo köküne foundation draft olarak `firestore.rules` eklenmiştir
> ([`../firestore.rules`](../firestore.rules)), henüz deploy
> edilmemiştir. Bu doküman ise rol bazlı pozitif / negatif test
> senaryolarını ve deployment gate kurallarını içerir.
>
> Belge sürümü: v12.1.0-pre.5 · Hedef faz: v12.1.0 (Firestore Rules foundation deploy + emulator suite)
>
> Bağlantılı dokümanlar:
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) — Genel mimari, §7 Read/Write Matrix ve §8 Rules Taslak Mantığı.
> - [`firebase-admin-authorization.md`](./firebase-admin-authorization.md) — `admins/{uid}` allowlist sözleşmesi (v12.1.0-pre.2).
> - [`firestore-data-model.md`](./firestore-data-model.md) — Koleksiyon alan tabloları (v12.1.0-pre.2).
> - [`../firestore.rules`](../firestore.rules) — foundation draft (v12.1.0-pre.2; deploy edilmedi).
> - [`debt-panel-audit.md`](./debt-panel-audit.md) — Borç paneli mevcut yapı, gate analizi ve risk haritası.

---

## İçindekiler

1. [Scope](#1-scope)
2. [Test Edilecek Roller](#2-test-edilecek-roller)
3. [Test Edilecek Alanlar](#3-test-edilecek-alanlar)
4. [Read / Write Beklenti Matrisi](#4-read--write-beklenti-matrisi)
5. [Negative Test Cases](#5-negative-test-cases)
6. [Positive Test Cases](#6-positive-test-cases)
7. [Debt Panel Specific Tests](#7-debt-panel-specific-tests)
8. [Emulator Test Strategy](#8-emulator-test-strategy)
9. [Test Data Plan](#9-test-data-plan)
10. [Expected Test Report Template](#10-expected-test-report-template)
11. [Deployment Gate](#11-deployment-gate)
12. [Rollback Plan](#12-rollback-plan)
13. [Sürüm Notu](#13-sürüm-notu)

---

## 1. Scope

- Bu doküman **Firestore Security Rules test stratejisidir.**
- **Kural mantığı** için iki kaynak vardır:
  - [`firebase-transition-plan.md`](./firebase-transition-plan.md) §8 — orijinal mantık taslağı.
  - [`../firestore.rules`](../firestore.rules) — v12.1.0-pre.2'de eklenen **foundation draft** (deploy edilmedi; default deny + `admins/{uid}` self-read + owner-managed write + tüm content collection'ları kapalı).
- **Emulator kurulumu bu fazda yapılmaz.** Bu fazda yalnız test planı
  belgelenir; gerçek emulator + test suite v12.1.0'da kurulur.
- **Runtime kod değişikliği yoktur.** `index.html`, `admin/*.html`,
  `admin/borc/index.html`, `shared/js/*`, `shared/config/site.js` dahil
  hiçbir runtime dosyaya bu fazda dokunulmaz.
- **Firestore.rules eklendi, ama `firebase.json` / `.firebaserc` /
  `firestore.indexes.json` hâlâ yok.** Rules dosyası foundation draft
  olarak repo'da durur; hangi project'e deploy edileceği v12.1.0
  fazında karara bağlanır.
- Amaç, **v12.1.0 Firestore Rules foundation** fazına geçmeden önce
  pozitif / negatif test senaryolarını, test data taslağını ve
  deployment gate kurallarını yazılı hale getirmektir.

### 1.1 Foundation draft test kapsamı (v12.1.0-pre.2)

`firestore.rules` foundation draft'ı çok dar bir yüzey açar; aşağıdaki
testler bu draft'ın **deploy edilmeden önce** kavramsal olarak
geçerli olduğunu gösterir. Emulator ile gerçek koşturma v12.1.0
fazında yapılacaktır.

| Test ID | Rol | Aksiyon | Hedef | Beklenen | Notu |
|---|---|---|---|---|---|
| F-01 | anonymous | get | `admins/{anyUid}` | deny | İmzasız read kapalı. |
| F-02 | authenticated non-admin | get | `admins/{ownUid}` | allow | Self-read açık (doc yoksa rules deny etmez ama yokluk read sonucudur). |
| F-03 | authenticated non-admin | get | `admins/{otherUid}` | deny | Sadece owner başkasının doc'unu görür. |
| F-04 | active admin (non-owner) | get | `admins/{ownUid}` | allow | Self-read aktif. |
| F-05 | active admin (non-owner) | get | `admins/{otherUid}` | deny | `isOwner()` false; başkasını göremez. |
| F-06 | owner | list | `admins/*` | allow | List op'u sadece owner için. |
| F-07 | owner | create | `admins/{newUid}` | allow | Yeni allowlist üyesi sadece owner ekler. |
| F-08 | active admin (non-owner) | create | `admins/{anyUid}` | deny | Admin allowlist'i değiştiremez. |
| F-09 | disabled admin | get | `admins/{ownUid}` | allow | Self-read açık; ama isActiveAdmin gate hiçbir privileged path'te geçmez. |
| F-10 | any role | read/write | `announcements`/`events`/`apps`/`adminLogs`/`publicConfig`/`systemStatus` | deny | Bu fazda content collection'ları topyekün kapalı. |
| F-11 | any role | read/write | `/{anyUnknownCollection}/{id}` | deny | Catch-all `match /{document=**}` ile yakalanır. |
| F-12 | wildcard probe | write | herhangi bir path | deny | Negatif sızıntı testi. |

F-01 → F-12 testleri ileride §5–§6 ana test setine entegre edilir;
şu anda foundation draft'ı evaluate etmek için ayrı bir bölüm
olarak listelenir.

### 1.2 `probeAdminAccess()` runtime probe test kapsamı (v12.1.0-pre.3)

`MV.auth.firebase.probeAdminAccess()` runtime tarafında `admins/{uid}`
self-read için ilk manuel yüzeydir (bkz.
[`firebase-admin-authorization.md`](./firebase-admin-authorization.md) §9).
Aşağıdaki testler **probe'un kendi davranışını** (readiness zinciri,
doc evaluation, sanitization) doğrular. Rules tarafı henüz deploy
edilmediği için bu testler iki kanalda koşulabilir:

- **DevTools manual** — gerçek `firebase.local.js` ready iken devtools
  console üzerinden `await MV.auth.firebase.probeAdminAccess()` ile.
- **Emulator (v12.1.0)** — emulator suite kurulduktan sonra otomatik.

| Test ID | Önkoşul | Beklenen probe dönüşü |
|---|---|---|
| R-01 | `MV_FIREBASE.isAuthReady()` false (placeholder config) | `{ enabled:false, ok:false, reason:'auth-not-ready' }` |
| R-02 | Auth ready, Firestore SDK yok (hipotetik) | `{ enabled:false, ok:false, reason:'firestore-not-ready' }` |
| R-03 | Auth + Firestore ready, signed-out (no currentUser) | `{ enabled:true, ok:false, reason:'no-current-user' }` |
| R-04 | Auth + Firestore ready, signed-in, `admins/{uid}` doc yok | `{ enabled:true, ok:true, allowed:false, reason:'admin-doc-missing' }` |
| R-05 | Doc var, `active: false`, role: `'admin'` | `{ allowed:false, reason:'inactive-admin' }` |
| R-06 | Doc var, `active: true`, role: `'superuser'` (set dışı) | `{ allowed:false, reason:'invalid-role' }` |
| R-07 | Doc var, `active: true`, role: `'viewer'` | `{ allowed:true, role:'viewer' }` |
| R-08 | Doc var, `active: true`, role: `'editor'` | `{ allowed:true, role:'editor' }` |
| R-09 | Doc var, `active: true`, role: `'admin'` | `{ allowed:true, role:'admin' }` |
| R-10 | Doc var, `active: true`, role: `'owner'` | `{ allowed:true, role:'owner' }` |
| R-11 | Auth + Firestore ready, signed-in, rules deny (örn. wrong UID hedef gibi hipotetik bypass) | `{ enabled:true, ok:false, allowed:false, reason:'permission-denied' }` |
| R-12 | Doc'ta `notes`, `createdAt`, `updatedAt`, `metadata` alanları mevcut | Dönüş objesinde **hiçbiri** yok — yalnız `uid`/`email`/`role`/`active`/`provider`/`source` (+`enabled`/`ok`/`allowed`/`reason`/`message`). |
| R-13 | Doc'ta `active: false` **ve** role `'superuser'` (set dışı) | `reason:'inactive-admin'` (active önce evaluate edilir; role değerlendirilmez). |
| R-14 | Page load + 1 dakika idle (probe çağrılmadı) | Firestore'a 0 istek; `admins/*` koleksiyonuna 0 read. |
| R-15 | `inspect()` çağrısı | `capabilities.adminAccessProbe` döner; **Firestore read yapmaz**. |

R-12 ve R-14 **kritik**: ilki sanitization sızıntısını yakalar, ikincisi
auto-wiring sızıntısını yakalar. Her ikisi de PR review checklist'inde
ayrıca kontrol edilir.

### 1.3 `admin/index.html` opt-in allowlist gate senaryoları (v12.1.0-pre.4)

pre.4 Firebase login trial akışına opt-in bir allowlist gate ekledi
(bkz. [`firebase-admin-authorization.md`](./firebase-admin-authorization.md) §9.8).
Aşağıdaki testler **end-to-end login akışını** kapsar: form submit →
signIn → (gate ON ise) probe → bridge veya deny. Default flag-off
davranışı bit-identical alpha.19+ olarak kalmalıdır.

| Test ID | Durum (flags) | Önkoşul | Beklenen |
|---|---|---|---|
| G-01 | gate OFF, firebase trial OFF | — | submit → devLogin → mv_admin_session yazılır (provider:'dev-session'); dashboard redirect. **Allowlist read 0.** |
| G-02 | gate OFF, firebase trial ON | Firebase ready | submit → signIn → bridge → dashboard. **Allowlist read 0.** Bit-identical alpha.19. |
| G-03 | gate ON, firebase trial OFF | — | devLogin path — gate flag etkisiz (sadece runFirebaseLogin'de okunur). G-01 ile aynı dönüş. Indicator görünür ama gate ateşlenmez. |
| G-04 | gate ON, firebase trial ON, Firebase not ready | placeholder config | signIn → `enabled:false` → devLogin fallback (mevcut davranış). **Allowlist read 0.** Gate ateşlenmez. |
| G-05 | gate ON, signIn ok:false (wrong-password) | Firebase ready | "E-posta veya şifre hatalı." Allowlist gate ateşlenmez (signIn dalı yetersiz). **Allowlist read 0.** |
| G-06 | gate ON, signIn ok:true, `admins/{uid}` doc yok | Firebase ready, signed-in user yeni | probe → `admin-doc-missing` → "Bu Firebase kullanıcısı admin allowlist içinde değil." **mv_admin_session yazılmaz, redirect yok.** best-effort signOut cleanup denenir. |
| G-07 | gate ON, signIn ok:true, `active:false` | Firebase ready | probe → `inactive-admin` → "Bu admin hesabı devre dışı bırakılmış." **mv_admin_session yazılmaz, redirect yok.** |
| G-08 | gate ON, signIn ok:true, role:'superuser' (set dışı) | Firebase ready | probe → `invalid-role` → "Bu admin hesabının rol bilgisi geçersiz." **mv_admin_session yazılmaz, redirect yok.** |
| G-09 | gate ON, signIn ok:true, rules `admins/{uid}` deny | Firebase ready, rules deploy edilmiş | probe → `permission-denied` veya `firestore-error` → "Admin yetki kontrolü için izin alınamadı." **mv_admin_session yazılmaz, redirect yok.** |
| G-10 | gate ON, signIn ok:true, role:'viewer', active:true | Firebase ready | probe → `allowed:true` → bridge → dashboard redirect. mv_admin_session payload bit-identical (role alanı YOK). |
| G-11 | gate ON, signIn ok:true, role:'editor', active:true | Firebase ready | G-10 ile aynı pattern (`allowed:true`). |
| G-12 | gate ON, signIn ok:true, role:'admin', active:true | Firebase ready | G-10 ile aynı pattern. |
| G-13 | gate ON, signIn ok:true, role:'owner', active:true | Firebase ready | G-10 ile aynı pattern. |
| G-14 | gate ON, `probeAdminAccess` helper missing (hipotetik) | yapay olarak `MV.auth.firebase.probeAdminAccess = undefined` | "Admin yetki kontrolü için altyapı eksik." **Fail closed; bridge çağrılmaz.** |
| G-15 | dev host, `?mvAdminAllowlistGate=1` → reload, sonra `?mvAdminAllowlistGate=0` | — | sessionStorage `mv_admin_allowlist_gate_trial` önce `'1'`, sonra silinir. Indicator önce visible, sonra hidden. |
| G-16 | production host, `?mvAdminAllowlistGate=1` | — | sessionStorage'a **yazılmaz**; `window.MV_ADMIN_ALLOWLIST_GATE` set edilmedikçe gate kapalı. Indicator hidden. |
| G-17 | gate ON, dashboard navigation sonrası geri dön | — | sessionStorage persistence sayesinde gate aktif kalır; bir sonraki login submit'inde tekrar tetiklenir. |

**Kritik kontroller:**

- G-01 / G-02 → flag-off davranış bit-identical.
- G-06 / G-07 / G-08 / G-09 / G-14 → deny path'lerinin tümü
  `mv_admin_session` yazmadığını ve redirect yapmadığını doğrular.
- G-10 → G-13 → tüm geçerli rollerin gate'i geçtiğini doğrular.
- G-16 → production host'ta stray URL'in gate'i tetikleyemediğini
  doğrular.

### 1.4 `admin/dashboard.html` opt-in re-verify senaryoları (v12.1.0-pre.5)

pre.5 aynı `mvAdminAllowlistGate` flag arkasında dashboard load
sonrasında ikinci bir allowlist doğrulaması ekledi (bkz.
[`firebase-admin-authorization.md`](./firebase-admin-authorization.md) §9.9).
Aşağıdaki testler **dashboard yaşam döngüsünü** kapsar: requireAdmin
geçer → re-verify → (deny ise) logout + redirect. Default flag-off
davranışı bit-identical beta.3 olarak kalmalıdır.

| Test ID | Durum (flags) | Önkoşul | Beklenen |
|---|---|---|---|
| H-01 | gate OFF | session var (dev veya firebase) | Dashboard normal render. `runDashboardAllowlistReverify` no-op döner; `probeAdminAccess` çağrılmaz. **Allowlist read 0.** |
| H-02 | gate OFF, session yok | — | requireAdmin → login redirect (bit-identical). Re-verify hiç çalışmaz. |
| H-03 | gate ON, session yok | — | requireAdmin → login redirect (bit-identical). Re-verify hiç çalışmaz (return önce). **Allowlist read 0.** |
| H-04 | gate ON, dev-session (provider:'dev-session'), Firebase ready | devLogin sonucu session | probe → `no-current-user` → toast "Firebase oturumu doğrulanamadı." → `MV.auth.logout` + redirect. **mv_admin_session silinir.** |
| H-05 | gate ON, dev-session, Firebase not ready | devLogin sonucu session + placeholder config | probe → `auth-not-ready` veya `firestore-not-ready` → toast "Admin yetki kontrolü şu anda hazır değil." → logout + redirect. |
| H-06 | gate ON, firebase session, allowlist `allowed:true`, role:'viewer' | Firebase ready + admins doc | probe → `allowed:true` → no-op; dashboard'da kal. mv_admin_session korunur. |
| H-07 | gate ON, firebase session, role:'editor' | aynı | H-06 ile aynı (`allowed:true`). |
| H-08 | gate ON, firebase session, role:'admin' | aynı | H-06 ile aynı. |
| H-09 | gate ON, firebase session, role:'owner' | aynı | H-06 ile aynı. |
| H-10 | gate ON, firebase session, `admins/{uid}` doc silinmiş (operator removed) | aynı | probe → `admin-doc-missing` → toast "Bu hesap artık admin allowlist içinde değil." → logout + redirect. |
| H-11 | gate ON, firebase session, `active:false` | aynı | probe → `inactive-admin` → toast "Bu admin hesabı devre dışı bırakılmış." → logout + redirect. |
| H-12 | gate ON, firebase session, `role:'superuser'` (set dışı) | aynı | probe → `invalid-role` → toast "Bu admin hesabının rol bilgisi geçersiz." → logout + redirect. |
| H-13 | gate ON, firebase session, rules deny | rules deploy + UID hedef yetkisiz | probe → `permission-denied` → toast "Admin yetki kontrolü için izin alınamadı." → logout + redirect. |
| H-14 | gate ON, helper missing (hipotetik) | `MV.auth.firebase.probeAdminAccess = undefined` zorla | toast "Admin yetki kontrolü için altyapı eksik." → logout + redirect. **Fail closed; probe çağrılmaz.** |
| H-15 | gate ON, dashboard logout butonuna basıldı | beta.1 trial zinciri aktif veya değil | Mevcut logout davranışı bit-identical; re-verify zincirden bağımsız çalışıyor. Logout sonrası redirect zaten login'e. |
| H-16 | gate ON, requireAdmin geçmedi (session expired) | TTL geçmiş | requireAdmin → login redirect (önce). Re-verify hiç çalışmaz. |
| H-17 | dev host, `?mvAdminAllowlistGate=1` → reload, sonra `?mvAdminAllowlistGate=0` | — | sessionStorage `mv_admin_allowlist_gate_trial` önce `'1'`, sonra silinir. Indicator önce visible sonra hidden. Reverify ikinci ziyarette çalışmaz. |
| H-18 | production host, `?mvAdminAllowlistGate=1` | — | sessionStorage'a **yazılmaz**; `window.MV_ADMIN_ALLOWLIST_GATE` set edilmedikçe gate kapalı. Indicator hidden. Re-verify çalışmaz. **Allowlist read 0.** |
| H-19 | gate ON, sayfa açık 1 dakika idle (probe geçmiş `allowed:true`) | Firebase ready | Page-open ömrü boyunca ek probe yok. **Re-verify yalnız load anında çalışır** (onChange watchdog hâlâ pending). |
| H-20 | gate ON, dashboard load → operatör başka admin sayfasına navigate eder | aynı | Diğer admin sayfaları pre.5'te dokunulmadı; orada re-verify yok. Dashboard'a dönüldüğünde tekrar load → re-verify yine çalışır. |

**Kritik kontroller:**

- H-01 → flag-off bit-identical dashboard davranışı, Firestore'a 0
  istek.
- H-03 / H-16 → requireAdmin önce çalışır; session yokken re-verify
  hiç tetiklenmez.
- H-10 → H-13 / H-14 → tüm fail-closed yolları logout + redirect
  ürettiğini doğrular.
- H-06 → H-09 → tüm geçerli rollerin re-verify'ı geçtiğini doğrular.
- H-15 → logout click handler dokunulmadığını doğrular (beta.1 trial
  zinciri ile re-verify zinciri bağımsız çalışır).
- H-18 → production host'ta stray URL'in gate'i tetikleyemediğini
  doğrular.
- H-19 → bu fazda watchdog yok; canlı düşüşler yalnız sonraki load'da
  yakalanır (limit açıkça dokümante edildi).

---

## 2. Test Edilecek Roller

Her test, aşağıdaki roller için tekrar edilir. Roller
[`firebase-transition-plan.md`](./firebase-transition-plan.md) §4.3
ile tutarlıdır.

| Rol | Açıklama |
|---|---|
| **anonymous** | Hiç login olmamış kullanıcı. `request.auth == null`. Public ziyaretçi temsilcisi. |
| **authenticated non-admin** | Firebase Auth ile login olmuş ama `admins/{uid}` koleksiyonunda kaydı olmayan kullanıcı. "Sızmış login" senaryosu — auth var, yetki yok. |
| **viewer** | `admins/{uid}` koleksiyonunda `role: 'viewer'` ve `active: true`. Yalnız okuma yetkisi olan yardımcı admin. |
| **admin** | `admins/{uid}` koleksiyonunda `role: 'admin'` ve `active: true`. İçerik + adminLogs üzerinde tam CRUD; `admins`'i değiştiremez. |
| **owner** | `admins/{uid}` koleksiyonunda `role: 'owner'` ve `active: true`. `admins` koleksiyonu dahil her şey üzerinde tam yetki. |

> **Edge rol:** `disabled admin` = `admins/{uid}` mevcut ama
> `active: false`. Bu kullanıcı login olabilir ama hiçbir write
> yetkisi olmamalı; ayrı negatif senaryolarla test edilir.

---

## 3. Test Edilecek Alanlar

Firestore top-level alanları
([`firebase-transition-plan.md`](./firebase-transition-plan.md) §5
ile tutarlı):

- `publicConfig/site`
- `announcements`
- `events`
- `apps`
- `adminLogs`
- `admins`
- `systemStatus`
- **Borç paneli verisi** (debt panel data) — özel kapsam

### 3.1 Borç paneli notu

- Borç paneli path'i (mevcut: `debts`, `sysLogs`;
  bkz. [`debt-panel-audit.md`](./debt-panel-audit.md) §5.1) **kesinleşmeden
  production rules yazılmayacak.**
- Bu doküman içinde "debt panel data" terimi kullanılır; gerçek collection
  ismi audit dokümanına göre v12.6.0'da doğrulanır.
- Bu fazda gerçek borç verisi test dosyasına kopyalanmaz; yalnız
  placeholder schema kullanılır.

---

## 4. Read / Write Beklenti Matrisi

İşaretler: ✅ = izinli (allow), ❌ = reddedilmeli (deny).

| Area | Anonymous Read | Non-admin Read | Viewer Read | Admin Read | Owner Read | Admin Write | Owner Write |
|---|---:|---:|---:|---:|---:|---:|---:|
| Published announcements | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Draft announcements | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Published events | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Draft events | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Public apps | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin-only apps | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `publicConfig/site` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `systemStatus` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `adminLogs` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ (create-only) | ✅ (create-only) |
| `admins` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Debt panel data | ❌ | ❌ | ❌ | ✅ (yetkili) | ✅ | ✅ (yetkili + audit) | ✅ (audit) |

### 4.1 Beklenen mantık

- **Published public içerik** (announcements / events / apps public) herkes
  tarafından okunabilir.
- **Draft içerik** public okunamaz; yalnız viewer + üstü erişebilir.
- **Admin-only apps** public okunamaz.
- **`adminLogs`** public okunamaz; admin write **create-only**
  (mevcut log düzenlenemez, silinemez).
- **`admins`** sadece owner tarafından yönetilebilir; admin bile okuyamaz.
- **Debt panel data** sadece yetkili admin/owner tarafından erişilebilir
  olmalıdır.
- **Yazma**, anonymous veya non-admin için **asla** açık olmamalı.

---

## 5. Negative Test Cases

> Negatif testler, pozitif testlerden daha kritiktir. Yanlış bir `allow`
> kuralı, yanlış bir `deny` kuralından çok daha tehlikelidir.

| Test ID | Rol | Aksiyon | Hedef | Beklenen |
|---|---|---|---|---|
| N-01 | anonymous | create | `announcements/{new}` | deny |
| N-02 | anonymous | update | `announcements/{id}` | deny |
| N-03 | anonymous | delete | `announcements/{id}` | deny |
| N-04 | authenticated non-admin | update | `events/{id}` | deny |
| N-05 | authenticated non-admin | create | `events/{new}` | deny |
| N-06 | viewer | create | `announcements/{new}` | deny |
| N-07 | viewer | update | `apps/{id}` | deny |
| N-08 | viewer | delete | `events/{id}` | deny |
| N-09 | admin | write | `admins/{uid}` | deny (owner-only) |
| N-10 | admin | update | `admins/{uid}` | deny |
| N-11 | admin | delete | `admins/{uid}` | deny |
| N-12 | anonymous | read | `adminLogs/{id}` | deny |
| N-13 | authenticated non-admin | read | `adminLogs/{id}` | deny |
| N-14 | anonymous | read | `announcements/{draftId}` | deny (isPublished == false) |
| N-15 | anonymous | read | `events/{draftId}` | deny |
| N-16 | anonymous | read | `apps/{adminOnlyId}` | deny |
| N-17 | anonymous | read | debt panel data | deny |
| N-18 | authenticated non-admin | read | debt panel data | deny |
| N-19 | viewer | write | debt panel data | deny |
| N-20 | admin | update | `adminLogs/{id}` (mevcut log) | deny (create-only) |
| N-21 | admin | delete | `adminLogs/{id}` | deny |
| N-22 | disabled admin | write | herhangi bir koleksiyon | deny (active == false) |
| N-23 | disabled admin | read | `adminLogs/{id}` | deny |
| N-24 | wildcard probe | write | `/{anyPath=**}` | deny (yanlış collection wildcard üzerinden public write açılmadığı doğrulanmalı) |
| N-25 | anonymous | write | `publicConfig/site` | deny |
| N-26 | anonymous | write | `systemStatus/{key}` | deny |

**Kritik kontrol:** N-24, rules'da hatayla bırakılmış bir
`match /{document=**}` veya çok geniş bir `match` bloğu varsa onu
yakalamak içindir. Production'a alınmadan mutlaka geçilmelidir.

---

## 6. Positive Test Cases

| Test ID | Rol | Aksiyon | Hedef | Beklenen |
|---|---|---|---|---|
| P-01 | anonymous | read | `announcements/{publishedId}` | allow |
| P-02 | anonymous | read | `events/{publishedId}` | allow |
| P-03 | anonymous | read | `apps/{publicId}` | allow |
| P-04 | anonymous | read | `publicConfig/site` | allow |
| P-05 | anonymous | read | `systemStatus/main` | allow (maintenance banner için) |
| P-06 | viewer | read | `announcements/{draftId}` | allow |
| P-07 | viewer | read | `events/{draftId}` | allow |
| P-08 | viewer | read | `apps/{adminOnlyId}` | allow |
| P-09 | viewer | read | `adminLogs/{id}` | allow |
| P-10 | viewer | write | herhangi bir koleksiyon | deny (write yetkisi yok — pozitif setin "read başarılı + write reddedildi" çift kontrolü) |
| P-11 | admin | create | `announcements/{new}` | allow |
| P-12 | admin | update | `announcements/{id}` | allow |
| P-13 | admin | create | `events/{new}` | allow |
| P-14 | admin | update | `events/{id}` | allow |
| P-15 | admin | update | `apps/{id}` | allow |
| P-16 | admin | create | `adminLogs/{new}` (paired write) | allow |
| P-17 | owner | create | `admins/{uid}` | allow |
| P-18 | owner | update | `admins/{uid}` | allow |
| P-19 | owner | delete | `admins/{uid}` | allow (veya soft-delete `active: false`) |
| P-20 | owner | write | `publicConfig/site` | allow |
| P-21 | owner | write | `systemStatus/main` | allow |

**Paired write notu:** P-16 (admin write + adminLogs create) test
edilirken, adminLogs yazımı **olmadan** asıl write'ın izin alıp
almadığı ayrıca kontrol edilmelidir. v12.3.0 sonrası "her write
adminLogs paired" deseni rules düzeyinde zorlanırsa, eksik paired
write reddedilmelidir (negatif senaryo olarak da kaydedilir).

---

## 7. Debt Panel Specific Tests

> Borç paneli, projedeki en hassas modüldür. Tüm test setlerinin
> üzerine **ek bir özen katmanı** ile test edilir.
> Bkz. [`debt-panel-audit.md`](./debt-panel-audit.md) ve
> [`firebase-transition-plan.md`](./firebase-transition-plan.md) §12.

### 7.1 Politika hatırlatmaları

- Debt panel data **hassas finansal veri** kabul edilir.
- **Public read kesinlikle olmamalı.**
- **Non-admin read/write kesinlikle olmamalı.**
- **Admin/owner erişimi bile audit log ile izlenmeli.**
- Mevcut collection isimleri ([`debt-panel-audit.md`](./debt-panel-audit.md)
  §5.1: `debts`, `sysLogs`) audit dokümanına göre doğrulanır; bu test
  planı içinde rename varsayımı yapılmaz.
- **Collection / localStorage key değişikliği test planına dahil değildir;
  ayrı migration plan gerekir** (`docs/debt-panel-migration.md` —
  henüz yazılmadı).
- **Export / backup testi migration öncesi zorunludur.** Rules
  değişikliği büyük olmasa bile, veri kaybı riskini sıfıra indirmek için
  rollout öncesi snapshot alınır.

### 7.2 Test senaryoları

| Test ID | Rol | Aksiyon | Hedef | Beklenen |
|---|---|---|---|---|
| D-01 | anonymous | read | debt panel data | deny |
| D-02 | anonymous | write | debt panel data | deny |
| D-03 | authenticated non-admin | read | debt panel data | deny |
| D-04 | authenticated non-admin | write | debt panel data | deny |
| D-05 | viewer | read | debt panel data | duruma göre — politika kararı gerektirir (default: deny; viewer borç verisine erişmeyebilir) |
| D-06 | viewer | write | debt panel data | deny |
| D-07 | admin | read | debt panel data | allow |
| D-08 | admin | write | debt panel data | allow **only if** audit logging stratejisi hazırsa (paired sysLogs write) |
| D-09 | owner | read | debt panel data | allow + audit |
| D-10 | owner | write | debt panel data | allow + audit |
| D-11 | wildcard probe | read | debt panel data via `/{anyPath=**}` | deny |
| D-12 | public content rules — debt path'i etkilememeli (regression test) | — | — | rules diff borç path'ine sızıntı yapmadığı doğrulanır |
| D-13 | disabled admin | read | debt panel data | deny |
| D-14 | disabled admin | write | debt panel data | deny |

> D-05'in default kararı **deny** olarak işaretlenmiştir. Eğer
> v12.6.0'da viewer için borç paneli read-only erişim gerekirse,
> bu karar ayrı bir RFC ile değiştirilir.

---

## 8. Emulator Test Strategy

> Bu fazda emulator kurulmayacak. Aşağıdaki strateji, v12.1.0'da
> emulator + test suite kurulurken referans alınır.

- **Firebase Emulator Suite** kullanılacak (Firestore + Auth emulator).
- **Test data seed dosyası** hazırlanacak; her test öncesi emulator
  reset edilip seed yüklenecek (deterministic test ortamı).
- Her rol için **mock auth context** oluşturulacak (anonymous, viewer,
  admin, owner, disabled admin). `signInWithCustomToken` veya emulator
  REST seed üzerinden uid + role enjekte edilir.
- **Rules unit testleri** `@firebase/rules-unit-testing` (veya muadili)
  ile yazılacak.
- **Negatif testler pozitif testlerden daha kritik** kabul edilecek;
  PR review checklist'inde negatif testlerin sayısı azaldıysa flag.
- **CI/CD'ye ileride eklenebilir** — bu fazda zorunlu değil.
- Emulator çıktıları (rules coverage, denied calls log) test raporuna
  iliştirilecek.

---

## 9. Test Data Plan

> Gerçek borç verisi, gerçek email, gerçek uid veya gerçek admin kaydı
> test data setine **kopyalanmaz.** Yalnız placeholder schema kullanılır.

### 9.1 Placeholder kullanıcılar

| Tip | Mock uid | Mock email | Rol | active |
|---|---|---|---|---|
| viewer user | `uid_viewer_001` | `viewer@example.test` | `viewer` | `true` |
| admin user | `uid_admin_001` | `admin@example.test` | `admin` | `true` |
| owner user | `uid_owner_001` | `owner@example.test` | `owner` | `true` |
| disabled admin | `uid_disabled_001` | `disabled@example.test` | `admin` | `false` |
| non-admin | `uid_random_001` | `random@example.test` | — (admins'te yok) | — |

### 9.2 Placeholder içerik

| Doc | Koleksiyon | Önemli alanlar |
|---|---|---|
| published announcement | `announcements/ann_pub_001` | `isPublished: true`, `status: 'published'` |
| draft announcement | `announcements/ann_draft_001` | `isPublished: false`, `status: 'draft'` |
| published event | `events/evt_pub_001` | `isPublished: true` |
| draft event | `events/evt_draft_001` | `isPublished: false` |
| public app | `apps/app_public_001` | `visibility: 'public'` |
| admin-only app | `apps/app_admin_001` | `visibility: 'admin'` |
| system status | `systemStatus/main` | `portalStatus: 'active'`, `maintenanceMode: false` |
| public config | `publicConfig/site` | placeholder ayarlar |

### 9.3 Borç paneli placeholder schema

```
debt panel placeholder (gerçek veri DEĞİL):
{
  id: "debt_placeholder_001",
  amount: 0,
  currency: "TRY",
  createdAt: <serverTimestamp>,
  ownerUid: "uid_placeholder",
  note: "TEST PLACEHOLDER — DO NOT USE REAL DATA"
}
```

Bu schema yalnız rules erişim testleri içindir; iş mantığı testi değildir.

---

## 10. Expected Test Report Template

Her test çalıştırması sonrası aşağıdaki tablo doldurulup
`docs/firebase-rules-test-results-<tarih>.md` benzeri bir dosyaya
kaydedilir (bu doküman içine inline yazılmaz; rapor ayrı tutulur).

| Test ID | Role | Action | Target | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| N-01 | anonymous | create | `announcements/{new}` | deny | — | — |
| P-01 | anonymous | read | `announcements/{publishedId}` | allow | — | — |
| D-01 | anonymous | read | debt panel data | deny | — | — |
| … | … | … | … | … | … | … |

**Result değerleri:**

- **PASS** — Expected == Actual.
- **FAIL** — Expected != Actual. **Deployment blocker.**
- **BLOCKED** — Test koşulamadı (örn. seed başarısız, emulator down).
  Sebep raporda not edilir.

---

## 11. Deployment Gate

> Firestore Rules production'a alınmadan önce aşağıdaki maddelerin
> **tümü** doğrulanmalıdır. Eksik tek bir madde varsa deploy bloklanır.

- [ ] **Tüm negatif testler PASS** olmalı.
- [ ] **Tüm public write denemeleri (N-01 … N-26 arasındaki write satırları)
      reddedilmiş** olmalı.
- [ ] Admin olmayan kullanıcıların `adminLogs`, `admins` ve borç verilerine
      **erişemediği** doğrulanmalı (N-09, N-12, N-13, N-17, N-18, D-01,
      D-03, D-11).
- [ ] **Owner-only admin management** testleri geçmeli (P-17, P-18, P-19
      allow; N-09, N-10, N-11 deny).
- [ ] **Rollback planı hazır** olmalı (bkz. §12).
- [ ] **Rules diff review** yapılmış olmalı — en az 1 ek reviewer
      onayı.
- [ ] Borç paneli rules değişikliği varsa **ayrı deploy** olarak
      sahnelenmeli (genel rules deploy'una karıştırılmaz).
- [ ] Test raporu commit'lenmiş olmalı; "PASS" yazılı bir kanıt olmadan
      production'a çıkılmaz.

---

## 12. Rollback Plan

- **Önceki rules sürümü saklanacak.** Firebase Console rules history
  otomatik tutar; ek olarak repo içinde `firestore.rules` git history
  üzerinden takip edilir.
- **Deploy sonrası smoke test** yapılacak: en az P-01, P-11, N-01,
  N-12, D-01 testleri canlı project üzerinde (read-only sample doc'larla)
  doğrulanır.
- **Kritik hata varsa eski rules'a geri dönülür.** `firebase deploy --only
  firestore:rules` ile önceki commit'teki rules dosyası yeniden deploy
  edilir.
- **Veri migration yapılmadıysa rollback kolaydır.** v12.1.0 fazı yalnız
  rules deploy eder; veri taşımaz. Bu nedenle rollback risksizdir.
- **Borç paneli rules değişiklikleri ayrı deploy edilmeli** ve ayrı
  rollback prosedürüne sahip olmalı. Borç paneli rules rollback'i sırasında
  iç katman (Firebase Auth modal) zaten ek koruma olarak çalışmaya devam
  eder, ancak ayrı doğrulama yine de yapılır.
- Rollback sonrası post-mortem dokümanı (`docs/incidents/<tarih>.md`)
  yazılır; bu test planı güncellenir.

---

## 13. Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v11.5.3 | 2026-05-23 | İlk test plan taslağı. Aktif rules yok; emulator yok. Rol matrisi, pozitif/negatif senaryolar, borç paneli özel testleri, deployment gate ve rollback planı belgelendi. |
| v12.1.0-pre.2 | 2026-05-24 | `firestore.rules` foundation draft'ı eklendi; bu doküman foundation draft'a referansla güncellendi. §1 Scope'ta foundation draft'ın varlığı + sınırı (deploy edilmedi) belgelendi. Yeni §1.1 "Foundation draft test kapsamı" eklendi — F-01 … F-12 testleriyle default deny + `admins/{uid}` self-read + owner-managed write + content collection'ların topyekün kapalılığı + catch-all sızıntı kontrolleri tanımlandı. Bağlantılı dokümanlar listesine [`firebase-admin-authorization.md`](./firebase-admin-authorization.md), [`firestore-data-model.md`](./firestore-data-model.md) ve [`../firestore.rules`](../firestore.rules) eklendi. Belge sürümü v11.5.3 → v12.1.0-pre.2; hedef faz v12.1.0 (Firestore Rules foundation deploy + emulator suite). Runtime kod değişmedi; §2–§12 (rol matrisi, alanlar, read/write matrix, negatif/pozitif testler, borç paneli özel testleri, emulator stratejisi, test data plan, expected report template, deployment gate, rollback) aynen korundu. |
| v12.1.0-pre.3 | 2026-05-24 | Yeni §1.2 "`probeAdminAccess()` runtime probe test kapsamı" eklendi — R-01 … R-15 testleri readiness zinciri (auth-not-ready / firestore-not-ready / no-current-user), doc evaluation (admin-doc-missing / inactive-admin / invalid-role / allowed:true tüm 4 rol) + öncelik kontrolü (R-13 active-önce-role) + sanitization sızıntısı (R-12 notes/timestamps/metadata) + auto-wiring sızıntısı (R-14 page load idle) + `inspect()` no-read garantisi (R-15) için. Belge sürümü pre.2 → pre.3. Foundation draft test kapsamı (§1.1, F-01 … F-12) ve §2–§12 ana test seti aynen korundu. Rules dosyası değişmedi. |
| v12.1.0-pre.5 | 2026-05-24 | Yeni §1.4 "`admin/dashboard.html` opt-in re-verify senaryoları" eklendi — H-01 … H-20 testleri flag-off bit-identical garantisi (H-01), requireAdmin önce çalışıyor (H-02/H-03/H-16), readiness fail (H-04/H-05), tüm 4 geçerli rol allow (H-06 … H-09), deny path'leri (H-10/H-11/H-12/H-13/H-14), logout handler bağımsız (H-15), persistence (H-17), production host no-op (H-18), watchdog limit dokümante (H-19), navigation (H-20) için. Belge sürümü pre.4 → pre.5. Foundation draft + runtime probe + login gate test kapsamları (§1.1 + §1.2 + §1.3) ve §2–§12 ana test seti aynen korundu. Rules dosyası değişmedi. |
| v12.1.0-pre.4 | 2026-05-24 | Yeni §1.3 "`admin/index.html` opt-in allowlist gate senaryoları" eklendi — G-01 … G-17 testleri flag-off bit-identical garantisi (G-01/G-02), gate ateşlenmemesi gereken yollar (G-03/G-04/G-05), deny path'leri (G-06/G-07/G-08/G-09/G-14) için "no session + no redirect" doğrulamaları, tüm 4 geçerli rol için allow (G-10 … G-13), persistence (G-15/G-17) ve production host no-op (G-16) için. Belge sürümü pre.3 → pre.4. Foundation draft + runtime probe test kapsamları (§1.1 + §1.2) ve §2–§12 ana test seti aynen korundu. Rules dosyası değişmedi. |

Bu doküman canlı bir referanstır — v12.1.0 fazında emulator + test suite
kurulduğunda her test sonucu için ayrı `firebase-rules-test-results-*.md`
raporu üretilir; bu plan ise zaman içinde rol/area/kural ekledikçe
güncellenir.
