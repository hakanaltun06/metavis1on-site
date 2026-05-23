# metavis1on Documentation

Bu klasör, metavis1on projesinin mimari planlarını, geçiş notlarını ve
güvenlik politikalarını içerir. Runtime kodu değildir; uygulama fazlarına
zemin hazırlayan referans dokümanlardır.

## Current Documents

- **[Firebase Transition Plan](./firebase-transition-plan.md)**
  Firebase Auth, Firestore koleksiyonları, security rules yaklaşımı,
  v12 uygulama roadmap'i ve borç paneli için özel politika içerir.
  Aktif kod değildir; v12.x fazları için mimari rehberdir.
- **[Debt Panel Security Audit](./debt-panel-audit.md)**
  Borç panelinin mevcut gate (dış MV.auth + iç Firebase Auth), storage
  (Firestore koleksiyonları + localStorage/sessionStorage key'leri),
  yönlendirme zinciri ve güvenlik risklerini read-only şekilde
  belgeler. Refactor önerisi değil; tespit + risk kayıt dokümanıdır.
- **[Firebase Rules Test Plan](./firebase-rules-test-plan.md)**
  Firestore Security Rules için rol bazlı pozitif/negatif test
  senaryolarını, borç paneli özel testlerini ve deployment gate
  kurallarını içerir. Aktif rules dosyası değildir; v12.1.0 Firestore
  Rules foundation fazına hazırlıktır.
- **[Deployment Checklist](./deployment-checklist.md)**
  v12 Firebase ve admin değişiklikleri production'a alınmadan önce
  uygulanacak staging, deploy, smoke test ve rollback kontrol listesini
  içerir. Aktif deploy script'i değildir; operasyon kontrol
  dokümanıdır.
- **[v12 Readiness Summary](./v12-readiness.md)**
  v12.0.0-alpha Firebase Auth foundation öncesi tamamlanan hazırlıkları,
  kapsam dışı maddeleri, runtime dokunma matrisini ve geçiş kriterlerini
  özetler. v12.0.0-alpha PR'ı için karar ve kapsam dokümanıdır.
- **[Firebase Project Setup Checklist](./firebase-project-setup.md)**
  v12.0.0-alpha öncesi staging/production Firebase project hazırlığı,
  Auth provider, alias plan, config policy, admin whitelist bootstrap
  ve borç paneli özel notlarını içerir. Firebase Console tarafındaki
  manuel kontrol listesidir; gerçek project ID/API key/UID/e-mail
  dokümana yazılmaz.
- **[Firebase Local Setup & Auth Wrapper Guide](./firebase-local-setup.md)**
  Firebase local setup, Auth wrapper capability matrix, DevTools
  testing guide. v12.0.0-alpha.6 → v12.1.0-pre.1 phase log, local
  config policy, activation paths, manuel signIn / signOut /
  onChange test zincirleri, admin login/logout trial walkthrough,
  trial flag persistence + production devLogin guard scaffold,
  trial status UX (operatör görünürlüğü) + production enforce
  checklist, passive Firestore SDK readiness layer (hiçbir
  read/write/CRUD yok), troubleshooting ve next roadmap içerir.
  Gerçek credential içermez.

## Planned Documents

Aşağıdaki dokümanlar henüz yazılmadı. v12 fazlarına yaklaştıkça ya da
ihtiyaç doğdukça eklenecek:

- **Debt Panel Migration Plan** — `admin/borc/` modülünün collection
  adları, localStorage key'leri ve potansiyel Firebase taşıma adımları.
  Yalnız ayrı bir sprint açıldığında yazılır.
- **Admin Module CRUD Plan** — v12.3 sonrası announcements/events/apps
  modülleri için create/update/delete akışları, validation kuralları,
  paired adminLogs write desenleri.

## Documentation Rules

1. **Runtime dosyaları değiştirmeden önce plan yaz.** Aktif kod
   düzenlemesi başlamadan önce ilgili doküman güncel olmalı veya yeni
   doküman oluşturulmalı.
2. **Hassas veri içeren modüller için önce audit yap.** Borç paneli ve
   benzeri modüllerde refactor öncesi statik kod review zorunlu.
3. **Firebase Rules production'a alınmadan emulator/staging test
   zorunlu.** Test'siz rules deploy edilmez.
4. **Borç paneli için export/backup planı olmadan refactor yapılmaz.**
   Veri kaybı riski olan değişiklikler ayrı sprint olarak yönetilir.

## Versioning

Doküman değişiklikleri ana repo'nun [CHANGELOG.md](../CHANGELOG.md)
içinde ilgili sürüm satırı altında özetlenir. Doküman içi tarih/sürüm
notları kendi içlerinde tutulur.
