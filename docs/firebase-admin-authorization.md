# Firebase Admin Authorization Contract

> Bu doküman metavis1on **v12 Firebase Auth geçişinde admin yetkilendirme
> sözleşmesini** tanımlar. Firebase Auth bir kullanıcının kim olduğunu
> doğrular (**authentication**); admin paneline ne yapabileceğini
> belirlemez (**authorization**). Bu boşluk, `admins/{uid}` Firestore
> koleksiyonu üzerinden bir allowlist ile kapatılır.
>
> Belge sürümü: v12.1.0-pre.2 · Hedef faz: v12.1.0+
>
> Bağlantılı dokümanlar:
> - [`firebase-transition-plan.md`](./firebase-transition-plan.md) §4 (Auth Planı) ve §6.5 (admins şeması).
> - [`firestore-data-model.md`](./firestore-data-model.md) — `admins/{uid}` dahil tüm koleksiyon alan tablosu.
> - [`firebase-rules-test-plan.md`](./firebase-rules-test-plan.md) §2 (roller) ve §5–§6 (pozitif/negatif testler).
> - [`firebase-local-setup.md`](./firebase-local-setup.md) §12.4 (production enforce checklist).
> - [`../firestore.rules`](../firestore.rules) — bu sözleşmenin foundation draft halinde gerçeklendiği rules dosyası (henüz deploy edilmiyor).

---

## İçindekiler

1. [Neden Bu Katman?](#1-neden-bu-katman)
2. [Sözleşmenin Kapsamı (ve Sınırı)](#2-sözleşmenin-kapsamı-ve-sınırı)
3. [`admins/{uid}` Doc Şeması](#3-adminsuid-doc-şeması)
4. [Roller](#4-roller)
5. [`active` Alanı](#5-active-alanı)
6. [İlk Owner Bootstrap Prosedürü](#6-i̇lk-owner-bootstrap-prosedürü)
7. [Enforce Akışı ile İlişki](#7-enforce-akışı-ile-i̇lişki)
8. [Runtime Etkisi (Bu Fazda)](#8-runtime-etkisi-bu-fazda)
9. [Güvenlik Notları](#9-güvenlik-notları)
10. [Sürüm Notu](#10-sürüm-notu)

---

## 1. Neden Bu Katman?

Firebase Auth tek başına yeterli **değildir**:

- **Auth = kimlik.** Firebase Auth, bir kullanıcının e-postasını ve UID'ini
  doğrular. Geçerli bir oturum üretebilen herkes "signed in" olur.
- **Authorization = yetki.** Bir kullanıcının admin paneline girip
  girememesi, hangi modülleri okuyabilmesi, write yapabilmesi ayrı
  bir karardır.
- Şu anki repo durumunda `MV.auth.firebase.signIn` + bridge zinciri
  geçerli bir Firebase Auth oturumunu `mv_admin_session` köprüsüyle
  admin panel gate'ine çevirir. **Bu köprüde rol/allowlist kontrolü
  yoktur:** *signed in olabilen herkes admin sayılır* (bkz. v12.0.0-beta.5
  audit raporu).

`admins/{uid}` koleksiyonu bu boşluğun doldurulduğu **tek noktadır.**
Hem rules tarafında (Firestore okuma/yazma kararları), hem ileride
runtime tarafında (admin paneli girişinde) bu doc'un varlığı +
`active: true` koşulu yetkiyi belirler.

> **Kritik:** Enforce (`MV_ENFORCE_FIREBASE_AUTH=true`) açılmadan
> önce allowlist katmanı en az **contract + initial owner** seviyesinde
> hazır olmalıdır. Aksi takdirde Firebase Auth ile login olabilen
> *herhangi bir e-posta kullanıcısı* admin paneline girer. Bu, beta.5
> raporunun "kritik gap" olarak işaretlediği sorundur.

---

## 2. Sözleşmenin Kapsamı (ve Sınırı)

### Bu fazda (v12.1.0-pre.2) sözleşme **şunu yapar:**

- `admins/{uid}` koleksiyonunun şemasını netleştirir.
- Rol hiyerarşisini (`owner` > `admin` > `editor` > `viewer`) tanımlar.
- `active` alanının soft-delete davranışını açıklar.
- İlk owner bootstrap prosedürünü tarif eder (gerçek UID/e-posta repo'ya
  yazmadan).
- `firestore.rules` foundation draft'ında allowlist kararlarının
  hangi helper'larla alınacağını belirler (`isSignedIn`, `isAdmin`,
  `isActiveAdmin`, `isOwner`).

### Bu fazda sözleşme **şunu yapmaz:**

- **Runtime'da `admins/{uid}` okumaz.** Hiçbir admin HTML, hiçbir
  `MV.auth.*` wrapper'ı, hiçbir `shared/js/*` modülü bu fazda
  Firestore'a bağlanmaz. Allowlist okuma v12.1.0 Firestore Rules
  foundation deploy + ilk runtime read fazına bırakıldı.
- **`mv_admin_session` payload'ına rol eklemez.** Bridge davranışı
  (`createSessionFromResult`) bit-identical kalır.
- **`MV.auth.firebase.*` API yüzeyini değiştirmez.** signIn / signOut /
  currentUser / onChange dört yüzeyi de aynı.
- **Enforce flag'ini açmaz.** `MV_ENFORCE_FIREBASE_AUTH` default OFF
  kalır.
- **Firestore'a deploy yapmaz.** `firebase.json` / `.firebaserc` /
  `firestore.indexes.json` hâlâ yok; `firestore.rules` foundation
  draft olarak repo'da durur, herhangi bir Firebase project'e push
  edilmez.

### Bu fazda kesinlikle yok

- Real UID / real e-mail / real apiKey / real projectId hiçbir doc'a
  yazılmaz.
- Borç paneli (`admin/borc/index.html`) etkilenmez.
- Public site (`index.html`) etkilenmez.

---

## 3. `admins/{uid}` Doc Şeması

Koleksiyon: `admins`
Doc ID konvansiyonu: `admins/{firebaseAuthUid}` — yani document ID,
ilgili Firebase Auth kullanıcısının UID'iyle birebir eşittir. Bu
sayede rules tarafında `get(/admins/$(request.auth.uid))` doğrudan
o kullanıcının doc'unu bulur.

```text
admins/{uid}
├── uid:        string    // Firebase Auth UID; doc ID ile birebir eşit.
├── email:      string    // Bilgi amaçlı; gerçek auth değil rules'da.
├── role:       string    // 'owner' | 'admin' | 'editor' | 'viewer'
├── active:     boolean   // false → soft-deleted; gate kapanır.
├── createdAt:  timestamp // serverTimestamp() ile yazılır.
├── updatedAt:  timestamp // serverTimestamp() ile yazılır.
└── notes:      string?   // Opsiyonel; kim ekledi / niye eklendi.
```

| Alan | Tip | Zorunlu? | Açıklama |
|---|---|---|---|
| `uid` | string | ✅ | Doc ID ile birebir eşit olmalı. Tutarlılık denetimi rules'da ileride eklenebilir. |
| `email` | string | ✅ | Bilgi amaçlı. Rules `request.auth.token.email`'i kullanır; bu alan o e-postanın *kayıtlı* sürümüdür. Audit log'ları için faydalı. |
| `role` | string | ✅ | Aşağıdaki dört değerden biri (bkz. §4). |
| `active` | boolean | ✅ | `false` ise hiçbir privileged action geçmez. Hard-delete yerine soft-delete tercih edilir (bkz. §5). |
| `createdAt` | timestamp | ✅ | `serverTimestamp()`. Audit + sıralama için. |
| `updatedAt` | timestamp | ✅ | `serverTimestamp()`. Her doc update'inde tazelenir. |
| `notes` | string | ❌ | "İlk owner, beta.5 sonrası eklendi" gibi short note. Hassas bilgi içermez. |

### Şema sınırları

- **Parola / token / secret saklanmaz.** Auth credential'ları Firebase
  Auth'a aittir; bu doc yalnız yetki katmanıdır.
- **Şahsi veri minimize edilir.** Tam ad, telefon, adres gibi alanlar
  yok. Email + UID + role + active yeterlidir.
- **Şema gevşek mi sıkı mı?** Bu sözleşmede gevşek. Rules tarafı
  rol/active denetimi yapar; ek alan validation v12.3+ CRUD fazında
  rules-side type kontrolüyle gelir.

---

## 4. Roller

Dört seviyeli, **artan yetki**:

| Rol | Kısa açıklama | İçerik read | İçerik write | adminLogs | admins management |
|---|---|---|---|---|---|
| `viewer` | Yardımcı, salt okuma. | ✅ (draft dahil) | ❌ | ✅ read | ❌ |
| `editor` | İçerik düzenleyici. | ✅ | ✅ (announcements/events/apps) | ✅ read | ❌ |
| `admin` | Standart admin. | ✅ | ✅ + adminLogs paired write | ✅ | ❌ (admins'i değiştiremez) |
| `owner` | En yüksek yetki. | ✅ | ✅ | ✅ | ✅ (admins koleksiyonu) |

> **Not.** `editor` rolü v12.1.0-pre.2 sözleşmesinde **yeni**dir
> (önceki `firebase-transition-plan.md` §4.3 yalnız owner/admin/viewer
> tanımlıyordu). Editor, "içeriği değiştirebilen ama allowlist'i
> göremeyen" rolü doldurur. Bu rolün tam rules-side wiring'i v12.1.0
> rules foundation deploy aşamasında somutlaşacak; foundation
> draft'ta editor henüz read/write yetkisi alıyor değil çünkü
> content collection'ları topyekün kapalı.

### Rol seçim rehberi

- **Owner** — projeyi yöneten en az 1, en fazla 2 kişi. Yedek owner
  zorunludur (kilitlenme riski).
- **Admin** — admin paneline tam erişim gereken operatörler. Allowlist
  yönetimi gerekmez.
- **Editor** — içerik takvimi / duyuru / etkinlik akışını besleyen
  operatörler. Auth + içerik var ama admin yönetimi yok.
- **Viewer** — admin paneline okuma amaçlı erişim gereken raporlama
  / oversight rolü.

### Rol değişimleri

- Rol yükseltme/düşürme **yalnız owner** tarafından yapılır.
- Rol değişimi `updatedAt` alanını tazeler. `notes` alanına kısa
  bir açıklama bırakılması önerilir ("editor → admin, v12.3 CRUD
  fazı için").
- Eski rol hard-delete edilmez; soft-delete (`active: false`) ile
  emekliye ayrılır (bkz. §5).

---

## 5. `active` Alanı

`active: false` doc'ları **soft-deleted** kabul edilir.

**Soft-delete neden hard-delete'e tercih edilir:**

- Audit izi korunur. Hangi UID'in geçmişte hangi role sahip olduğu
  silinmez.
- Bir kullanıcıyı yeniden eklemek tek alan değişikliğidir
  (`active: true`).
- adminLogs içinde `actorUid` referansı kırılmaz; tarihçe okunabilir.

**Davranış garantileri:**

- `isActiveAdmin()` rules helper'ı `active == true` istemediği sürece
  geçmez. `active: false` veya alan yokken `isActiveAdmin()` false
  döner.
- `isOwner()` aynı zincirden geçer — disabled owner yoktur; bir owner
  emekliye ayrılırsa yeni bir owner Firebase Console'dan açılmalıdır.
- Active false bir doc, doc'un kendisi okunabilir mi? **Hayır;**
  foundation draft'ta sadece self-read (kendi UID'i için) ve owner read
  açık. Disabled bir admin kendi doc'unu okuyabilir (kapatıldığını
  görmek için), ama hiçbir privileged action geçmez.

---

## 6. İlk Owner Bootstrap Prosedürü

> **Önemli.** Bu prosedür, gerçek UID/e-postayı **repo'ya yazmadan**
> tarif eder. Aşağıdaki adımların hiçbiri runtime kod yazımı içermez;
> tamamı Firebase Console üzerinden, manuel, doğrulamalı yapılır.

### Önkoşullar

- Firebase project (staging veya prod) Firebase Console'da mevcut
  olmalı.
- Firebase Auth → Sign-in method → Email/Password provider açık olmalı.
- En az 1 gerçek admin e-postası ve gerçek bir backup admin e-postası
  hazır olmalı.

### Bootstrap adımları

```text
[B1] Owner kullanıcısını Auth'a ekle
     Firebase Console → Authentication → Users → "Add user"
     - E-posta: gerçek owner e-postası
     - Password: tek seferlik güçlü parola (sonra owner kendi değiştirir)
     - Owner'ın UID'i (otomatik üretilir) Console'da görünür.

[B2] Backup owner kullanıcısını ekle
     Aynı adımı backup owner için tekrarla. Tek owner ile yola çıkma
     — kilitlenme riskini sıfıra indirmek için her zaman en az 2.

[B3] Firestore project'inin etkin olduğunu doğrula
     Firebase Console → Firestore Database → "Create database"
     (eğer henüz oluşturulmamışsa) → production mode → en yakın region.

[B4] `admins/{uid}` koleksiyonunu Console'dan oluştur
     Firestore Database → "Start collection" → ID: `admins`
     - Document ID: B1'de elde edilen owner UID'i (manuel kopyala).
     - Alanlar:
         uid:        <owner UID>             (string)
         email:      <owner email>           (string)
         role:       owner                   (string)
         active:     true                    (boolean)
         createdAt:  <şu anki sunucu zamanı> (timestamp)
         updatedAt:  <şu anki sunucu zamanı> (timestamp)
         notes:      "Initial owner, v12.1.0+ bootstrap" (string)

[B5] Backup owner için B4'ü tekrarla
     UID + e-posta backup hesabına ait. role: 'owner' ve active: true.

[B6] (İleride) Doğrulama
     Bu adım v12.1.0 rules foundation deploy edildikten sonra anlamlı:
     - Firebase Console Rules Playground veya Emulator üzerinden
       owner UID ile `admins/{ownerUid}` read isteği → ALLOW.
     - Başka bir test UID ile aynı doc'a read isteği → DENY.
     - Owner ile başka bir `admins/{X}` doc'una read isteği → ALLOW.
     - Owner olmayan ile başka bir `admins/{X}` doc'una read isteği → DENY.

[B7] Gerçek UID/e-posta repo'ya yazılmaz
     B1–B5'te elde edilen UID/e-posta:
       - bu dokümana yazılmaz.
       - CHANGELOG'a yazılmaz.
       - commit mesajına yazılmaz.
       - PR description'a yazılmaz.
     Güvenli kayıt: 1Password / Bitwarden / şirket-içi secrets store.
```

### Üyelik genişletme

İlk owner sonrası admin/editor/viewer ekleme:

- Yalnız owner yapabilir (rules tarafında `isOwner()` ile sınırlanır).
- Şu an Console'dan manuel; v12.5+ "Admin Management" admin paneli
  sayfası ile delegasyon planlanır.
- Her ekleme/güncelleme `adminLogs` koleksiyonuna paired write üretmeli
  (CRUD fazı v12.3+ ile zorunlu hale gelir).

---

## 7. Enforce Akışı ile İlişki

`MV_ENFORCE_FIREBASE_AUTH` flag'i (bkz. [`firebase-local-setup.md`](./firebase-local-setup.md) §12.2)
tek başına allowlist'i devreye almaz. Enforce flag'inin yaptığı:

- Production hostta `MV.auth.devLogin`'i kapatır.
- Operatörü Firebase Auth zincirine zorlar.

Allowlist olmadan enforce açılırsa:

- Firebase Auth Email/Password provider'ına kayıtlı **herhangi bir
  e-posta** signIn → `createSessionFromResult` → admin paneli geçişi
  yapabilir.
- `mv_admin_session` payload'ı `provider: 'firebase-auth'` döner ama
  rol/permission yok.
- Yani: *enforce alone is NOT a security boundary; allowlist is.*

### Doğru sıra

```text
1) Allowlist contract (bu doküman + firestore.rules foundation) → yapıldı.
2) Firestore Rules foundation deploy + admins koleksiyonu canlı project'te
   gerçek owner doc'larıyla beslenmiş → v12.1.0.
3) Runtime'da admins/{uid} okuma + admin gate enrichment → v12.1.0+
   (mv_admin_session payload'una rol eklenmesi veya signIn flow'unda
   admins read sonrası reddetme).
4) Enforce flag açma → v12.1.0+ (yalnız #2 ve #3 PASS olduktan sonra).
```

Sırayı atlamak operatörü ya panel-dışına kilitler (#3 olmadan
allowlist devrede ise) ya da paneli açık bırakır (#1–#3 olmadan
enforce açılırsa). Her iki uç da kabul edilemez.

---

## 8. Runtime Etkisi (Bu Fazda)

v12.1.0-pre.2 commit'inden sonra runtime davranışı **bit-identical**:

- `MV_FIREBASE.getStatus()` aynı.
- `MV_FIREBASE.isAuthReady()` aynı.
- `MV_FIREBASE.isFirestoreReady()` aynı (passive layer pre.1'den
  beri var).
- `MV.auth.firebase.{signIn, signOut, currentUser, onChange}` aynı.
- `MV.auth.{isAuthed, devLogin, logout, requireAdmin, getUser}` aynı.
- `mv_admin_session` payload şeması aynı; `role` alanı **eklenmedi**
  (eklenmesi v12.1.0+ ayrı kararı).
- Trial flag persistence aynı.
- Trial status indicator aynı.
- Production devLogin guard scaffold aynı (default OFF).
- Borç paneli iç gate'i aynı.

Bu fazda runtime'a tek dokunulan yer: yok. Bütün değişim docs +
`firestore.rules` (foundation draft) seviyesinde.

---

## 9. Güvenlik Notları

- **Allowlist Firestore'da yaşar; rules onu evaluate eder.** Client-side
  bir allowlist check (`if (knownAdmins.includes(email))` gibi)
  bypass edilebilir. Tek güvenli yer: rules.
- **`request.auth.token.email_verified`** ileride ek bir koşul olarak
  eklenebilir. v12.1.0-pre.2 sözleşmesi bunu zorunlu kılmıyor ama
  rules deploy aşamasında değerlendirmeye değer.
- **Allowlist okumak da gizlilik gerektirir.** Bu yüzden foundation
  draft `list` operation'ını yalnız owner'a, `get`'i ise self veya
  owner'a açıyor. Bir admin başka admin'lerin listesini enumerate
  edemez.
- **`adminLogs` writes paired olmalı.** Allowlist değişiklikleri
  (owner tarafından yapılır) ileride paired `adminLogs` create
  isteğiyle birlikte gelmeli (CRUD fazı zorunlulukları).
- **`createdBy` / `updatedBy` alanları opsiyonel ama önerilir.**
  Foundation draft'ta zorunlu kılınmadı; v12.3 CRUD rules
  validation'ında bu alanlar için type check eklenebilir.
- **App Check.** Allowlist katmanı, App Check'in alternatifi
  değildir. Allowlist "kim girer" sorusunu çözer; App Check "istek
  gerçekten benim app'imden mi geliyor" sorusunu çözer. İkisi
  birbirini tamamlar. App Check enforcement v12.3+ değerlendirmesi.
- **Hiçbir gerçek UID / e-posta bu dokümana yazılmaz.** §6'daki
  bootstrap prosedürü, gerçek değerleri Firebase Console + secrets
  store'da bırakır; doküman yalnız şemayı ve adımları tarif eder.

---

## 10. Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v12.1.0-pre.2 | 2026-05-24 | İlk admin allowlist contract dokümanı. `admins/{uid}` doc şeması, dört seviyeli rol hiyerarşisi (owner/admin/editor/viewer), `active` soft-delete davranışı, ilk owner bootstrap prosedürü (gerçek UID/e-posta yok), enforce akışıyla ilişki ve runtime etkisi (bit-identical) belgelendi. Runtime kod değişmedi. `firestore.rules` foundation draft'ında allowlist helper'ları (`isSignedIn`, `isAdmin`, `isActiveAdmin`, `isOwner`) gerçeklendi; admins/{uid} self-read ve owner-write rules tarafına yansıdı. Content collection'ları (`announcements`/`events`/`apps`/`adminLogs`/`publicConfig`/`systemStatus`) bu fazda kapalı tutuldu. |
