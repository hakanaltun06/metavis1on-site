# Deployment Checklist

> Bu doküman, metavis1on projesinde Firebase ve admin modülleriyle ilgili
> değişiklikler production ortamına alınmadan önce uygulanacak **staging,
> test, güvenlik ve rollback** kontrollerini açıklar. **Bu belge aktif
> deploy script'i değildir;** v12 fazları için operasyon kontrol
> listesidir.
>
> Belge sürümü: v11.5.4 · Hedef faz: v12.0.0-alpha ve sonrası
>
> Bağlantılı dokümanlar:
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) — Genel mimari, faz roadmap'i ve §10 Migration Güvenlik Checklist'i.
> - [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) — Rules test stratejisi, deployment gate, rol matrisi.
> - [`debt-panel-audit.md`](./debt-panel-audit.md) — Borç paneli gate analizi ve risk haritası.

---

## İçindekiler

1. [Scope](#1-scope)
2. [Environment Strategy](#2-environment-strategy)
3. [Pre-deployment Checklist](#3-pre-deployment-checklist)
4. [Firebase Configuration Checklist](#4-firebase-configuration-checklist)
5. [Auth Checklist](#5-auth-checklist)
6. [Firestore Rules Checklist](#6-firestore-rules-checklist)
7. [App Check Checklist](#7-app-check-checklist)
8. [Debt Panel Deployment Protection](#8-debt-panel-deployment-protection)
9. [Smoke Test Checklist](#9-smoke-test-checklist)
10. [Rollback Checklist](#10-rollback-checklist)
11. [Deployment Log Template](#11-deployment-log-template)
12. [Go / No-Go Decision](#12-go--no-go-decision)
13. [Sürüm Notu](#13-sürüm-notu)

---

## 1. Scope

- Bu doküman **deploy checklist dokümanıdır.** Pratik bir operasyon
  rehberidir; her v12.x deploy'undan önce ilgili bölümler tek tek
  geçilir.
- **Bu fazda deploy yapılmaz.** Hiçbir Firebase project'e bağlantı
  açılmaz, hiçbir CLI komutu çalıştırılmaz.
- **Firebase config eklenmez.** `firebase.json`, `.firebaserc`,
  `firestore.rules`, `firestore.indexes.json` bu fazda oluşturulmaz.
  SDK script tag'i, init kodu veya environment dosyası eklenmez.
- **Runtime kod değişmez.** `index.html`, `admin/*.html`,
  `admin/borc/index.html`, `shared/js/*`, `shared/config/site.js` dahil
  hiçbir runtime dosyaya bu fazda dokunulmaz.
- **Emulator kurulmaz.** Emulator stratejisi
  [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §8'de
  ayrı belgelenmiştir; bu doküman onun çıktısını referans alır.
- Amaç, **v12.0.0-alpha ve sonrasındaki Firebase fazları için güvenli
  yayın süreci** oluşturmaktır. Her deploy aynı listeden geçer; ad-hoc
  deploy yapılmaz.

---

## 2. Environment Strategy

> Üç ortam ayrımı kesindir. Hiçbir ortam diğerine "geçici köprü" olarak
> kullanılmaz. Production verisi local/staging ortamına **kopyalanmaz.**

### 2.1 Local development

| Boyut | Değer |
|---|---|
| Amaç | Geliştirici makinesinde hızlı iterasyon, UI denemesi, mantık değişikliği. |
| Veri türü | Tamamen sahte / placeholder. `MV_SITE` benzeri statik fixture. |
| Gerçek veri kullanımı | **Yasak.** Production export'u local'a indirilmez. |
| Erişim | Yalnız geliştirici. |
| Deploy riski | Yok — local hiçbir yere deploy etmez. |
| Firebase | Bu fazda yok. v12.0.0+ ile birlikte emulator opsiyonu kullanılır; gerçek production project'e local'den bağlanılmaz. |

### 2.2 Firebase Emulator / staging

| Boyut | Değer |
|---|---|
| Amaç | Rules test'leri, auth/role doğrulaması, smoke test, manual QA. |
| Veri türü | **Sahte / test veri.** [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §9 placeholder schema'ları. |
| Gerçek veri kullanımı | **Yasak.** Özellikle borç verisi staging'e taşınmaz. |
| Erişim | Sınırlı reviewer + geliştirici (whitelist). |
| Deploy riski | Düşük — staging Firebase project ayrıdır; production'a sızıntı yok. |
| Firebase | Ayrı staging project + ayrı `.firebaserc` alias'ı (`staging`). |

### 2.3 Production

| Boyut | Değer |
|---|---|
| Amaç | Son kullanıcılara açık canlı portal + admin paneli. |
| Veri türü | Gerçek veri. |
| Gerçek veri kullanımı | Burada üretilir; başka ortama kopyalanmaz. |
| Erişim | Public (read), admin whitelist (write). |
| Deploy riski | **Yüksek.** Her deploy bu checklist'ten geçmek zorundadır. |
| Firebase | Ayrı production project + ayrı `.firebaserc` alias'ı (`prod`). Staging project ile **karıştırılmaz.** |

### 2.4 Veri akış kuralı

```
production  ─X─►  staging
production  ─X─►  local
staging     ──►   local      (opsiyonel; yine de sahte veri)
local       ──►   staging    (PR + review sonrası)
staging     ──►   production  (deploy gate sonrası)
```

**Borç paneli özel:** Hiçbir yön borç verisini taşıyamaz; her ortamda
ayrı placeholder kullanılır (bkz. §8).

---

## 3. Pre-deployment Checklist

> Her v12.x deploy başlatılmadan önce her madde tek tek işaretlenir.
> İşaretlenmemiş madde varsa deploy **bloklanır.**

- [ ] `git status` **temiz** mi? (uncommitted değişiklik yok)
- [ ] Doğru branch üzerinde misin? (release branch veya `main`)
- [ ] **Son commit hash'i** deployment log'a not edildi mi?
- [ ] `CHANGELOG.md` güncellendi mi? (yeni `[vX.Y.Z]` bölümü var)
- [ ] `docs/` güncellendi mi? (değişiklik gerektiren plan/test dokümanı varsa)
- [ ] **Runtime değişiklikleri** review edildi mi? (`git diff --stat` ile
      beklenenden büyük diff yok)
- [ ] Firebase config gerçek **secret** içermiyor mu? (`service account
      key`, `oauth client secret` gibi sunucu tarafı sırlar repo'da yok)
- [ ] Firestore Rules **testleri PASS** mı?
      ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §10)
- [ ] **Negatif testler PASS** mı? (N-01 … N-26 hepsi deny olarak doğrulandı)
- [ ] **Public write denemeleri reddedildi** mi? (anonymous + non-admin
      tüm write denemeleri deny)
- [ ] Admin olmayan kullanıcı `admins`, `adminLogs` veya borç verilerine
      **erişemiyor** mu?
- [ ] Bu deploy **borç panelini etkiliyor** mu? Etkiliyorsa §8
      Debt Panel Deployment Protection bölümü çalıştırıldı mı?
- [ ] **Rollback planı** hazır mı? (önceki commit hash + rules sürümü
      not edildi)

---

## 4. Firebase Configuration Checklist

- Firebase **client config** (`apiKey`, `projectId`, `appId` vb.)
  technically public sayılabilir; client'a gönderildiği için saklamak
  güvenlik sağlamaz. **Gerçek güvenlik Firestore Rules + Auth + App
  Check katmanındadır.**
- **Gizli değerler** (`service account key`, `admin SDK private key`,
  `oauth client secret`) **repo'ya konulmaz.** Bunlar yalnız Cloud
  Functions environment / GCP secret manager üzerinden tutulur.
- **API key tek başına güvenlik değildir.** "API key gizli" varsayımıyla
  kural yazmak hatadır; Rules anonim çağrıya bile açık olmamalıdır.
- **Environment ayrımı** yapılmalı: staging ve production için ayrı
  `firebaseConfig` blokları. Tek config'i iki ortama dağıtmak yasak.
- **Production project ve staging project** kesinlikle karıştırılmaz.
  `.firebaserc` içinde her ortam için ayrı alias tanımlanır
  (`staging`, `prod`); deploy komutu daima `--project <alias>` ile çağrılır.
- **Firebase Console ayarları** manuel doğrulanmalı:
  - Authorized domains listesinde yalnız gerçek production domain'leri var mı?
  - Firestore database **location** doğru mu? (rastgele bölge seçimi
    production'da gecikme/legal sorunu yaratır)
  - Rules **history** boş değil; en az bir önceki sürüm yedek olarak duruyor mu?
- **Auth provider durumu** kontrol edilmeli (bkz. §5).
- **App Check planı netleşmeden kritik write açılmamalı** (bkz. §7).

---

## 5. Auth Checklist

- [ ] **Email/password provider aktif** mi? (Firebase Console → Auth →
      Sign-in method)
- [ ] **Admin UID whitelist** hazır mı? (en az 1 owner + gerekli admin'ler)
- [ ] Her admin için `admins/{uid}` **dokümanı var** mı?
- [ ] `role` alanı doğru mu? (`'owner' | 'admin' | 'viewer'`)
- [ ] `active` alanı doğru mu? (`true` = canlı admin; `false` = soft-disabled)
- [ ] **Disabled admin** (`active: false`) write denemesi test edildi mi?
      (D-13, N-22 referansı)
- [ ] **Viewer / admin / owner** ayrımı test edildi mi? (P-06 … P-21,
      N-09 … N-11)
- [ ] **Eski dev gate** (`MV.auth.devLogin` format-only path) production'da
      **kapalı** mı? Yalnız emulator flag'i ile aktif.
- [ ] **Session persistence** davranışı test edildi mi?
      (`browserLocalPersistence` vs `browserSessionPersistence` tercih
      doğrulandı; 8 saatlik SessionStorage TTL → Firebase `idToken` expiry'sine devredildi)
- [ ] Anonim test admin hesabı / "deneme" kullanıcısı production'da
      **kalmadı** mı?

---

## 6. Firestore Rules Checklist

> Tüm test ID'leri ve detaylar için:
> [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md).
> Bu liste, deploy gate'in özet formudur.

- [ ] **anonymous write deny** (N-01, N-02, N-03, N-25, N-26)
- [ ] **non-admin write deny** (N-04, N-05)
- [ ] **viewer write deny** (N-06, N-07, N-08, P-10)
- [ ] **admin content write allow** (P-11 … P-15)
- [ ] **owner `admins` write allow** (P-17, P-18, P-19)
- [ ] **`adminLogs` create-only** (P-16 allow; N-20, N-21 deny)
- [ ] **`adminLogs` update/delete deny** (N-20, N-21)
- [ ] **draft public read deny** (N-14, N-15, N-16)
- [ ] **debt panel public read deny** (D-01, D-03, D-11)
- [ ] **wildcard public write deny** (N-24 — `match /{document=**}` veya
      benzeri geniş kural yok)
- [ ] **disabled admin deny** (N-22, N-23, D-13, D-14)

---

## 7. App Check Checklist

- App Check enforcement, v12 **erken fazda (v12.0 – v12.2) hemen zorunlu
  olmayabilir** ama planlanmalı. Erken fazda Rules + Auth çift katmanı
  yeterlidir; App Check üçüncü katmandır.
- Önce **monitor mode** düşünülebilir: enforcement açılmadan request
  pattern'leri Firebase Console'da gözlenir.
- **Production'da kritik write açılmadan önce** (v12.3.0 CRUD fazı +
  sonrası) App Check durumu yeniden değerlendirilmeli.
- App Check **tek başına auth/rules yerine geçmez.** Geçerli bir App Check
  token'ı, isteğin "abuse client değil" olduğunu söyler; yetki kararı
  hâlâ Rules + Auth tarafından verilir.
- v12.6.0 (borç paneli security review) öncesi App Check'in borç paneli
  trafiğini bozmadığı staging'de doğrulanmalıdır.

---

## 8. Debt Panel Deployment Protection

> Borç paneli, projedeki en hassas modüldür. Tüm deployment kontrolleri
> bu modül için **ek katmanlı** çalıştırılır.
> Bkz. [`debt-panel-audit.md`](./debt-panel-audit.md) ve
> [`firebase-transition-plan.md`](./firebase-transition-plan.md) §12.

### 8.1 Politika hatırlatmaları

- **Borç paneli hassas modüldür.** Finansal veri, kişisel referanslar
  içerebilir.
- **v12.0 – v12.5 boyunca `admin/borc/index.html` mümkünse
  değiştirilmeyecek.** Bu fazlar public site + admin modüllerini
  Firebase'e geçirir; borç paneli paralel ama bağımsız kalır.
- **Gerçek borç verisi staging'e taşınmayacak.** Test için
  [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §9.3
  placeholder schema'sı kullanılır.
- **Export/backup planı olmadan borç paneli refactor edilmeyecek.**
  Ayrı `docs/debt-panel-migration.md` (henüz yazılmadı) zorunlu.

### 8.2 Deploy öncesi kontroller

- [ ] **`/admin/borc/` manuel smoke test** yapıldı mı?
  - Dış gate (`MV.auth.requireAdmin`) login olmamış kullanıcıyı redirect ediyor mu?
  - İç Firebase Auth modal'ı açılıyor mu?
  - `signOut` sonrası veri belleği sıfırlanıyor mu?
- [ ] **`/borc.html` redirect zinciri** kontrol edildi mi?
  - Meta-refresh fallback çalışıyor mu?
  - JS `setTimeout(250ms)` redirect çalışıyor mu?
  - `noindex, nofollow` meta tag yerinde mi?
- [ ] Firestore rules değişikliği borç panelini **etkiliyor** mu?
  - Etkiliyorsa: **ayrı deploy** + **ayrı rollback** prosedürü zorunlu.
  - Etkilemiyorsa: regression test (D-12) ile path izolasyonu doğrulandı mı?
- [ ] Bu deploy `admin/borc/index.html` veya `shared/js/auth.js`
      dosyalarına dokunuyor mu? Dokunuyorsa ek code review ve ek
      reviewer onayı zorunlu.
- [ ] `gcloud firestore export` veya muadili **manuel backup** alındı mı?
      (Borç paneli rules değişikliği yapılacaksa zorunlu, içerik
      modülleri için önerilir.)

---

## 9. Smoke Test Checklist

> Her deploy sonrası manuel olarak browser'da doğrulanır. Otomatik
> e2e test eklenene kadar (ileri faz) bu liste manuel referanstır.

### 9.1 Public

- [ ] `/` (anasayfa) açılıyor mu?
- [ ] **Tema değiştirici** çalışıyor mu? (3 tema arasında geçiş)
- [ ] **Mobil menü** çalışıyor mu? (burger açıl/kapan, focus trap,
      Escape ile kapanış)
- [ ] `/public/projeler.html` açılıyor mu?
- [ ] **OG card ve favicon** yolları erişilebilir mi?
  - `/assets/og-card.png`
  - `/assets/favicon-32.png` (ve diğer boyutlar)
- [ ] LCP/CLS regresyonu yok mu? (en az gözle, ideali Lighthouse)

### 9.2 Admin

- [ ] `/admin/` (login) açılıyor mu?
- [ ] **Login gate** çalışıyor mu? (yetkisiz girişte hata mesajı)
- [ ] `/admin/dashboard.html` açılıyor mu?
- [ ] `/admin/announcements.html` açılıyor mu? (arama / read-only veriler)
- [ ] `/admin/events.html` açılıyor mu?
- [ ] `/admin/apps.html` açılıyor mu? (Public/Admin filtre çalışıyor)
- [ ] `/admin/logs.html` açılıyor mu?
- [ ] `/admin/borc/` açılıyor mu? (iki katmanlı gate çalışıyor — bkz. §8)
- [ ] **Logout** çalışıyor mu? (sessionStorage + Firebase signOut birlikte)

### 9.3 Docs / meta

- [ ] `/robots.txt` erişilebilir mi?
- [ ] `/sitemap.xml` erişilebilir mi?
- [ ] `/site.webmanifest` erişilebilir mi?

> Herhangi bir madde FAIL ise rollback değerlendirmesi açılır
> (bkz. §10).

---

## 10. Rollback Checklist

- **Önceki commit hash** not edilmeli. Deploy öncesi pre-deployment
  checklist'in ilk maddesinde kaydedilir; rollback bu hash'e döner.
- Deploy sonrası **kritik hata** varsa hızlı revert planı hazır olmalı:
  - Hosting / static deploy: önceki commit'e `git revert` veya önceki
    artifact'i yeniden deploy.
  - Firebase Rules: önceki sürüm Firebase Console rules history'sinden
    veya repo'daki önceki `firestore.rules`'tan yeniden deploy
    (`firebase deploy --only firestore:rules --project prod`).
- **Firebase Rules için önceki rules sürümü** saklanmalı (Firebase
  Console rules history + repo git history birlikte).
- **Firestore veri migration yapılmadıysa rollback kolaydır** — sadece
  kod / rules geri alınır, veri etkilenmez.
- **Veri migration varsa rollback ayrı plan ister.** Bu durumda:
  - Migration öncesi snapshot mevcut mu?
  - Restore prosedürü test edildi mi?
  - Rollback sırasında veri tutarlılığı nasıl korunacak?
- **Borç paneli etkilenmişse** önce erişim kapısı ve rules geri
  alınmalı; uygulama kodu sonra. İç Firebase Auth modal'ı sayesinde
  rules rollback sırasında bile yetkisiz erişim engellenmiş olur,
  ancak yine de erişim kapısı önceliklidir.
- **Rollback sonrası smoke test** (§9) **tekrar yapılmalı.** Rollback
  başarılı sayılmaz aksi takdirde.
- **Post-mortem dokümanı** (`docs/incidents/<tarih>.md`) yazılır;
  bu checklist ve ilgili plan dokümanları güncellenir.

---

## 11. Deployment Log Template

> Her production deploy'u için doldurulur. Bu doküman içine inline
> yazılmaz; her deploy ayrı dosyada (`docs/deployments/<tarih>-<version>.md`)
> veya commit message'ında tutulur.

| Field | Value |
|---|---|
| Date | YYYY-MM-DD HH:MM (TZ) |
| Version | vX.Y.Z |
| Commit Hash | `<short hash>` |
| Environment | `staging` \| `prod` |
| Deployed By | <isim / handle> |
| Firebase Project | `<project-id>` (alias: `staging` / `prod`) |
| Rules Version | Firebase Console rules history reference |
| Smoke Test Result | PASS / PARTIAL / FAIL (detay link) |
| Rollback Needed | YES / NO (YES ise sebep + hash) |
| Notes | Kısa not, ekstra context, varsa incident link |

---

## 12. Go / No-Go Decision

> Deploy başlatılmadan önce **tek karar:** Go mu, No-Go mu?
> Aşağıdaki şartların **tümü** Go tarafında olmalı.

### Go şartları

- ✅ **Git temiz** (`git status --short` boş)
- ✅ **Testler PASS** (unit + entegrasyon, varsa)
- ✅ **Rules negatif testleri PASS**
      ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §5)
- ✅ Bu deploy **borç panelini etkilemiyor** **veya** §8 Debt Panel
      Deployment Protection tamamlanmış
- ✅ **Rollback hazır** (önceki hash + rules sürümü not edildi)
- ✅ **Production / staging karışıklığı yok** (`.firebaserc` alias
      doğrulandı, `--project <alias>` komut hazır)

### No-Go şartları

- ❌ Rules **testleri eksik** (test raporu yok veya yarım)
- ❌ Auth **whitelist belirsiz** (owner uid yok veya `admins`
      koleksiyonu boş)
- ❌ Borç paneli **etkisi bilinmiyor** (diff borç path'ine dokunuyor
      ama §8 çalıştırılmadı)
- ❌ **Gerçek veri backup yok** (migration içeren deploy için
      `gcloud firestore export` çıktısı yok)
- ❌ Firebase **project belirsiz** (`--project` flag'i unutulmuş veya
      yanlış alias)
- ❌ **Runtime diff beklenenden büyük** (`git diff --stat` PR
      açıklamasıyla uyuşmuyor — sızıntı şüphesi)

Tek bir No-Go satırı bile varsa deploy **iptal edilir**, sebep dokümante
edilir, blocker giderildikten sonra checklist baştan geçilir.

---

## 13. Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v11.5.4 | 2026-05-23 | İlk deployment checklist. Aktif deploy yok; Firebase config yok. Environment ayrımı, pre-deploy/Rules/Auth/App Check checklists, borç paneli deployment protection, smoke test, rollback, deployment log template ve Go/No-Go karar matrisi belgelendi. |

Bu doküman canlı bir referanstır — her v12.x fazında deploy
deneyimlerinden öğrenilenle güncellenir. İlgili faz tamamlandığında
(örn. v12.0.0-alpha deploy'u sonrası) checklist eksikleri buraya
eklenir; mevcut bölümlerin geçmiş hali git history üzerinden takip
edilir.
