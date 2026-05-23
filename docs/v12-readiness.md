# v12 Readiness Summary

> Bu doküman, metavis1on projesinin **v12 Firebase Auth foundation
> fazına geçmeden önceki hazırlık durumunu** özetler. **Bu belge
> aktif kod değildir;** v12.0.0-alpha için karar ve kapsam
> dokümanıdır.
>
> Belge sürümü: v11.6.0 · Hedef faz: v12.0.0-alpha
>
> Bağlantılı dokümanlar (zorunlu okuma listesi):
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) — Genel mimari ve faz roadmap'i.
> - [`debt-panel-audit.md`](./debt-panel-audit.md) — Borç paneli mevcut yapı + risk haritası.
> - [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) — Rules test stratejisi ve deployment gate.
> - [`deployment-checklist.md`](./deployment-checklist.md) — Operasyon kontrol listesi.

---

## İçindekiler

1. [v11 Tamamlanan İşler](#1-v11-tamamlanan-i̇şler)
2. [Mevcut Dokümanlar](#2-mevcut-dokümanlar)
3. [v12.0.0-alpha Scope](#3-v1200-alpha-scope)
4. [Out of Scope for v12.0.0-alpha](#4-out-of-scope-for-v1200-alpha)
5. [Runtime Dokunma Matrisi](#5-runtime-dokunma-matrisi)
6. [v12 Entry Criteria](#6-v12-entry-criteria)
7. [Suggested v12.0.0-alpha Commit Plan](#7-suggested-v1200-alpha-commit-plan)
8. [Remaining Risks](#8-remaining-risks)
9. [Go / Hold Decision](#9-go--hold-decision)
10. [Sürüm Notu](#10-sürüm-notu)

---

## 1. v11 Tamamlanan İşler

### 1.1 Public portal readiness
- **v11.0.7** — `index-v11.html` taşınarak canlı `index.html` haline geldi.
- **v11.1.1 / v11.1.2** — SEO meta zinciri (OG, Twitter card, canonical, theme-color), `robots.txt`, `sitemap.xml`, favicon + `site.webmanifest`.
- **v11.1.3 / v11.1.4** — Mobil navigasyon (burger, focus trap, scroll-lock, skip-to-content), accessibility (aria-labelledby, aria-pressed).
- **v11.1.5** — Logo asset optimizasyonu (~%98.6 bandwidth tasarrufu, retina srcset).

### 1.2 Admin dashboard readiness
- **v11.2.0** — Admin Command Center (login cilası, hero + 4 stat kartı + hızlı erişim + sistem durumu + sürüm timeline).

### 1.3 Read-only admin modules readiness
- **v11.3.0** — `admin/announcements.html`, `admin/events.html`, `admin/apps.html`, `admin/logs.html` scaffolds + ortak `admin/admin-modules.css`.
- **v11.3.1** — Skip-to-content, client-side arama/filtre, Public/Admin segmented filter, kapalı `<details>` raw JSON viewer (XSS güvenli), logs sayfasında Firebase `adminLogs` bilgi kartı.

### 1.4 Documentation readiness
- **v11.5.0** — Repo kökü `README.md`, `CHANGELOG.md`, `docs/README.md` indeksi.

### 1.5 Firebase planning readiness
- **v11.4.0** — `docs/firebase-transition-plan.md` (mimari, auth, koleksiyon planı, şemalar, read/write matrisi, rules taslak mantığı, v12 faz roadmap'i).
- **v11.5.3** — `docs/firebase-rules-test-plan.md` (rol matrisi, pozitif/negatif test senaryoları, emulator stratejisi, deployment gate, rollback).
- **v11.5.4** — `docs/deployment-checklist.md` (environment strategy, pre-deploy / Auth / Rules / App Check checklists, smoke test, Go/No-Go).

### 1.6 Debt panel protection readiness
- **v11.5.2** — `docs/debt-panel-audit.md` (dış + iç gate analizi, storage haritası, risk tablosu, dokunma kuralları).
- `firebase-transition-plan.md` §12 (Debt Panel Special Policy) ve `firebase-rules-test-plan.md` §7 (Debt Panel Specific Tests) ile pekiştirildi.
- **Borç paneli v12.0 – v12.5 boyunca kod düzeyinde dokunulmayacak.**

---

## 2. Mevcut Dokümanlar

| Document | Purpose | Status |
|---|---|---|
| [`docs/firebase-transition-plan.md`](./firebase-transition-plan.md) | Firebase Auth + Firestore mimari planı, koleksiyon şemaları, read/write matrisi, rules taslak mantığı, v12 faz roadmap'i. | ✅ Tamam (v11.4.0) |
| [`docs/debt-panel-audit.md`](./debt-panel-audit.md) | Borç panelinin mevcut iki katmanlı gate, storage, yönlendirme zinciri ve risk haritası (read-only audit). | ✅ Tamam (v11.5.2) |
| [`docs/firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) | Firestore Security Rules için rol bazlı pozitif/negatif test senaryoları, borç paneli özel testleri, emulator stratejisi, deployment gate. | ✅ Tamam (v11.5.3) |
| [`docs/deployment-checklist.md`](./deployment-checklist.md) | Environment ayrımı, pre-deploy / Auth / Rules / App Check checklists, debt panel deployment protection, smoke test, rollback, Go/No-Go. | ✅ Tamam (v11.5.4) |
| [`CHANGELOG.md`](../CHANGELOG.md) | v10.x → v11.6.0 sürüm geçmişi (Keep a Changelog tarzı). | ✅ Aktif |
| [`docs/README.md`](./README.md) | Dokümantasyon indeksi (Current Documents + Planned Documents). | ✅ Aktif |
| [`README.md`](../README.md) | Repo kökü kısa proje tanıtımı, klasör yapısı, Firebase durumu notu. | ✅ Aktif |

---

## 3. v12.0.0-alpha Scope

Bu fazda **yapılabilecekler:**

- **Firebase config şablonu genişletilebilir** — `shared/config/firebase.js` v10.0-alpha'dan beri dormant placeholder olarak mevcut (no-op IIFE; hiçbir HTML yüklemiyor). v12.0.0-alpha'da bu dosya safe loader haline getirilebilir; placeholder `apiKey` ise init etme, gerçek `apiKey` enjekte edilmez ("boş şablon → env'den" pattern'i).
- **Firebase Auth foundation kurulabilir** — `firebase-app` + `firebase-auth` SDK script tag'leri **yalnız admin sayfalarında** (public site etkilenmez).
- **Admin login akışı Firebase Auth wrapper'a hazırlanabilir** — `MV.auth.devLogin` → `signInWithEmailAndPassword` köprüsü; mevcut form alanları korunur.
- **Dev gate production'da sınırlandırılabilir** — `MV.auth.devLogin`'in format-only davranışı yalnız emulator flag'i altına alınır.
- **Admin whitelist yapısı hazırlanabilir** — `admins/{uid}` koleksiyonu manuel olarak doldurulur (başlangıçta 1 owner + gerekli admin'ler).
- **`shared/js/auth.js` Firebase Auth wrapper'ı eklenebilir** ama mevcut API (`MV.auth.isAuthed`, `requireAdmin`, `logout`) signature'ı korunur.

**Yapılmayacaklar (foundation = sadece kimlik):**

- **Firestore write açılmayacak.** Bu fazda hiçbir koleksiyona write yapılmaz; sadece auth state ve identity.
- **CRUD açılmayacak.** announcements / events / apps modülleri read-only kalır.
- **Borç paneline dokunulmayacak.** Hiçbir runtime dosyası (`admin/borc/index.html`) değiştirilmez.
- **Public site verisi Firebase'e taşınmayacak.** `index.html` ve `MV_SITE` aynı kalır; v12.2.0 fazına ertelenir.
- **İlk hedef:** auth foundation ve güvenli yapı. Davranışsal değişiklik mümkün olduğunca minimum.

---

## 4. Out of Scope for v12.0.0-alpha

Aşağıdakiler **v12.0.0-alpha kapsamında kesinlikle yok;** kendi fazlarına bırakılır.

- **Announcements CRUD** → v12.3.0
- **Events CRUD** → v12.3.0
- **Apps CRUD** → v12.4.0
- **Admin logs gerçek zamanlı bağlama** → v12.5.0
- **Borç paneli refactor** → yalnız v12.6.0 security review; refactor ayrı sprint
- **Borç verisi migration** → ayrı `docs/debt-panel-migration.md` yazılmadan **yok**
- **Firestore content migration** (announcements / events / apps verisinin Firestore'a yazılması) → v12.2.0+
- **Production deploy zorlaması** → v12.0.0-alpha staging'de doğrulanır; production deploy ayrı karar
- **App Check enforcement zorlaması** → erken fazda monitor mode, enforcement v12.3.0 + sonrası değerlendirilir
- **Cloud Functions** → v12.5.0+ (custom claims ve scheduled job ihtiyacı doğduğunda)

---

## 5. Runtime Dokunma Matrisi

| Area / File | v12.0.0-alpha Touch? | Note |
|---|:---:|---|
| `admin/index.html` | 🟡 İleride | Auth foundation tamamlanınca login form `signInWithEmailAndPassword` çağrısına bağlanır; form layout korunur. |
| `admin/dashboard.html` | ❌ Hayır | Sadece auth state'den UID gösterme gibi mikro etkileşim sonradan; bu fazda dokunmamak tercih. |
| `shared/js/auth.js` | 🟡 İleride | Firebase Auth wrapper eklenir; mevcut API yüzeyi (`isAuthed`, `requireAdmin`, `logout`) korunur. |
| `shared/config/firebase.js` | 🟡 Mevcut dormant placeholder genişletilecek | **Yeni dosya değil** — v10.0-alpha'dan beri repo'da no-op IIFE olarak duruyor, hiçbir HTML yüklemiyor. v12.0.0-alpha'da safe loader / Firebase config wrapper haline getirilebilir; runtime'a bağlanması ayrı ve kontrollü adımdır. Gerçek `apiKey` enjekte edilmez. |
| `index.html` | ❌ Hayır | Public site bu fazda Firebase'e bağlanmıyor. |
| `shared/config/site.js` | ❌ Hayır | `MV_SITE` v12.2.0'a kadar tek kaynak; bu fazda dokunulmaz. |
| `admin/borc/index.html` | ❌ Hayır | **Borç paneli v12.0 – v12.5 boyunca kod düzeyinde dokunulmaz** ([`firebase-transition-plan.md`](./firebase-transition-plan.md) §12). |
| `borc.html` | ❌ Hayır | Redirect zinciri korunur; meta-refresh + JS setTimeout aynı. |
| `docs/*` | 🟡 İleride | v12.0.0-alpha PR'ında ilgili plan dokümanları (transition-plan / deployment-checklist) sürüm satırı eklenir. |
| `firestore.rules` | ❌ Hayır | **v12.1.0'a bırakılır.** v12.0.0-alpha yalnız auth, henüz Firestore yok. |
| `firebase.json` | 🟡 Belki | Yalnız hosting alias'ı veya emulator config için gerekirse; gerekmiyorsa eklenmez. Eklenirse içerik minimum tutulur. |
| `.firebaserc` | 🟡 Belki | `staging` + `prod` alias'ları için. Sadece project ID isimleri; secret değil. |
| `firestore.indexes.json` | ❌ Hayır | Firestore yokken index yok. |

İşaret anlamı: 🆕 yeni dosya · 🟡 ileride / belki · ❌ dokunulmaz

---

## 6. v12 Entry Criteria

v12.0.0-alpha açılmadan önce **tüm** maddeler doğrulanmalıdır.

- [x] **v11.5.4 deployment checklist mevcut** ([`deployment-checklist.md`](./deployment-checklist.md))
- [x] **v11.5.3 rules test plan mevcut** ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md))
- [x] **v11.5.2 debt panel audit mevcut** ([`debt-panel-audit.md`](./debt-panel-audit.md))
- [x] **v11.4.0 firebase transition plan mevcut** ([`firebase-transition-plan.md`](./firebase-transition-plan.md))
- [ ] **Git working tree temiz** (v12.0.0-alpha PR açılırken doğrulanır)
- [ ] **v12.0.0-alpha kapsamı net** (bu doküman §3 + §4 onaylanmış olmalı)
- [ ] **Borç paneli v12.0 – v12.5 boyunca korunacak** (kabul edilmiş politika)
- [ ] **Firestore write açılmayacak** (v12.0.0-alpha yalnız auth)
- [ ] **Runtime değişiklikleri atomik commit'lerle yapılacak** (büyük tek commit yerine küçük adımlar — bkz. §7)
- [ ] **Rollback planı hazır olacak** ([`deployment-checklist.md`](./deployment-checklist.md) §10 referans alınır)

İşaret anlamı: [x] hazır · [ ] v12.0.0-alpha açılırken doğrulanacak

---

## 7. Suggested v12.0.0-alpha Commit Plan

Önerilen küçük, **revert-friendly** adımlar. Her commit bağımsız olarak geri alınabilir.

1. **Firebase config placeholder / safe loader planı.**
   `shared/config/firebase.js` **yeni dosya değil** — v10.0-alpha'dan beri dormant placeholder olarak mevcut. Mevcut no-op IIFE, **placeholder** `apiKey: "YOUR_API_KEY"` ve init guard (placeholder ise init etme) içerecek şekilde genişletilir. Gerçek config dev/staging/prod için ayrı enjekte edilir; bu fazda yazılmaz.

2. **Auth wrapper tasarımı.**
   `shared/js/auth.js` içinde Firebase Auth wrapper'ı eklenir; mevcut `MV.auth.isAuthed` / `requireAdmin` / `logout` API'si dış görünüm olarak değişmez, içeride Firebase Auth state'e bağlanır.

3. **Admin login Firebase Auth hazırlığı.**
   `admin/index.html` form submit handler'ı `signInWithEmailAndPassword` çağrısına bağlanır; **placeholder config aktifken** eski dev gate fallback'i çalışır (geriye dönük uyumluluk).

4. **Dev gate production guard.**
   `MV.auth.devLogin` format-only davranışı bir flag arkasına alınır (örn. `MV.auth.allowDevLogin = !isProduction`). Production'da dev gate kapalı.

5. **No Firestore write.**
   Bu fazda hiçbir koleksiyona write yapılmaz; sadece auth state. `firestore` SDK script'i eklenmez (gereksiz bundle).

6. **Manual smoke test.**
   [`deployment-checklist.md`](./deployment-checklist.md) §9 manuel olarak çalıştırılır; admin login akışı + borç paneli iç gate'i bozulmamış olarak doğrulanır.

7. **Commit sonrası deployment checklist uygulanır.**
   v12.0.0-alpha staging'e deploy edilmeden önce [`deployment-checklist.md`](./deployment-checklist.md) §3 (Pre-deployment) + §12 (Go/No-Go) tamamlanır.

---

## 8. Remaining Risks

| Risk | Önlem |
|---|---|
| **Firebase config yanlış project'e bağlanabilir** (staging config production'a sızabilir) | Ayrı `.firebaserc` alias (`staging` / `prod`); deploy komutu daima `--project <alias>`; config dosyaları environment başına ayrı; PR review'da config diff zorunlu kontrol. |
| **Dev gate production'da açık kalabilir** (`MV.auth.devLogin` parolasız erişim) | Commit Plan #4 (Dev gate production guard) zorunlu; smoke test sırasında production build'de devLogin çağrısı görünmüyor olmalı; release branch'te grep ile literal `devLogin` araması. |
| **Rules testleri henüz gerçek emulator'da koşulmadı** | v12.0.0-alpha kapsamında Firestore yok → Rules deploy'u da yok. Rules testleri v12.1.0 (Firestore Rules foundation) ile birlikte gerçek emulator'da koşulacak; o fazdan önce hiçbir write açılmaz. |
| **Borç paneli Firebase kullandığı için yanlış project/rules etkisi olabilir** | Borç paneli `firebaseConfig`'i kendi modül içinde inline tutuyor ([`debt-panel-audit.md`](./debt-panel-audit.md) §1.5); v12.0.0-alpha'da bu config'e dokunulmaz. Eğer aynı Firebase project paylaşılacaksa rules namespace izolasyonu zorunlu ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §7 D-11, D-12); ayrı project tercih edilirse iki config birbiriyle karışmaz. |
| **Auth geçişi admin login deneyimini bozabilir** (mevcut sessionStorage TTL'i ile Firebase `idToken` expiry'si çakışabilir) | Wrapper içinde geriye dönük uyumluluk: placeholder config aktifken eski dev gate fallback'i çalışır; gerçek config aktifken Firebase persistence kullanılır; smoke test sırasında "login → dashboard → modüller → logout" tam akışı manuel test edilir. |

---

## 9. Go / Hold Decision

### Go şartları (v12.0.0-alpha açılabilir)

- ✅ Sadece **auth foundation** yapılacaksa.
- ✅ **Firestore write açılmayacaksa.**
- ✅ **Borç paneline dokunulmayacaksa.**
- ✅ **Rollback planı hazırsa** ([`deployment-checklist.md`](./deployment-checklist.md) §10).
- ✅ Bu doküman §6 Entry Criteria'daki tüm `[x]` maddeler hazır + `[ ]` maddeler PR açılışında doğrulanabilir durumda.
- ✅ Commit Plan §7 küçük atomik adımlar olarak uygulanacaksa.

### Hold şartları (v12.0.0-alpha açılmaz)

- ❌ **Firebase project belirsizse** (staging / prod project ID'leri henüz oluşturulmamış).
- ❌ **Admin UID whitelist hazır değilse** (en az 1 owner UID Firebase Console'da kayıtlı değil).
- ❌ **Runtime diff çok büyürse** (Commit Plan §7'nin tek bir adımı diğer dosyalara sızıyorsa).
- ❌ **Borç panelini etkileyen değişiklik gerekiyorsa** (v12.6.0'a ertelenir; v12.0.0-alpha kapsamı genişletilmez).
- ❌ **Rules test planı uygulanmadan write açılmak istenirse** (Firestore write v12.1.0 öncesi yasaktır; bu kuralın istisnası yok).

Tek bir Hold satırı bile varsa v12.0.0-alpha **açılmaz**; blocker giderilene kadar v11.6.x dokümantasyon fazında kalınır.

---

## Auth Wrapper Layer Status

> Bu bölüm v12.0.0-alpha.15'te eklendi ve v12.0.0-alpha.18'de
> tazelendi. v12.0.0-alpha.6 → alpha.17 fazlarında inşa edilen
> `MV.auth.firebase` katmanının mevcut durumunu özetler. Detaylı
> rehber: [`firebase-local-setup.md`](./firebase-local-setup.md).

- **`signIn`: ready behind guard.** `MV.auth.firebase.signIn()`
  ready iken `signInWithEmailAndPassword` çağrılır; placeholder'da
  no-op (alpha.12).
- **`signOut`: ready behind guard.** `MV.auth.firebase.signOut()`
  ready iken `auth.signOut()` çağrılır; placeholder'da no-op
  (alpha.14).
- **`currentUser`: live-read behind guard.**
  `MV.auth.firebase.currentUser()` ready iken `auth.currentUser`
  property'sini okur ve sanitized 5-field snapshot veya `null`
  döner; SDK method invoke etmez (alpha.16).
- **`onChange`: live-listener behind guard.**
  `MV.auth.firebase.onChange(cb)` ready iken gerçek
  `onAuthStateChanged` listener kurar; callback sanitized
  snapshot/null alır; `unsubscribe` safe-wrapped (alpha.17).
- **`sessionBridge` / `logoutBridge`: available.**
  `createSessionFromResult()` ve `clearSessionAfterSignOut()`
  strict validation ile manuel çağrılır; `signIn` / `signOut`
  bunları otomatik tetiklemez (deliberate decoupling).
- **Sonuç:** *Auth wrapper layer is complete behind readiness
  guards; HTML wiring is the next controlled phase.*
- **Admin HTML wiring: pending.** `admin/index.html` login formu
  hâlâ `MV.auth.devLogin` üzerinden çalışır; `admin/dashboard.html`
  logout hâlâ `MV.auth.logout` üzerinden çalışır. Wrapper
  aktivasyonu alpha.19 (login trial) ve alpha.20 (logout trial)
  opt-in fazlarına bırakıldı.
- **Firestore: pending.** Firestore SDK admin sayfalarına
  eklenmedi; read / write / CRUD yok. v12.1.0 Firestore Rules
  foundation fazından sonra açılır.
- **Debt panel: out of scope.** Borç paneli
  (`admin/borc/index.html`) kendi inline `firebaseConfig`'i ile
  izole çalışır; v12 Auth wrapper'ı ile karışmaz. v12.0 – v12.5
  boyunca kod düzeyinde dokunulmaz.

---

## 10. Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v11.6.0 | 2026-05-23 | İlk v12 readiness özet dokümanı. v11 tamamlanan işler, mevcut dokümanlar tablosu, v12.0.0-alpha scope + out-of-scope, runtime dokunma matrisi, entry criteria, önerilen commit planı, kalan riskler ve Go/Hold karar matrisi belgelendi. |
| v12.0.0-alpha.15 | 2026-05-23 | Auth Wrapper Layer Status bölümü eklendi. alpha.6 → alpha.14 sonrası `MV.auth.firebase` katmanının mevcut durumu, pending wiring ve out-of-scope kalemleri özetlendi. Detay: [`firebase-local-setup.md`](./firebase-local-setup.md). |
| v12.0.0-alpha.18 | 2026-05-23 | Auth Wrapper Layer Status alpha.16 (currentUser live-read) ve alpha.17 (onChange live-listener) sonrası tazelendi. Wrapper artık dört yüzeyiyle (signIn, signOut, currentUser, onChange) ready behind guard; "Auth wrapper layer is complete behind readiness guards; HTML wiring is the next controlled phase" beyanı eklendi. HTML wiring alpha.19/alpha.20 trial fazlarına bırakıldı. |

Bu doküman v12.0.0-alpha PR açılana kadar canlı bir referanstır;
PR description'ı için doğrudan referans olarak kullanılabilir. v12.0.0-alpha
tamamlandığında bu doküman ya bir sonraki readiness summary'ye (`v12.1-readiness.md`
gibi) devrolur ya da `## 1. v11 Tamamlanan İşler` bölümünün altına v12.0
çıktıları eklenerek canlı tutulur.
