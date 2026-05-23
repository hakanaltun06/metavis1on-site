# Firebase Project Setup Checklist

> Bu doküman, metavis1on projesinde **v12.0.0-alpha Firebase Auth
> foundation fazına geçmeden önce Firebase Console tarafında
> hazırlanması gereken** staging/production project yapısını, manuel
> kontrolleri ve güvenlik notlarını açıklar. **Bu belge aktif Firebase
> config dosyası değildir;** Console tarafındaki operasyon kontrol
> listesidir.
>
> Belge sürümü: v11.6.1 · Hedef faz: v12.0.0-alpha pre-flight
>
> Bağlantılı dokümanlar:
> - [`v12-readiness.md`](./v12-readiness.md) — v12.0.0-alpha kapsam ve Go/Hold matrisi.
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) — Genel mimari, §3 servisler ve §4 auth planı.
> - [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) — Rules test stratejisi ve deployment gate.
> - [`deployment-checklist.md`](./deployment-checklist.md) — Operasyon kontrol listesi.
> - [`debt-panel-audit.md`](./debt-panel-audit.md) — Borç paneli mevcut yapı + risk haritası.

---

## İçindekiler

1. [Scope](#1-scope)
2. [Project Strategy](#2-project-strategy)
3. [Firebase Console Setup Checklist](#3-firebase-console-setup-checklist)
4. [Auth Setup Checklist](#4-auth-setup-checklist)
5. [Firestore Setup Checklist](#5-firestore-setup-checklist)
6. [App Check Setup Checklist](#6-app-check-setup-checklist)
7. [Alias Plan](#7-alias-plan)
8. [Config Policy](#8-config-policy)
9. [Admin Whitelist Bootstrap Plan](#9-admin-whitelist-bootstrap-plan)
10. [Debt Panel Special Setup Notes](#10-debt-panel-special-setup-notes)
11. [v12.0.0-alpha Pre-flight Checklist](#11-v1200-alpha-pre-flight-checklist)
12. [What Must Not Be Committed](#12-what-must-not-be-committed)
13. [Sürüm Notu](#13-sürüm-notu)

---

## 1. Scope

- Bu doküman **Firebase project hazırlık checklist'idir.** Firebase
  Console tarafındaki manuel kontrolleri ve karar noktalarını
  belgeler.
- **Bu fazda Firebase project oluşturulmaz.** Hiçbir GCP / Firebase
  Console işlemi yapılmaz; yalnız yapılması gerekenler listelenir.
- **Bu fazda SDK / config eklenmez.** `shared/config/firebase.js`,
  `firebase.json`, `.firebaserc`, `firestore.rules`,
  `firestore.indexes.json` oluşturulmaz.
- **Bu fazda deploy yapılmaz.** Hiçbir CLI komutu çalıştırılmaz.
- **Gerçek secret veya config değeri yazılmaz.** Project ID, API key,
  appId, owner UID, kullanıcı e-postası gibi tanımlayıcı değerler
  **yalnız placeholder** olarak temsil edilir.
- Amaç, **v12.0.0-alpha öncesi Firebase Console hazırlığını
  netleştirmektir.** Bu doküman tamamlandığında
  [`v12-readiness.md`](./v12-readiness.md) §9 Hold şartlarındaki
  "Firebase project belirsizse" ve "Admin UID whitelist hazır değilse"
  blocker'ları giderilebilir hale gelir.

---

## 2. Project Strategy

İki ayrı Firebase project önerilir:

| Ad (önerilen) | Placeholder | Amaç |
|---|---|---|
| metavis1on-staging | `<FIREBASE_STAGING_PROJECT_ID>` | Test, sahte veri, rules emulator hedefi, smoke test ortamı. |
| metavis1on-production | `<FIREBASE_PRODUCTION_PROJECT_ID>` | Canlı portal + admin paneli. |

> **Gerçek project ID'leri bu dokümana yazılmaz.** Console'da project
> oluşturulduktan sonra ID'ler `.firebaserc` (v12.0.0-alpha veya deploy
> fazında) içine alias arkasında tutulur.

### 2.1 Politika

- **Staging test / sahte veri içindir.** Hiçbir gerçek kullanıcı verisi
  staging'e taşınmaz.
- **Production gerçek canlı ortamdır.** Hiçbir test veri seti
  production'a yazılmaz.
- **Production verisi staging'e kopyalanmaz** (bkz.
  [`deployment-checklist.md`](./deployment-checklist.md) §2.4 veri akış
  matrisi).
- **Borç paneli hassas veri** kabul edildiği için **staging'de gerçek
  borç verisi kullanılmaz** ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md)
  §9.3 placeholder schema'sı geçerlidir).

---

## 3. Firebase Console Setup Checklist

> Her madde **staging** ve **production** için ayrı ayrı işaretlenir.
> Aynı kararı iki project'e otomatik uygulamak yasaktır.

- [ ] **Firebase project oluşturuldu** mu? (staging ve production ayrı)
- [ ] **Project owner** kim? (en az 1 GCP owner; ekip içinde belirlenir
      ve dokümante edilir — `<OWNER_GOOGLE_ACCOUNT>` placeholder)
- [ ] **Billing durumu** kontrol edildi mi? (Spark plan ile başlanabilir;
      App Check + Cloud Functions gerekirse Blaze upgrade)
- [ ] **Region / location** seçildi mi? (`europe-west*` veya
      `eur3` multi-region; karar verildikten sonra **değiştirilemez**)
- [ ] **Web app kaydı** açıldı mı? (Firebase Console → Project Settings →
      Your apps → Web app)
- [ ] **Authorized domains** kontrol edildi mi? (yalnız gerçek production
      domain'leri; `localhost` dev için bırakılır; rastgele preview
      domain'leri kaldırılır)
- [ ] **Google Analytics** gerekli mi? (önerilen: **hayır** — opt-out;
      v12 erken fazlarında telemetri zorunlu değil; eklemek istenirse
      KVKK/GDPR uyum notu ayrı kayda alınır)
- [ ] **Production ve staging karıştırılmadı** mı? (project switcher'da
      hangi project üzerinde işlem yapıldığı her seferinde teyit edilir)

---

## 4. Auth Setup Checklist

- [ ] **Email/password provider aktif** mi? (Firebase Console → Authentication →
      Sign-in method)
- [ ] **Admin olacak kullanıcı e-postaları** belirlendi mi? (ekip içinde
      onaylanmış liste; gerçek e-postalar bu dokümana yazılmaz —
      `<OWNER_EMAIL>`, `<ADMIN_EMAIL_1>` … placeholder)
- [ ] **Owner UID nasıl alınacak?** — owner kullanıcı Firebase Console'da
      manuel olarak yaratılır (email + initial password); ardından
      Authentication → Users tablosundan UID kopyalanır.
- [ ] **Admin UID whitelist nasıl tutulacak?** — `admins/{uid}` Firestore
      koleksiyonu (bkz.
      [`firebase-transition-plan.md`](./firebase-transition-plan.md) §4.2);
      v12.5+ Custom Claims migration'ı opsiyonel.
- [ ] **İlk owner kim olacak?** — tek owner ile başlanır; backup owner
      v12.0.0-alpha sonrası eklenir. Hiçbir zaman "ortak owner hesabı"
      kullanılmaz.
- [ ] **Viewer / admin / owner** rol ayrımı kullanılacak mı?
      v12.0 – v12.4: `owner` + `admin` zorunlu; `viewer` opsiyonel.
      v12.5'ten itibaren `viewer` aktif edilebilir.
- [ ] **Disabled admin testi** planlandı mı?
      ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) N-22 / N-23 / D-13 / D-14).
- [ ] **Eski dev gate** (`MV.auth.devLogin` format-only davranışı)
      production'da **kapalı** olacak mı? — Evet,
      [`v12-readiness.md`](./v12-readiness.md) §7 commit plan adım 4.
- [ ] **MFA** ileride zorunlu olacak mı? Karar v12.5+ ele alınır;
      şimdi not edilir ama setup yapılmaz.

---

## 5. Firestore Setup Checklist

- [ ] **Firestore database oluşturulacak** mı? — v12.1.0 fazında;
      v12.0.0-alpha'da yalnız Auth.
- [ ] **Location / region** ne olacak? — Project location ile uyumlu
      (`eur3` multi-region önerilir; karar verildikten sonra
      **değiştirilemez**).
- [ ] **Production project üzerinde test verisi kullanılmayacak.**
      Test her zaman staging veya emulator hedefli olur.
- [ ] **İlk rules deploy edilmeden önce**
      [`docs/firebase-rules-test-plan.md`](./firebase-rules-test-plan.md)
      takip edilecek. Test PASS olmadan production rules deploy yok.
- [ ] **`allow read, write: if true` kullanılmayacak.** Hiçbir geçici
      test, demo veya "şimdilik açalım" gerekçesiyle bu kural
      eklenmez ([`firebase-transition-plan.md`](./firebase-transition-plan.md)
      §2.3).
- [ ] **Initial collections** manuel oluşturulacaksa önce schema
      kontrol edilecek
      ([`firebase-transition-plan.md`](./firebase-transition-plan.md) §6).
      Yanlış field tipi sonradan rules ile yakalanamayabilir.
- [ ] **`publicConfig/site`** gibi public okuma alanları ayrı tutulacak.
      Public read alan hiçbir koleksiyon, admin-only veya hassas veri
      içeren bir koleksiyonla aynı path altında değildir.
- [ ] **Borç paneli koleksiyonları** public content koleksiyonlarıyla
      karıştırılmayacak (bkz. §10 ve
      [`firebase-transition-plan.md`](./firebase-transition-plan.md) §12).

---

## 6. App Check Setup Checklist

- v12.0.0-alpha'da **enforcement zorunlu olmayabilir.** İlk fazda
  Rules + Auth çift katmanı yeterlidir; App Check üçüncü katman.
- **Önce monitor mode** düşünülebilir: enforcement açılmadan request
  pattern'leri Firebase Console'da gözlenir.
- **Production'da kritik write açılmadan önce** (v12.3.0 CRUD fazı +
  sonrası) App Check durumu yeniden değerlendirilecek.
- **App Check auth / rules yerine geçmez.** Geçerli bir App Check
  token'ı, isteğin "abuse client değil" olduğunu söyler; yetki kararı
  hâlâ Rules + Auth tarafından verilir.
- v12.6.0 (borç paneli security review) öncesi App Check'in borç paneli
  trafiğini bozmadığı staging'de doğrulanacak.

---

## 7. Alias Plan

> Bu fazda `.firebaserc` **oluşturulmaz.** Aşağıdaki tablo yalnızca
> ileride dosya yazılırken referans alınacak plan'dır.

| Alias | Purpose | Project Placeholder |
|---|---|---|
| `staging` | Test / emulator-adjacent Firebase project | `<FIREBASE_STAGING_PROJECT_ID>` |
| `prod` | Production Firebase project | `<FIREBASE_PRODUCTION_PROJECT_ID>` |

**Not:** `.firebaserc` v12.0.0-alpha veya deploy hazırlık fazında
oluşturulabilir. Gerçek project ID yazılmadan önce project Console'da
doğrulanmalıdır. Tek bir alias unutulması veya yanlış yazılması
production'a sızıntı riskidir; deploy komutu daima `--project <alias>`
ile çağrılır (bkz. [`deployment-checklist.md`](./deployment-checklist.md)
§4).

---

## 8. Config Policy

- **Firebase client config** (`apiKey`, `authDomain`, `projectId`,
  `appId`, `messagingSenderId`, `measurementId`) **private secret
  değildir** — client'a gönderildiği için saklamak güvenlik sağlamaz.
  Ancak kontrolsüz paylaşım da güvenlik **yerine geçmez.**
- **Security**, Firestore Rules + Auth + App Check üçlüsü ile sağlanır;
  config "gizliliği" üzerine kurulan hiçbir kural kabul edilmez.
- **Service account / private key / Admin SDK credential'ları asla
  repo'ya girmez.** Bunlar yalnız Cloud Functions environment veya
  GCP Secret Manager üzerinden tutulur.
- **Gerçek config değerleri** bu dokümana, commit message'lara veya
  PR description'larına **placeholder olarak** temsil edilir
  (`<FIREBASE_STAGING_API_KEY>`, `<FIREBASE_PRODUCTION_APP_ID>` gibi).
- **`shared/config/firebase.js`** repo'da **v10.0-alpha'dan beri dormant
  placeholder olarak mevcut.** Şu anda yalnız `window.MV_FIREBASE = { configured: false, config: null, note: ... }`
  global'i set eden no-op bir IIFE içerir; hiçbir HTML tarafından
  yüklenmediği için runtime etkisi yoktur. Borç paneli kendi inline
  `firebaseConfig`'ini kullanmaya devam eder
  ([`debt-panel-audit.md`](./debt-panel-audit.md) §1.5).
- v12.0.0-alpha'da yapılacak iş **yeni dosya oluşturmak değil**, bu
  mevcut dormant placeholder'ı **safe loader / Firebase config wrapper
  haline getirmek**: placeholder `apiKey: "YOUR_API_KEY"` ise init etme,
  fail-safe çalış; gerçek değerler environment-specific build veya
  Console enjeksiyonu ile gelir. Gerçek API key / config / secret bu
  fazda da yazılmaz.
- **Config eksikse init yapılmamalı, fail-safe çalışmalı** —
  [`debt-panel-audit.md`](./debt-panel-audit.md) §1.5'te borç paneli
  için tarif edilen pattern'in aynısı uygulanır.

---

## 9. Admin Whitelist Bootstrap Plan

> Bu plan v12.0.0-alpha pre-flight aşamasında Firebase Console
> üzerinden manuel olarak uygulanır. Otomatik script bu fazda yazılmaz.

- **İlk owner UID belirlenecek.** Console → Authentication → Users
  ekranından kopyalanır; UID değeri bu dokümana yazılmaz.
- **`admins/{uid}` dokümanı** manuel veya güvenli bootstrap script ile
  oluşturulacak. Manuel bootstrap (Console üzerinden) ilk fazda
  yeterlidir; script gerekirse v12.5+ ele alınır.
- **Doc içeriği** (şema [`firebase-transition-plan.md`](./firebase-transition-plan.md) §6.5):
  - `role: "owner"`
  - `active: true`
  - `email: "<OWNER_EMAIL>"`
  - `createdAt: serverTimestamp()` (manuel bootstrap'ta `Date.now()`
    yaklaşık değeri kabul; ilk write sonrası `updatedAt` ile
    serverTimestamp normalize edilir)
  - `updatedAt: serverTimestamp()`
- **Bootstrap işlemi audit log ile kayıt altına alınmalı.** İlk owner
  yazımı sonrası ilgili `adminLogs` koleksiyonuna manuel bir
  `targetType: 'admin'`, `action: 'create'`, `details: { note: 'initial owner bootstrap' }`
  kaydı eklenir (v12.5'te `adminLogs` aktive olduğunda).
- **Anonymous / non-admin write kapalı kalmalı.** Bootstrap sırasında
  bile rules `admins/*` write'ı yalnız mevcut owner için açık olmalıdır;
  ilk owner bootstrap'ında Console'un admin yetkisi kullanılır
  (Console, rules'ı bypass eder — bu mekanizma yalnız bootstrap için
  kabul edilir, başka bir kullanım için değil).
- **Backup owner** v12.0.0-alpha sonrası eklenir. Tek owner'ın
  kaybolması durumunda kilitlenme riskine karşı en geç v12.1.0 öncesi
  ikinci owner kayda alınır.

---

## 10. Debt Panel Special Setup Notes

> Borç paneli, projedeki en hassas modüldür. Firebase project setup
> sırasında **ek katmanlı** kontrol edilir.
> Referanslar: [`debt-panel-audit.md`](./debt-panel-audit.md),
> [`firebase-transition-plan.md`](./firebase-transition-plan.md) §12,
> [`deployment-checklist.md`](./deployment-checklist.md) §8.

- **Borç paneli v12.0 – v12.5 boyunca kod düzeyinde korunacak.**
  Bu setup checklist Firebase Console tarafındadır; borç paneli runtime
  kodu (`admin/borc/index.html`) etkilenmez.
- **Borç paneli mevcut Firebase kullanımı nedeniyle yanlış project /
  rules etkisi açısından ayrıca kontrol edilmeli.** Borç paneli kendi
  `firebaseConfig`'ini inline tutuyor
  ([`debt-panel-audit.md`](./debt-panel-audit.md) §1.5):
  - Eğer borç paneli **mevcut bir Firebase project** kullanıyorsa o
    project'in ID'si dokümante edilir (placeholder olarak), v12 için
    açılacak staging/production project'lerden **ayrı** kalıp kalmayacağı
    karar alınır.
  - Eğer borç paneli **v12 staging/production ile aynı project'i
    paylaşacaksa** rules namespace izolasyonu zorunludur
    ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §7
    D-11, D-12).
  - Eğer borç paneli **ayrı project'te kalacaksa** iki config birbiriyle
    karışmaz; iki ayrı `.firebaserc` alias gerekir.
- **Gerçek borç verisi staging'e taşınmayacak.** Test için
  [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §9.3
  placeholder schema'sı kullanılır.
- **Export / backup planı olmadan borç paneli refactor edilmeyecek.**
  Ayrı `docs/debt-panel-migration.md` (henüz yazılmadı) zorunlu.
- **Borç paneli collection isimleri** (mevcut: `debts`, `sysLogs` —
  bkz. [`debt-panel-audit.md`](./debt-panel-audit.md) §5.1) **plansız
  değiştirilmeyecek.** Rename = veri kaybı.
- **v12.6.0 ayrı security review fazıdır** — refactor sprint'i değil;
  bu setup checklist v12.0.0-alpha pre-flight içindir, v12.6.0'a
  ait değildir.

---

## 11. v12.0.0-alpha Pre-flight Checklist

> Bu listenin **tüm `[ ]` maddeleri `[x]` olmadan** v12.0.0-alpha
> açılmaz. [`v12-readiness.md`](./v12-readiness.md) §6 Entry Criteria
> ile birlikte tek kapı oluşturur.

- [ ] **Staging project ID** belli mi? (Console'da oluşturulmuş; ID
      `.firebaserc` için hazır)
- [ ] **Production project ID** belli mi?
- [ ] **Owner admin e-postası** belli mi?
- [ ] **Owner UID** elde edildi mi? (Console → Authentication → Users)
- [ ] **Email/password auth aktif** mi? (staging ve production'da
      ayrı ayrı doğrulandı)
- [ ] **Firestore location** seçildi mi? (staging ve production aynı
      region tercih edilir; ama gerekirse farklı olabilir — karar
      dokümante edilir)
- [ ] **Rules test planı hazır mı?**
      ([`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) ✅
      v11.5.3)
- [ ] **Deployment checklist hazır mı?**
      ([`deployment-checklist.md`](./deployment-checklist.md) ✅ v11.5.4)
- [ ] **Borç paneli korunacak** mı? (v12.0 – v12.5 boyunca dokunulmayacak
      kabul edildi mi?)
- [ ] **Firestore write açılmayacak kuralı kabul edildi** mi?
      (v12.0.0-alpha yalnız Auth; ilk write v12.1.0 sonrası)
- [ ] **`shared/config/firebase.js`** ile ilgili karar: v10.0-alpha'dan
      beri mevcut dormant placeholder genişletilecek mi (yeni dosya
      değil); gerçek API key enjekte edilmeyecek mi?
- [ ] **Rollback planı** var mı?
      ([`deployment-checklist.md`](./deployment-checklist.md) §10
      referansı)

---

## 12. What Must Not Be Committed

> Aşağıdaki değerler **hiçbir koşulda** repo'ya commit edilmez —
> ne kod, ne doküman, ne commit message, ne PR description, ne issue
> body içinde.

- **Service account JSON** dosyaları (`*-firebase-adminsdk-*.json`)
- **Private key** (RSA, ECDSA dahil herhangi bir özel anahtar)
- **Admin SDK credentials** (`service_account.json`,
  `application_default_credentials.json`)
- **Gerçek production Firebase config değerleri** (`apiKey`,
  `projectId`, `appId`, `measurementId` — placeholder zorunlu)
- **Gerçek kullanıcı UID / e-mail listesi** (owner UID dahil; placeholder
  kullanılır)
- **Gerçek borç verisi** (kayıt, isim, tutar, tarih — hiçbiri)
- **`.env` dosyaları** (`.env`, `.env.local`, `.env.production` vb. —
  `.gitignore` ile korunmalı)
- **Export edilmiş Firestore dump** (`gcloud firestore export`
  çıktıları)
- **"API key'i secret sanıp güvenlik yerine kullanma" notu** — yanlış
  güvenlik modeli. Config gizliliği güvenlik değildir; Rules + Auth +
  App Check güvenliktir (bkz. §8 ve [`firebase-transition-plan.md`](./firebase-transition-plan.md)
  §2).

> **Eğer bunlardan biri yanlışlıkla commit edildiyse:** key/secret
> derhal Firebase Console'dan **revoke** edilir, yeni key üretilir,
> repo geçmişinde temizleme (`git filter-repo` veya benzeri) ayrı
> incident olarak yönetilir. Sadece silmek yetmez; key revoke
> zorunludur.

---

## 13. Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v11.6.1 | 2026-05-23 | İlk Firebase project setup checklist. Aktif Firebase project / config yok; Console tarafındaki manuel hazırlık adımları, alias plan, config policy, admin whitelist bootstrap, borç paneli özel notları ve v12.0.0-alpha pre-flight checklist belgelendi. Hiçbir gerçek project ID / API key / UID / e-mail dokümana yazılmadı. |

Bu doküman v12.0.0-alpha açılırken canlı kullanılır; pre-flight
checklist (§11) tamamlandığında [`v12-readiness.md`](./v12-readiness.md)
§9 Go şartlarına geçilebilir. Console tarafında alınan kararlar
zamanla değişirse bu doküman güncellenir; geçmiş hali git history
üzerinden takip edilir.
