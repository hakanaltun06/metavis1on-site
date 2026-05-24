# Firestore Data Model (Contract Draft)

> Bu doküman metavis1on **v12 Firestore koleksiyonlarının alan tablosu**
> ve veri konvansiyonlarıdır. **Aktif runtime kod değildir;** koleksiyon
> şemaları + status değerleri + timestamp / createdBy yaklaşımı için
> tek noktaya bakılabilir referanstır.
>
> Belge sürümü: v12.1.0-pre.2 · Hedef faz: v12.1.0+
>
> Bağlantılı dokümanlar:
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) §5 (collection planı) ve §6 (orijinal şemalar — bu doküman onu konsolide eder).
> - [`firebase-admin-authorization.md`](./firebase-admin-authorization.md) — `admins/{uid}` allowlist sözleşmesi.
> - [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §3–§4 — test edilecek alanlar ve read/write matrisi.
> - [`../firestore.rules`](../firestore.rules) — bu modele eşlik eden foundation draft.

---

## İçindekiler

1. [Kapsam](#1-kapsam)
2. [Tasarım Konvansiyonları](#2-tasarım-konvansiyonları)
3. [Koleksiyon Listesi (Genel Bakış)](#3-koleksiyon-listesi-genel-bakış)
4. [`admins/{uid}`](#4-adminsuid)
5. [`announcements/{id}`](#5-announcementsid)
6. [`events/{id}`](#6-eventsid)
7. [`apps/{id}`](#7-appsid)
8. [`adminLogs/{id}`](#8-adminlogsid)
9. [`publicConfig/{key}` ve `systemStatus/{key}`](#9-publicconfigkey-ve-systemstatuskey)
10. [Status Değerleri](#10-status-değerleri)
11. [Timestamp Yaklaşımı](#11-timestamp-yaklaşımı)
12. [`createdBy` / `updatedBy` Yaklaşımı](#12-createdby--updatedby-yaklaşımı)
13. [Gelecek Koleksiyonlar](#13-gelecek-koleksiyonlar)
14. [Sürüm Notu](#14-sürüm-notu)

---

## 1. Kapsam

- Bu doküman **şema sözleşmesidir.** Hangi koleksiyon hangi alanları
  taşır, alan tipleri ne, status değerleri sınırlı küme mi —
  bunları belgeler.
- **Hangi rol hangi alana erişebilir** sorusu bu dokümanın kapsamında
  değil; o cevap [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md)
  §4 read/write matrisi ve [`../firestore.rules`](../firestore.rules)
  içinde yaşar.
- **Runtime read/write yok.** v12.1.0-pre.2'de hiçbir koleksiyon
  okunmaz ya da yazılmaz; bu sözleşme v12.1.0 rules deploy + v12.2+
  read + v12.3+ CRUD fazlarının zeminidir.

---

## 2. Tasarım Konvansiyonları

- **Doc ID'leri.** `admins/{uid}` Firebase Auth UID'i; diğer
  koleksiyonlar Firestore auto-id veya iş anahtarı (örn.
  `systemStatus/main`) kullanır. Zaman damgalı slug'lar tercih
  edilmez (sıralama timestamp alanı üzerinden yapılır).
- **Tipler sade tutulur.** string, number, boolean, timestamp,
  map (object), array. Geometry / reference alanları bu fazda yok.
- **Boolean flag'ler `is` veya `active` prefix'iyle.** `isPublished`,
  `isPinned`, `active`. "1/0 string" veya "yes/no string" kabul edilmez.
- **Status alanı sınırlı küme.** §10'daki tablo dışında bir değer
  kabul edilmez. Rules type-checking bu enum'ları v12.3+ zorunlu
  kılabilir.
- **Timestamp = `serverTimestamp()`.** Client clock'una güvenilmez;
  §11'e bakın.
- **Soft-delete varsayılan.** Hard-delete sadece açık politika
  istisnalarında; bkz. §8 (adminLogs immutable) ve `admins` (§5
  authorization doc'unda soft-delete kuralı).
- **Borç paneli kapsam dışı.** v12.0–v12.5 boyunca dokunulmaz.

---

## 3. Koleksiyon Listesi (Genel Bakış)

| Koleksiyon | Amaç | Faz | Foundation rules durumu |
|---|---|---|---|
| `admins/{uid}` | Admin allowlist + rol/active yönetimi. | v12.1.0-pre.2 sözleşme; v12.1.0 deploy. | Self-read + owner-write tanımlı. |
| `announcements/{id}` | Duyurular (public + draft). | v12.2+ read, v12.3+ CRUD. | Tamamen kapalı. |
| `events/{id}` | Etkinlikler (public + draft). | v12.2+ read, v12.3+ CRUD. | Tamamen kapalı. |
| `apps/{id}` | Apps listesi (public + admin-only). | v12.2+ read, v12.3+ CRUD. | Tamamen kapalı. |
| `adminLogs/{id}` | Audit log akışı. | v12.3+ paired write. | Tamamen kapalı. |
| `publicConfig/{key}` | Public site ortak ayarlar (MV_SITE muadili). | v12.2+ public read. | Tamamen kapalı. |
| `systemStatus/{key}` | Maintenance banner / portal durumu. | v12.2+ public read. | Tamamen kapalı. |
| Debt panel koleksiyonları | (out of scope) | v12.6+ ayrı sprint. | Bu modele dahil değil. |

---

## 4. `admins/{uid}`

Detaylı sözleşme: [`firebase-admin-authorization.md`](./firebase-admin-authorization.md) §3.

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `uid` | string | ✅ | Doc ID ile birebir eşit; Firebase Auth UID. |
| `email` | string | ✅ | Bilgi amaçlı kopya; rules `request.auth.token.email` kullanır. |
| `role` | string (enum) | ✅ | `'owner'` | `'admin'` | `'editor'` | `'viewer'`. |
| `active` | boolean | ✅ | `false` → soft-deleted; isActiveAdmin gate kapanır. |
| `createdAt` | timestamp | ✅ | `serverTimestamp()`. |
| `updatedAt` | timestamp | ✅ | `serverTimestamp()` (her update'te tazelenir). |
| `notes` | string | ❌ | Kısa not; hassas bilgi içermez. |

**Schema sınırı:** parola / token / secret saklanmaz; tam ad / telefon
gibi şahsi veri eklenmez.

---

## 5. `announcements/{id}`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `title` | string | ✅ | Başlık. Maks ~200 karakter (rules length check v12.3+). |
| `body` | string | ✅ | İçerik (Markdown veya plain). |
| `status` | string (enum) | ✅ | `'draft'` | `'published'` | `'archived'`. Bkz. §10. |
| `pinned` | boolean | ❌ | UI'de üste sabitleme; default `false`. |
| `publishedAt` | timestamp | ❌ | `status: 'published'` olduğunda `serverTimestamp()`. Sıralama için. |
| `createdAt` | timestamp | ✅ | `serverTimestamp()`. |
| `updatedAt` | timestamp | ✅ | `serverTimestamp()`. |
| `createdBy` | string (uid) | ✅ | Yazan kullanıcının Firebase Auth UID'i. Bkz. §12. |
| `updatedBy` | string (uid) | ❌ | Son düzenleyenin UID'i (varsa). |

**Notlar.** `isPublished: boolean` yerine `status` enum'u tercih edilir
(draft / published / archived ayrımı tek alanda). [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md)
§4 matrisinde "draft announcements" ve "published announcements"
ayrımı bu alana bağlanır.

---

## 6. `events/{id}`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `title` | string | ✅ | Etkinlik başlığı. |
| `date` | timestamp | ✅ | Etkinlik tarihi/saati. Sıralama + filtre için. |
| `location` | string | ❌ | Yer (varsa). |
| `description` | string | ✅ | Açıklama. |
| `status` | string (enum) | ✅ | `'draft'` | `'published'` | `'cancelled'` | `'archived'`. |
| `createdAt` | timestamp | ✅ | `serverTimestamp()`. |
| `updatedAt` | timestamp | ✅ | `serverTimestamp()`. |
| `createdBy` | string (uid) | ✅ | Yazan kullanıcı UID'i. |
| `updatedBy` | string (uid) | ❌ | Son düzenleyen UID'i. |

**Notlar.** `cancelled` status'ü `archived`'dan farklıdır: cancelled
etkinlik UI'de hâlâ görünür (üzerine çizilmiş şekilde), archived
ise listeden düşer.

---

## 7. `apps/{id}`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `name` | string | ✅ | Uygulama adı. |
| `description` | string | ✅ | Kısa açıklama. |
| `url` | string | ✅ | Hedef URL. v12.3+ rules'da format validation (https only). |
| `status` | string (enum) | ✅ | `'active'` | `'admin-only'` | `'archived'`. Bkz. §10. |
| `order` | number | ✅ | Sıralama ağırlığı (artan). Default 100. |
| `createdAt` | timestamp | ✅ | `serverTimestamp()`. |
| `updatedAt` | timestamp | ✅ | `serverTimestamp()`. |
| `createdBy` | string (uid) | ✅ | Yazan kullanıcı UID'i. |
| `updatedBy` | string (uid) | ❌ | Son düzenleyen UID'i. |

**Notlar.** `status: 'admin-only'` apps public read'e kapalıdır;
yalnız viewer + üstü roller görür. Public site `status: 'active'`
kayıtlarını okur (v12.2+).

---

## 8. `adminLogs/{id}`

Audit log akışı. Append-only; mevcut log **düzenlenemez ve silinemez**.

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `action` | string | ✅ | Eylem adı (örn. `'announcement.create'`, `'event.update'`, `'apps.delete'`). Dot-notation kullanılır. |
| `actorUid` | string | ✅ | Eylemi yapan kullanıcı UID'i (`request.auth.uid`). |
| `actorEmail` | string | ✅ | Eylemi yapan kullanıcı e-posta'sı (`request.auth.token.email`). |
| `targetType` | string | ✅ | Hedef koleksiyon (örn. `'announcements'`, `'events'`, `'apps'`, `'admins'`). |
| `targetId` | string | ✅ | Hedef doc ID. |
| `createdAt` | timestamp | ✅ | `serverTimestamp()`. |
| `metadata` | map | ❌ | Eyleme özel ek alanlar (örn. `{ before: {...}, after: {...} }`). |

**Immutability.** v12.3+ rules:

- `allow create`: `isActiveAdmin()` + zorunlu alan validation + paired
  write context.
- `allow read`: `isActiveAdmin()` (viewer + üstü).
- `allow update, delete`: forever `false`.

**Paired write deseni.** İçerik koleksiyonuna yapılan her write,
aynı transaction içinde `adminLogs` create üretmelidir. Bu desen
v12.3+ CRUD fazında rules tarafından zorlanır; v12.1.0-pre.2
sözleşmesinde yalnız beklenti olarak listelenir.

**Naming notu.** Bazı yerel referanslarda kısaca "logs" diye geçer
(örn. `admin/logs.html` UI scaffold'u v11.3.0). Canonical collection
adı `adminLogs`'tur; `logs` adlandırması yalnız UI sayfasında bir
kısayoldur.

---

## 9. `publicConfig/{key}` ve `systemStatus/{key}`

İki "tek doc" benzeri koleksiyon. Konvansiyon: tek bir merkezi doc
(`publicConfig/site`, `systemStatus/main`) + ileride gerekirse
çoklu key.

### `publicConfig/site`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `siteName` | string | ❌ | Public site ismi. |
| `tagline` | string | ❌ | Alt başlık. |
| `socialLinks` | map | ❌ | `{ twitter, instagram, ... }`. |
| `featureFlags` | map | ❌ | `{ key: boolean }`. Public site tarafında okunur. |
| `updatedAt` | timestamp | ✅ | `serverTimestamp()`. |
| `updatedBy` | string (uid) | ❌ | Son düzenleyen UID'i. |

Public read için planlanmıştır (v12.2+); admin tarafı write.
`MV_SITE` (`shared/config/site.js`) gelecekte bu doc'u beslemek için
veri kaynağı kabul edilebilir.

### `systemStatus/main`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `portalStatus` | string (enum) | ✅ | `'active'` | `'maintenance'` | `'offline'`. |
| `maintenanceMode` | boolean | ✅ | Banner için hızlı flag. |
| `message` | string | ❌ | Maintenance banner metni. |
| `updatedAt` | timestamp | ✅ | `serverTimestamp()`. |
| `updatedBy` | string (uid) | ❌ | Son düzenleyen UID'i. |

Public read (banner için herkes okur); admin write.

---

## 10. Status Değerleri

Status enum'ları için izin verilen değerler (foundation sözleşmesi —
rules tarafı validation v12.3+ ile zorlanır):

| Koleksiyon | İzin verilen status değerleri |
|---|---|
| `announcements` | `'draft'`, `'published'`, `'archived'` |
| `events` | `'draft'`, `'published'`, `'cancelled'`, `'archived'` |
| `apps` | `'active'`, `'admin-only'`, `'archived'` |
| `admins` (via `active`) | `true`, `false` (status değil; soft-delete flag) |
| `systemStatus.portalStatus` | `'active'`, `'maintenance'`, `'offline'` |

**Kural:** yeni bir status değeri eklenmeden önce bu tablo + ilgili
rules + ilgili UI eşzamanlı güncellenir. Tek taraflı eklemeler
veri tutarsızlığına yol açar.

---

## 11. Timestamp Yaklaşımı

- **Yazma:** `serverTimestamp()` ile yazılır (Firebase Auth tarafının
  client clock'una güvenilmez). Client'tan gelen `Date.now()` değeri
  rules tarafında ileride reddedilebilir (`request.time` ile karşılaştırma).
- **Okuma:** Firestore Timestamp objesi (`.toDate()`, `.seconds`,
  `.nanoseconds`). UI tarafında `Intl.DateTimeFormat` kullanılır;
  ham saniye değeri ekrana basılmaz.
- **Sıralama:** koleksiyona göre değişir.
  - `announcements`: `pinned: true` üstte, sonra `publishedAt` (varsa),
    sonra `createdAt` (descending).
  - `events`: `date` ascending (yakın etkinlik üstte).
  - `apps`: `order` ascending (manuel sıralama ağırlığı).
  - `adminLogs`: `createdAt` descending (en yeni log üstte).
- **Index gereksinimi.** Sıralama + filtre kombinasyonları
  `firestore.indexes.json` ihtiyacı doğurur. v12.2+ read fazına kadar
  index dosyası repo'ya eklenmez.

---

## 12. `createdBy` / `updatedBy` Yaklaşımı

- **Tip.** string, Firebase Auth UID. E-posta değil (e-posta değişebilir,
  UID kalıcıdır).
- **Yazılma anı.** İlgili koleksiyona create yapan client,
  `request.auth.uid`'i bu alana yazar. Rules tarafı v12.3+ doğrulama:
  `request.resource.data.createdBy == request.auth.uid` zorunlu.
- **`updatedBy`.** Opsiyonel; yalnız update'lerde tazelenir. Doc'un
  tarihçesini takip etmek için faydalı.
- **`createdBy` neden e-posta değil?** Firebase Auth UID immutable;
  email değişebilir. Audit izini UID üzerinden tutmak güvenlidir.
  Eşlemek için `admins/{uid}` doc'undan email çekilir.
- **`adminLogs` farkı.** `adminLogs` doc'unda `actorUid` + `actorEmail`
  ayrı tutulur (eylem anındaki e-posta snapshot olarak korunur).
  İçerik koleksiyonlarında snapshot tutulmaz; ihtiyaç anında join
  yapılır.

---

## 13. Gelecek Koleksiyonlar

Aşağıdaki koleksiyonlar şu an **planlama satırında**, şema henüz
kesinleşmedi:

| Koleksiyon | Olası amaç | Faz |
|---|---|---|
| `notifications/{id}` | Admin'lere veya kullanıcılara bildirim akışı. | v12.5+ |
| `featureRequests/{id}` | İç feature request kuyrukları. | İhtiyaç anında. |
| `incidents/{id}` | Post-mortem / oncall dokümantasyon. | v12.5+ |
| Debt panel koleksiyonları | (out of scope) | v12.6+ ayrı sprint, ayrı doc. |

Yeni koleksiyon **bu doküman + `firestore.rules` + `firebase-rules-test-plan.md`**
güncellenmeden eklenmez. Üçü senkron kalır.

---

## 14. Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v12.1.0-pre.2 | 2026-05-24 | İlk konsolide data model dokümanı. `admins/{uid}` + `announcements/{id}` + `events/{id}` + `apps/{id}` + `adminLogs/{id}` + `publicConfig/{key}` + `systemStatus/{key}` alan tabloları, status enum kuralı, timestamp yaklaşımı (`serverTimestamp()`), `createdBy`/`updatedBy` UID konvansiyonu ve gelecek koleksiyon planı belgelendi. Foundation rules ([`../firestore.rules`](../firestore.rules)) ile senkron. Runtime read/write yok; mevcut admin login/logout/enforce davranışı bit-identical. |
