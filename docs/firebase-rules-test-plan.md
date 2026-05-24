# Firebase Rules Test Plan

> Bu doküman, metavis1on projesinde Firebase / Firestore Security Rules
> üretim ortamına alınmadan önce uygulanacak test stratejisini açıklar.
> **Aktif rules dosyası bu doküman değildir;** v12.1.0-pre.2 itibarıyla
> repo köküne foundation draft olarak `firestore.rules` eklenmiştir
> ([`../firestore.rules`](../firestore.rules)), henüz deploy
> edilmemiştir. Bu doküman ise rol bazlı pozitif / negatif test
> senaryolarını ve deployment gate kurallarını içerir.
>
> Belge sürümü: v12.1.0-pre.2 · Hedef faz: v12.1.0 (Firestore Rules foundation deploy + emulator suite)
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

Bu doküman canlı bir referanstır — v12.1.0 fazında emulator + test suite
kurulduğunda her test sonucu için ayrı `firebase-rules-test-results-*.md`
raporu üretilir; bu plan ise zaman içinde rol/area/kural ekledikçe
güncellenir.
