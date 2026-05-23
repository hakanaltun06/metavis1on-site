# metavis1on Firebase Transition Plan

> Bu doküman, metavis1on portalının statik/read-only yapıdan Firebase destekli
> güvenli admin yönetim sistemine geçiş planını açıklar. **Bu belge aktif kod
> değildir;** uygulama fazları için güvenlik ve veri mimarisi rehberidir.
>
> Belge sürümü: v11.4.0 · Hedef faz: v12.x

---

## İçindekiler

1. [Mevcut Durum Özeti](#1-mevcut-durum-özeti)
2. [Temel Güvenlik İlkeleri](#2-temel-güvenlik-ilkeleri)
3. [Recommended Firebase Services](#3-recommended-firebase-services)
4. [Auth Planı](#4-auth-planı)
5. [Firestore Collection Planı](#5-firestore-collection-planı)
6. [Collection Şemaları](#6-collection-şemaları)
7. [Read / Write Matrix](#7-read--write-matrix)
8. [Firestore Rules Taslak Mantığı](#8-firestore-rules-taslak-mantığı)
9. [v12 Uygulama Fazları](#9-v12-uygulama-fazları)
10. [Migration Güvenlik Checklist'i](#10-migration-güvenlik-checklisti)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Debt Panel Special Policy](#12-debt-panel-special-policy)
13. [Bu Fazda Dosya Dokunma Kısıtları](#13-bu-fazda-dosya-dokunma-kısıtları)

---

## 1. Mevcut Durum Özeti

Geçiş öncesi repo fotoğrafı (v11.3.1 itibarıyla):

- **Public portal** — `index.html`, statik v11 portal. Tüm içerik HTML/CSS/JS
  ile sunulur, sunucu tarafı render yoktur.
- **Site verileri** — `shared/config/site.js` içindeki tek global obje
  `MV_SITE`:
  - `discordInvite`
  - `themes`
  - `apps`
  - `announcements`
  - `events`
  Tüm public ve admin sayfaları bu veriyi salt okuma ile tüketir.
- **Admin dashboard** — `admin/dashboard.html`. Hero + stat kartları +
  hızlı erişim kartları + sistem durumu + sürüm timeline + read-only modül
  linkleri.
- **Read-only modüller** (v11.3.0 + v11.3.1 ile eklendi):
  - `admin/announcements.html` — `MV_SITE.announcements` listeleme + arama
  - `admin/events.html` — `MV_SITE.events` listeleme + arama
  - `admin/apps.html` — `MV.apps.forProjectsPage()` listeleme + arama
    + Public/Admin filtre
  - `admin/logs.html` — statik sürüm timeline (gerçek log değil)
- **Borç paneli** — `admin/borc/index.html`. **Ayrı ve hassas modül.** Kendi
  Firebase Auth + Firestore entegrasyonu zaten mevcuttur ve bu doküman
  fazında dokunulmaz. Dış kapı olarak `shared/js/auth.js` üzerinden bir
  oturum gate'i bulunur.
- **Auth** — `shared/js/auth.js`. Şu an `MV.auth` üzerinden:
  - `isAuthed()`, `getUser()`, `requireAdmin(loginUrl)`, `devLogin()`, `logout()`
  - SessionStorage tabanlı, 8 saat TTL.
  - **Production değildir** — `devLogin` parola doğrulaması yapmaz, yalnız
    "kullanıcı bir form doldurmuş" sinyali üretir. Migration hedefi bu
    fonksiyonu Firebase Auth wrapper'ına dönüştürmektir.
- **Firebase** — Bu doküman fazında aktif entegrasyon **yoktur**.
  `shared/config/firebase.js`, `firebase.json`, `.firebaserc` repo'da
  mevcut değildir; herhangi bir SDK script tag'i yoktur.

---

## 2. Temel Güvenlik İlkeleri

Bu ilkeler tüm v12 fazlarının üzerine inşa edileceği zemindir:

1. **Firestore Rules güvenlik merkezidir.** Frontend katmanı UX'tir;
   yetkilendirme kararları yalnız Rules tarafından verilir.
2. **Frontend kontrolü tek başına güvenlik değildir.** "Butonu gizlemek"
   bir yetkilendirme stratejisi değildir.
3. **`allow read, write: if true` kesinlikle kullanılmayacak.** Hiçbir
   geçici test, demo veya "şimdilik açalım" gerekçesiyle bu kural eklenmez.
4. **Public veriler herkes tarafından okunabilir olabilir ama yazma sadece
   admin.** "Public" sıfatı yalnız read için geçerlidir.
5. **Admin-only veriler sadece yetkili kullanıcılar tarafından okunabilir
   veya yazılabilir.** Public okuma yok.
6. **Borç paneli hassas veri** olduğu için public koleksiyonlarla
   karıştırılmaz. Aynı document path'leri altında konumlandırılmaz.
7. **Admin whitelist olmadan write açılmayacak.** Yetkilendirme her zaman
   sunucu tarafında doğrulanır (`request.auth.uid` üzerinden).
8. **Her write işleminde `serverTimestamp` kullanılacak.** Client clock
   güvenli değildir.
9. **Her kritik işlem `adminLogs` koleksiyonuna yazılacak.** Audit izi
   olmadan write açılmaz.
10. **Least-privilege**: roller (`owner`/`admin`/`viewer`) yalnız ihtiyaç
    duyduğu yetkiyi alır. `viewer` yazamaz.

---

## 3. Recommended Firebase Services

| Servis | Durum | Not |
|---|---|---|
| **Firebase Authentication** | Zorunlu | Admin login. İlk fazda email/password yeterli. |
| **Cloud Firestore** | Zorunlu | İçerik koleksiyonları ve admin verileri. |
| **Firebase Security Rules** | Zorunlu | Tüm yetkilendirmenin merkezi. |
| **Firebase Hosting** | Opsiyonel | Kullanılabilir ama mevcut hosting yapısı (custom CNAME) korunabilir. |
| **Firebase Storage** | Şimdilik gerekmez | Görsel asset'ler repo içinde; ihtiyaç doğarsa eklenir. |
| **Cloud Functions** | İleri faz | Sunucu yan validation, scheduled cleanup, webhook gibi senaryolar için v12.5+ aşamasında değerlendirilir. |
| **App Check** | Önerilir | Public read'lerin abuse'unu sınırlandırmak için. |

---

## 4. Auth Planı

### 4.1 Login akışı

- Admin login Firebase Auth ile yapılacak.
- İlk aşamada **email/password** yeterli; OAuth (Google/GitHub) ileride
  ek provider olarak eklenebilir.
- Mevcut `admin/index.html` form alanları korunur; `MV.auth.devLogin`
  fonksiyonu `signInWithEmailAndPassword` çağrısına dönüşür.
- Başarılı login sonrası `dashboard.html`'e redirect davranışı korunur.
- Eski dev gate (SessionStorage) production'da kapatılır;
  yalnız emulator ve local dev için flag'lenir.

### 4.2 Admin yetkisi yönetimi

İki yaklaşım var, **başlangıç için Firestore tabanlı daha basit**:

**Başlangıç (v12.0 – v12.4):** Firestore `admins/{uid}` koleksiyonu
- `email`
- `role` — `'owner' | 'admin' | 'viewer'`
- `active` — bool
- `createdAt`, `updatedAt` — serverTimestamp

**Kurumsal (v12.5+):** Custom Claims
- Admin rolü Cloud Functions ile `auth.token.role` üzerinden set edilir.
- Rules `request.auth.token.role == 'admin'` ile kontrol eder.
- Avantaj: Rule içinde ek Firestore okuması yok (cost + latency).
- Geçiş: Firestore koleksiyonu hala yedek olarak tutulur.

### 4.3 Admin rolleri

| Rol | Read | Write | Yönetim |
|---|---|---|---|
| `owner` | Tümü | Tümü | `admins` koleksiyonu dahil |
| `admin` | İçerik + adminLogs | İçerik + adminLogs | `admins`'i değiştiremez |
| `viewer` | İçerik + adminLogs | — | — |

`viewer` rolü, yardımcı yöneticilere salt görüntüleme erişimi vermek için
ayrılmıştır; v12.0'da zorunlu değildir, v12.5'te aktif edilir.

### 4.4 Session ve oturum süresi

- Firebase Auth varsayılan session davranışı kullanılır
  (`browserLocalPersistence` veya `browserSessionPersistence`).
- Mevcut 8 saatlik SessionStorage TTL'i, Firebase tarafına geçişte
  Firebase'in kendi `idToken` expiry zincirine devredilir.
- "Oturumu sürdür" checkbox'ı opsiyonel; default `session` persistence
  güvenlidir.

---

## 5. Firestore Collection Planı

Top-level koleksiyonlar:

```
firestore/
├── publicConfig/site         (doc)  → MV_SITE benzeri ortak ayarlar
├── announcements/{id}        (col)  → Duyuru kayıtları
├── events/{id}               (col)  → Etkinlik kayıtları
├── apps/{id}                 (col)  → Uygulama bağlantıları
├── adminLogs/{id}            (col)  → Audit log akışı
├── admins/{uid}              (col)  → Admin whitelist
└── systemStatus/{key}        (col)  → Tek doc 'main' olabilir
```

**Borç paneli koleksiyonları** mevcut yapısını koruyacak; bu doküman
kapsamında ne adlandırma ne şema değişikliği önerilmez (bkz.
[§12 Debt Panel Special Policy](#12-debt-panel-special-policy)).

---

## 6. Collection Şemaları

> Tüm tarih alanları `serverTimestamp` ile yazılır. `id` document path'in
> kendisidir; document body'sinde tutulmak istenirse `id` field'ı duplike
> olarak yazılabilir (denormalize).

### 6.1 `announcements`

| Field | Tip | Açıklama |
|---|---|---|
| `id` | string | doc id (denormalize) |
| `title` | string | Kart başlığı |
| `description` | string | İçerik metni |
| `type` | string | `'info' \| 'update' \| 'warning'` |
| `status` | string | `'draft' \| 'published' \| 'archived'` |
| `isPublished` | bool | `status === 'published'` derived |
| `order` | number | Listeleme sırası (asc) |
| `createdAt` | timestamp | serverTimestamp |
| `updatedAt` | timestamp | serverTimestamp |
| `createdBy` | string | admin uid |
| `updatedBy` | string | admin uid |

### 6.2 `events`

| Field | Tip | Açıklama |
|---|---|---|
| `id` | string | doc id |
| `title` | string | Etkinlik başlığı |
| `description` | string | Detay metni |
| `date` | timestamp | Etkinlik tarihi (UTC) |
| `time` | string | "21:00" formatı (display) |
| `location` | string | "Discord", "Tetris/GRID" gibi |
| `status` | string | `'Planlandı' \| 'Yakında' \| 'Hazırlık' \| 'İptal' \| 'Tamamlandı'` |
| `isPublished` | bool | Public listede görünür mü |
| `order` | number | Listeleme sırası |
| `createdAt` | timestamp | serverTimestamp |
| `updatedAt` | timestamp | serverTimestamp |
| `createdBy` | string | admin uid |
| `updatedBy` | string | admin uid |

### 6.3 `apps`

| Field | Tip | Açıklama |
|---|---|---|
| `id` | string | doc id (örn. `visiocial`, `tetris`, `grid`, `borc`) |
| `name` | string | Görünür ad |
| `description` | string | Kısa açıklama |
| `url` | string | Hedef URL (relative veya absolute) |
| `category` | string | `'Sosyal' \| 'Mini Oyun' \| 'Puzzle' \| 'Yönetim'` |
| `status` | string | `'prototype' \| 'stable' \| 'production'` |
| `visibility` | string | `'public' \| 'admin' \| 'hidden'` |
| `isPublic` | bool | `visibility === 'public'` derived |
| `isFeatured` | bool | Vitrine vurgulu çıkma |
| `order` | number | Listeleme sırası |
| `accent` | string | `'cyan' \| 'purple' \| 'gold' \| 'red'` |
| `glyph` | string | Glyph karakteri (`◈`, `▦`, `▩`, `₺`) |
| `createdAt` | timestamp | serverTimestamp |
| `updatedAt` | timestamp | serverTimestamp |

### 6.4 `adminLogs`

| Field | Tip | Açıklama |
|---|---|---|
| `id` | string | doc id (auto) |
| `action` | string | `'create' \| 'update' \| 'delete' \| 'login' \| 'logout'` |
| `targetType` | string | `'announcement' \| 'event' \| 'app' \| 'admin' \| 'system'` |
| `targetId` | string \| null | Etkilenen doc id |
| `adminUid` | string | İşlemi yapan admin uid |
| `adminEmail` | string | Snapshot (uid'den ayrı kayıt) |
| `createdAt` | timestamp | serverTimestamp |
| `details` | map | İsteğe bağlı: `{ before, after, note }` |

### 6.5 `admins`

| Field | Tip | Açıklama |
|---|---|---|
| `uid` | string | doc id = uid (denormalize) |
| `email` | string | Login email |
| `role` | string | `'owner' \| 'admin' \| 'viewer'` |
| `active` | bool | Devre dışı ama silinmemiş admin |
| `createdAt` | timestamp | serverTimestamp |
| `updatedAt` | timestamp | serverTimestamp |

### 6.6 `systemStatus` (tek doc: `main`)

| Field | Tip | Açıklama |
|---|---|---|
| `portalStatus` | string | `'active' \| 'maintenance' \| 'incident'` |
| `lastDeploy` | timestamp | Son canlıya çıkış |
| `currentVersion` | string | `'v11.4.0'` benzeri |
| `maintenanceMode` | bool | Public site banner trigger |
| `updatedAt` | timestamp | serverTimestamp |

---

## 7. Read / Write Matrix

| Area | Public Read | Admin Read | Admin Write |
|---|:---:|:---:|:---:|
| `announcements` (published) | ✅ | ✅ | ✅ |
| `announcements` (draft/archived) | ❌ | ✅ | ✅ |
| `events` (published) | ✅ | ✅ | ✅ |
| `events` (draft/archived) | ❌ | ✅ | ✅ |
| `apps` (public visibility) | ✅ | ✅ | ✅ |
| `apps` (admin visibility) | ❌ | ✅ | ✅ |
| `apps` (hidden) | ❌ | ✅ | ✅ |
| `adminLogs` | ❌ | ✅ | ✅ (auto, no manual edit) |
| `admins` | ❌ | ❌ (owner only) | ❌ (owner only) |
| `systemStatus` | ✅ (maintenance banner) | ✅ | ✅ |
| `publicConfig/site` | ✅ | ✅ | ✅ |
| **Borç paneli verisi** | ❌ | yetkili admin | yetkili admin |

Mantık:
- Published public içerik herkes tarafından okunabilir.
- Admin-only ve draft veriler **kesinlikle** public okunamaz.
- Yazma her durumda yalnız admin (whitelisted uid).
- `adminLogs` admin write açıktır ama **mevcut log düzenlenemez** — yalnız
  create-only (`allow create: ...; allow update, delete: if false`).
- `admins` koleksiyonu yalnız owner yazabilir; viewer okuyamaz.
- Borç paneli yetkili admin alt kümesi tarafından kapsanır
  (bkz. §12).

---

## 8. Firestore Rules Taslak Mantığı

> ⚠️ **UYARI:** Aşağıdaki blok **production-ready bir kural seti değildir.**
> Yalnız mantık taslağıdır (pseudocode). Production'a alınmadan önce:
>
> 1. Firebase Emulator Suite ile test yazılmalıdır.
> 2. Negatif test'ler (yetkisiz kullanıcı, yanlış role) ile doğrulanmalıdır.
> 3. Code review'dan geçmelidir.
> 4. Staging projesine deploy edilip canlı test yapılmalıdır.

```
// PSEUDOCODE — bu blok doğrudan kopyalanıp production'a alınamaz.
rules_version = '2';

service cloud.firestore {
  match /databases/{db}/documents {

    // ---- Helpers ----
    function signedIn() {
      return request.auth != null;
    }
    function isAdmin() {
      return signedIn()
        && exists(/databases/$(db)/documents/admins/$(request.auth.uid))
        && get(/databases/$(db)/documents/admins/$(request.auth.uid)).data.active == true
        && get(/databases/$(db)/documents/admins/$(request.auth.uid)).data.role in ['owner','admin'];
    }
    function isOwner() {
      return signedIn()
        && exists(/databases/$(db)/documents/admins/$(request.auth.uid))
        && get(/databases/$(db)/documents/admins/$(request.auth.uid)).data.role == 'owner';
    }

    // ---- Public published read + admin write ----
    match /announcements/{docId} {
      allow read:   if resource.data.isPublished == true || isAdmin();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    match /events/{docId} {
      allow read:   if resource.data.isPublished == true || isAdmin();
      allow write:  if isAdmin();
    }

    match /apps/{docId} {
      allow read:   if resource.data.visibility == 'public' || isAdmin();
      allow write:  if isAdmin();
    }

    // ---- adminLogs: create-only, admin read ----
    match /adminLogs/{docId} {
      allow read:   if isAdmin();
      allow create: if isAdmin();
      allow update: if false;
      allow delete: if false;
    }

    // ---- admins: yalnız owner ----
    match /admins/{uid} {
      allow read:  if isOwner();
      allow write: if isOwner();
    }

    // ---- systemStatus: public read, admin write ----
    match /systemStatus/{key} {
      allow read:  if true;
      allow write: if isAdmin();
    }

    // ---- publicConfig: public read, admin write ----
    match /publicConfig/{key} {
      allow read:  if true;
      allow write: if isAdmin();
    }

    // ---- Borç paneli: ayrı policy, bu doküman kapsamında değil ----
    // Mevcut admin/borc/ rules'u korunur ve ayrı review döngüsünde
    // denetlenir. Burada placeholder bile yazılmaz, çünkü mevcut path
    // ve yapı bilinmeden bir kural yazmak risktir.
  }
}
```

**Yasaklı patternler:**

- `allow read, write: if true;`
- `allow write: if request.auth != null;` (sadece signedIn yeterli değildir, isAdmin gereklidir)
- Wildcard `match /{document=**}` kuralının `allow write: if isAdmin()` ile bile genel açılması — explicit collection scoping tercih edilir.

---

## 9. v12 Uygulama Fazları

Her faz **bağımsız commit'lenebilir** ve önceki fazı bozmaz.

### v12.0.0 — Firebase Auth foundation

- `shared/config/firebase.js` oluşturulur (boş şablon → gerçek config env'den enjekte).
- `firebase-app` + `firebase-auth` SDK script tag'leri yalnız admin sayfalarında.
- `shared/js/auth.js` içine Firebase Auth wrapper'ı eklenir; `MV.auth.devLogin` → `signInWithEmailAndPassword`.
- Admin whitelist (`admins/{uid}`) Firestore koleksiyonu manuel olarak doldurulur.
- Eski dev gate yalnız emulator için kalır; production'da disable flag.
- **Bu fazda hala Firestore okuma yok**; sadece login + identity.

### v12.1.0 — Firestore Rules foundation

- Firestore enabled.
- Security rules §8 taslağından test edilebilir hale getirilir.
- **Firebase Emulator Suite** ile rules test'leri yazılır:
  - Anonim user write reddediliyor mu?
  - `viewer` rolü write reddediliyor mu?
  - `admins/*` non-owner için okunamıyor mu?
- Public read / admin write ayrımı staging'de test edilir.
- Production'a deploy yalnız test geçtikten sonra.

### v12.2.0 — Announcements + Events Firebase read

- Public site (`index.html`) Firestore'dan okuma yapar (`announcements`, `events`).
- Admin modülleri (`announcements.html`, `events.html`) **read-only Firebase'den** okur.
- **Fallback olarak `MV_SITE.announcements` ve `MV_SITE.events` korunur** (network/auth hatasında graceful degradation).
- v11.3.x'teki client-side arama davranışı korunur.

### v12.3.0 — Admin CRUD for announcements/events

- Create / update / delete akışı eklenir.
- Form validation (client + rules).
- Her write `adminLogs`'a kayıt atar (paired transaction).
- Soft delete tercih edilir (`status: 'archived'`).
- Public site Firestore üzerinden anlık güncellenir.

### v12.4.0 — Apps management

- Uygulama kartları Firestore'dan gelir.
- Admin panelden ekleme/güncelleme/sıralama.
- `visibility` toggle (public/admin/hidden).
- Borç paneli kartı **özel davranışla** işaretlenir; URL ve oturum kapısı değiştirilmez.

### v12.5.0 — Admin logs + audit

- Gerçek `adminLogs` koleksiyonu admin dashboard'a bağlanır.
- Filter / search / pagination.
- Custom claims migration'ı bu fazda başlatılabilir.

### v12.6.0 — Borç paneli security review

- Mevcut `admin/borc/` collection ve rules denetlenir.
- Export / backup stratejisi hazırlanır.
- **Refactor yok**, yalnız audit raporu üretilir.
- Bulgular ayrı issue/PR olarak takip edilir.

---

## 10. Migration Güvenlik Checklist'i

Her v12.x deploy'undan önce işaretlenecek:

- [ ] Firebase project ayarları kontrol edildi mi? (staging + production ayrı)
- [ ] Auth provider aktif mi? (email/password en az)
- [ ] Admin UID whitelist var mı? (`admins/{uid}` doc'ları mevcut ve `active: true`)
- [ ] Firestore Rules emulator'da test edildi mi?
- [ ] Public kullanıcı write yapamıyor mu? (negatif test pass)
- [ ] Admin olmayan kullanıcı admin koleksiyonlarını okuyamıyor mu?
- [ ] Borç verisi public read'le karışmıyor mu? (path izolasyonu doğrulandı)
- [ ] Her write `adminLogs`'a yazılıyor mu? (paired write test)
- [ ] Backup/export planı var mı? (`gcloud firestore export` veya scheduled)
- [ ] Rollback planı var mı? (önceki rules versiyonuna geri dönüş prosedürü)
- [ ] App Check etkin mi? (en az enforcement mode kontrolü)
- [ ] Staging'de en az 1 hafta gözlem yapıldı mı?

---

## 11. Risks & Mitigations

| Risk | Etki | Önlem |
|---|---|---|
| Yanlış Firestore Rules | Veri sızıntısı / public yazma | Emulator test, rules review, küçük fazlar |
| Admin olmayan kullanıcının write yapabilmesi | Veri bütünlüğü bozulur | Negatif test, App Check, `isAdmin()` zorunlu |
| Borç paneli verisinin yanlışlıkla public okunması | Hassas finans verisi sızıntısı | Path izolasyonu, ayrı rules namespace, kod review |
| Sadece frontend guard'a güvenmek | Saldırgan direkt API çağırır | Rules tek doğru kaynak; frontend yalnız UX |
| Veri şeması değişirken public sitenin bozulması | LCP / runtime hata | `MV_SITE` fallback'i koru, küçük migration scriptleri, feature flag |
| Migration sırasında çift okuma (legacy + Firestore) drift'i | İçerik uyumsuzluğu | Tek kaynağı bir noktada keskin geçiş; geçiş fazında write yalnız Firestore |
| Custom claims yanlış set edilmesi | Yetki yükselmesi | Yalnız Cloud Function ile claim yaz, manuel admin SDK yasak |
| Backup yokken büyük refactor | Geri dönülemez veri kaybı | Refactor öncesi mutlaka `gcloud firestore export` |
| Anonim/test admin hesabı production'da kalması | Backdoor | Whitelist sıkı tutulur, `active: false` ile soft-remove + log |

---

## 12. Debt Panel Special Policy

Borç paneli (`admin/borc/index.html`) bu projenin **en hassas modülüdür**.
v12 fazlarının hiçbiri bu modülü ana migration zincirine dahil etmez.

**Politika maddeleri:**

1. **Borç paneli, diğer public content koleksiyonlarıyla karıştırılmayacak.**
   Aynı top-level path altında document yazılmaz, aynı rules namespace
   paylaşılmaz.
2. **Borç paneli hassas veri kabul edilecek.** Kişisel bilgiler, finansal
   tutarlar, tarihler içerebilir.
3. **Mevcut çalışan `admin/borc/index.html` faz dışı bırakılacak.**
   v11 boyunca dokunulmadığı gibi, v12.0 – v12.5 aralığında da kod
   düzeyinde dokunulmaz.
4. **Firebase geçişinde önce sadece rules/security review yapılacak**
   (v12.6.0). Bu review sırasında:
   - Mevcut collection adları haritalanır.
   - Mevcut rules okunur ve risk haritası çıkarılır.
   - Export/backup stratejisi yazılır.
5. **Veri export/backup olmadan büyük refactor yapılmayacak.**
   Refactor önerisi ortaya çıkarsa ayrı issue + ayrı doküman + ayrı sprint
   ile yönetilir.
6. **Collection adları ve localStorage key'leri değiştirilmeden önce
   ayrı migration plan yazılacak.** Bu doküman değil; v12.6+ için ayrı
   `docs/debt-panel-migration.md` üretilir.
7. **Dış kapı (`shared/js/auth.js` gate'i) Firebase Auth'a geçerken
   borç panelinin iç kapısı bozulmamalı.** İki katmanlı koruma her zaman
   aktif kalır.
8. **Borç panelinin Firestore'a alınması bu doküman kapsamında
   önerilmemektedir.** Mevcut yapı çalışıyorsa, "Firebase'e taşımak için"
   refactor yapılmaz. Yalnız güvenlik açığı tespit edilirse müdahale.

---

## 13. Bu Fazda Dosya Dokunma Kısıtları

> Bu v11.4.0 fazında **hiçbir runtime dosyası değiştirilmedi.**
> Yalnız `docs/firebase-transition-plan.md` oluşturuldu.
>
> Aşağıdaki dosyalar bu fazda **dokunulmaz** kalır:
>
> - `index.html` (public ana sayfa)
> - `admin/borc/index.html` (borç paneli)
> - `borc.html` (redirect)
> - `archive/*`
> - `tetris.html`, `game.html`, `visiocial.html`
> - `shared/config/site.js`
> - `shared/js/*`
> - `shared/css/*`
> - `admin/*.html` (login, dashboard, modüller)
> - `admin/admin-modules.css`
> - `robots.txt`, `sitemap.xml`, `site.webmanifest`
> - `assets/*`
>
> Bu liste, v12.0.0 fazının ilk PR'ında değişebilir; gerçek dosya
> dokunma izinleri o fazda yeniden belirlenir.

---

## Sürüm notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v11.4.0 | 2026-05-23 | İlk taslak. Aktif kod yok, mimari plan. |

Bu doküman canlı bir referanstır — v12.x fazları başladığında her sürümle
güncellenebilir. Mevcut bölümlerin geçmiş hali git history üzerinden
takip edilir.
