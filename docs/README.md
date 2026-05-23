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

## Planned Documents

Aşağıdaki dokümanlar henüz yazılmadı. v12 fazlarına yaklaştıkça ya da
ihtiyaç doğdukça eklenecek:

- **Debt Panel Migration Plan** — `admin/borc/` modülünün collection
  adları, localStorage key'leri ve potansiyel Firebase taşıma adımları.
  Yalnız ayrı bir sprint açıldığında yazılır.
- **Firebase Rules Test Plan** — Emulator Suite test senaryoları,
  pozitif/negatif case'ler, rollback prosedürü.
- **Admin Module CRUD Plan** — v12.3 sonrası announcements/events/apps
  modülleri için create/update/delete akışları, validation kuralları,
  paired adminLogs write desenleri.
- **Deployment Checklist** — Staging ve production'a deploy adımları,
  Firebase project ayrımı, env değişkenleri, App Check enforcement.

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
