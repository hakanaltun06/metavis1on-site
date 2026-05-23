# Changelog

Bu dosya metavis1on portalı ve admin paneli için önemli sürüm
değişikliklerini özetler. Format [Keep a Changelog](https://keepachangelog.com/)
tarzına yakındır; her satır kısa ve anlamlı bir özet sunar. Teknik
detaylar için commit history referans alınır.

---

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
