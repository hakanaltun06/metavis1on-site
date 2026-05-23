# Debt Panel Security Audit

> Bu doküman, metavis1on borç panelinin **mevcut** güvenlik kapılarını,
> veri akışını ve v12 Firebase geçişi öncesi risklerini belgelemek için
> hazırlanmıştır. Bu fazda **hiçbir runtime dosyası değiştirilmemiştir**;
> rapor refactor önerisi değil, tespit + risk kayıt dokümanıdır.
>
> Belge sürümü: v11.5.2 · Hedef faz: v12.6.0 (security review)
>
> Bağlantılı doküman: [`firebase-transition-plan.md`](./firebase-transition-plan.md)
> § 12 (Debt Panel Special Policy).

---

## İçindekiler

1. [Mevcut Yapı Özeti](#1-mevcut-yapı-özeti)
2. [Dosya Haritası](#2-dosya-haritası)
3. [Giriş / Yönlendirme Zinciri](#3-giriş--yönlendirme-zinciri)
4. [Auth ve Gate Analizi](#4-auth-ve-gate-analizi)
5. [Veri Alanları / Storage Analizi](#5-veri-alanları--storage-analizi)
6. [Risk Seviyesi Tablosu](#6-risk-seviyesi-tablosu)
7. [Güvenli Geçiş Önerisi](#7-güvenli-geçiş-önerisi)
8. [Borç Paneli İçin Dokunma Kuralları](#8-borç-paneli-için-dokunma-kuralları)
9. [Sürüm Notu](#9-sürüm-notu)

---

## 1. Mevcut Yapı Özeti

### 1.1 Kök `borc.html`

- Eski URL'i (`/borc.html`) koruyan **yönlendirme sayfası**.
- HTML `<meta http-equiv="refresh" content="2; url=/admin/borc/">` ile 2
  saniyelik fallback yönlendirme.
- Inline JS ile `setTimeout(250ms, window.location.replace('/admin/borc/'))`
  → JS aktifse anında yönlendirir.
- `<meta name="robots" content="noindex,nofollow">` → arama motoru
  indekslememesi belirtilmiş.
- Manuel link ("Yönetici Paneline Git") fallback olarak butonda mevcut.
- Bu sayfa **kendi başına auth kontrolü yapmaz**; tüm yetki kontrolü
  hedef `admin/borc/index.html` katmanında gerçekleşir.

### 1.2 `admin/borc/index.html`

- Asıl borç yönetim paneli. Tek-dosya SPA yapısında, ~2500 satırlık
  bağımsız modül.
- **İki katmanlı güvenlik (defansif derinlik):**
  - **Kapı 1 (dış katman):** `shared/js/auth.js` üzerinden `MV.auth`
    oturum kontrolü. Sayfa head'inde, kontrol başarısızsa `window.stop()`
    + `../index.html`'e redirect + `throw` ile başlatılır.
  - **Kapı 2 (iç katman):** Modül kendi Firebase Auth +
    `signInWithEmailAndPassword` login modal'ına sahiptir. Email/parola
    olmadan Firestore okuma/yazma yapılmaz.
- Title: `"metavis1on | Borç Yönetim Paneli v5.0 (Ultimate Stability)"`
  (kendi iç sürümleme zincirini taşır).

### 1.3 Admin dashboard'dan erişim

- `admin/dashboard.html` içindeki hızlı erişim kartı **Borç Paneli**
  → `./borc/` (yani `admin/borc/index.html`).
- `admin/apps.html` içindeki kayıtlı modüller listesinde Borç Paneli
  kartı `id === 'borc'` özel case'i ile `./borc/` URL'ine resolve
  edilir; "Yetkili panele git →" CTA gösterilir.
- Mevcut public site (`index.html`) borç paneline **doğrudan link
  vermez**; yalnızca admin alanından erişilir.

### 1.4 Dış admin gate

- `shared/js/auth.js` modülü `MV.auth` namespace'i üzerinden:
  - `isAuthed()` — sessionStorage tabanlı oturum kontrolü.
  - `requireAdmin(loginUrl)` — yönlendirici helper.
  - 8 saatlik TTL, `mv_admin_session` key'i ile.
- **Bu gate production-ready bir auth değildir**; `devLogin` parola
  doğrulaması yapmaz, yalnız format kontrolü yapar. `shared/js/auth.js`
  kendi içinde bunu açıkça not eder.
- Borç paneli için bu gate **yalnız dış katman** olarak iş görür;
  asıl yetki kararı iç Firebase Auth katmanında verilir.

### 1.5 İç Firebase / Auth gate

- Modül `firebase@10.8.1` modular SDK'sını CDN'den import eder
  (`auth` + `firestore`).
- `firebaseConfig` modül içinde inline tutulur. Apı key placeholder
  ise (`"YOUR_API_KEY"` literal kontrolü) **Firebase init edilmez**;
  modül lokal moda düşer.
- `onAuthStateChanged` listener kullanıcı null olduğunda:
  - Veri belleğini sıfırlar (`debts = []`, `sysLogs = []`).
  - Firestore listener'ları unsubscribe eder.
  - UI'yi giriş ekranına döner.
- **Sessiz misafir admin yok:** sessionStorage `metavis1on_admin`
  flag'i tek başına Firestore yazımı için yeterli kabul edilmez.
  Production'a yakın bir kod yolu mevcuttur.

### 1.6 localStorage fallback ve backup

- Firebase init başarısız olursa modül **tam-lokal moda** düşer ve
  veriyi localStorage üzerinden okur/yazar.
- Firebase başarılıyken Firestore snapshot'larından yerel **backup**
  yazılır; ancak yalnızca `auth.currentUser` varken.
- Backup zamanı (`metavis1on_last_backup`) human-readable string olarak
  tutulur, kullanıcı UI'sinden görülebilir.
- localStorage backup'ı silinmesi için ayrı bir "veri sil" akışı
  mevcuttur (sysLogs, debts_backup ve logs key'leri ayrı ayrı temizlenir).

### 1.7 sysLogs / audit log mantığı

- Firestore `sysLogs` koleksiyonu her kritik aksiyon için
  `addDoc({ action, message, timestamp, ...})` çağrısı alır.
- Yalnız `auth.currentUser` mevcutsa Firestore'a yazım denenir;
  misafir client localStorage'a log yazmaz.
- Lokal modda (Firebase init başarısız) log akışı `metavis1on_logs`
  localStorage key'ine son 100 kayıt olarak tutulur.
- UI son 50 kayıt gösterir, `timestamp desc` ile sıralıdır.

---

## 2. Dosya Haritası

| Dosya | Rol | Değiştirildi mi? |
|---|---|:---:|
| `borc.html` | Eski URL redirect zinciri. Auth yok; sadece HTML/JS redirect. | Hayır |
| `admin/borc/index.html` | Borç yönetim paneli. İki katmanlı gate (dış MV.auth + iç Firebase Auth). | Hayır |
| `shared/js/auth.js` | Dış admin gate API'si (`isAuthed`, `requireAdmin`, `devLogin`, `logout`). | Hayır |
| `docs/firebase-transition-plan.md` | Genel Firebase mimari plan; borç paneli §12 ile burada referans alınıyor. | Hayır |

**Önemli:** Tüm dosyalar bu fazda yalnız **okundu**. Hiçbiri commit
diff'ine girmedi.

---

## 3. Giriş / Yönlendirme Zinciri

### 3.1 Beklenen akışlar

| Senaryo | Davranış |
|---|---|
| Kullanıcı `/borc.html` açar (eski URL) | HTML meta-refresh + JS `setTimeout 250ms` → `/admin/borc/` |
| Kullanıcı `/admin/borc/` açar, oturum **var** | Dış gate (`MV.auth.isAuthed`) geçer → iç Firebase Auth modal kontrol eder → kullanıcı email/parola ile login olur → veri yüklenir |
| Kullanıcı `/admin/borc/` açar, oturum **yok** | Dış gate `window.stop()` + redirect `../index.html` (admin login) |
| Kullanıcı admin dashboard'tan "Borç Paneli" kartına tıklar | Dashboard'daki `./borc/` linki → aynı `admin/borc/` zincirine girer |
| Kullanıcı admin login olmadan doğrudan `/admin/borc/` URL'ini bilirse | Dış gate'in `window.stop()` + redirect zinciri devreye girer; iç Firebase Auth katmanı zaten ek koruma |

### 3.2 Production / dev davranış ayrımı

- **`firebaseConfig` placeholder ise** (örn. `"YOUR_API_KEY"`) modül
  Firebase init etmez, lokal moda düşer. Bu durum dev/test için
  güvenli bir sinyaldir.
- **Üretimde** misafir admin sessionStorage flag'i tek başına Firestore
  yazımı için yeterli kabul edilmez (kod içinde explicit yorum +
  ek `auth.currentUser` kontrolü).
- `shared/js/auth.js` 8 saatlik SessionStorage TTL'i çalışır; tarayıcı
  sekmesi kapandığında oturum biter.

### 3.3 Login olmayan kullanıcı için beklenen davranış

- Dış katman: `window.stop()` ile sayfa render durdurulur + URL
  `admin/index.html` (login) ile değiştirilir.
- İç katman: Firebase Auth modal'ı kendiliğinden açık gelir; veri
  alanları boş; CRUD butonları işlevsizdir çünkü `auth.currentUser`
  null'dur.

---

## 4. Auth ve Gate Analizi

### 4.1 Dış gate (MV.auth)

| Özellik | Durum |
|---|---|
| Provider | SessionStorage tabanlı (`mv_admin_session`) |
| TTL | 8 saat |
| Parola doğrulaması | **Yok** (`devLogin` format kontrolü yapar) |
| Üretim-grade | **Hayır** — bu katman yalnız dış UX bariyeri |
| Borç paneline etkisi | Sayfa render'ı engellenir; ancak gerçek yetki iç katmandadır |

### 4.2 İç gate (Firebase Auth)

| Özellik | Durum |
|---|---|
| Provider | Firebase Auth (`signInWithEmailAndPassword`) |
| State listener | `onAuthStateChanged` |
| User null davranışı | Veri belleği sıfırlanır, listener'lar kurulmaz |
| Yetkisiz Firestore çağrısı | Erken `return` ile engellenir; permission-denied önlenir |
| Production fallback (misafir admin) | sessionStorage flag tek başına yetersiz kabul edilir (kod içinde explicit) |
| signOut akışı | `signOut(auth)` + sessionStorage cleanup birlikte |

### 4.3 onAuthStateChanged(null) sırasındaki davranış

Kod path'i şunu yapar:
- `debts = []`, `sysLogs = []` (in-memory data wipe)
- Aktif Firestore listener'ları unsubscribe.
- UI giriş ekranına döner.
- `addDoc` / `updateDoc` / `deleteDoc` çağrıları **kullanıcı null iken
  tetiklenmez** çünkü ilgili akışlar `auth.currentUser` kontrolünden
  geçer.

### 4.4 Lokal mod ile üretim ayrımı

| Mod | Tetikleyici | Davranış |
|---|---|---|
| Lokal (Firebase yok) | `firebaseConfig.apiKey === "YOUR_API_KEY"` veya init başarısız | Tüm veri localStorage; auth.currentUser yok; sysLogs `metavis1on_logs` key'ine yazılır |
| Üretim (Firebase var) | Gerçek `firebaseConfig` | Firestore + Auth zorunlu; localStorage **yalnız** auth varken backup yazar |

Bu ayrım dev ortamında refactor güvenliği sağlar, ancak **yanlış
firebaseConfig'in canlıya çıkması durumunda** modül sessizce lokal
moda düşer ve veri kalıcılığı kaybedilir. Bu bir risk olarak §6'da
listelendi.

---

## 5. Veri Alanları / Storage Analizi

### 5.1 Firestore koleksiyonları

| Koleksiyon | Amaç | Yazma yetkisi |
|---|---|---|
| `debts` | Borç kayıtları (CRUD) | `auth.currentUser` varken |
| `sysLogs` | Sistem log akışı (kritik aksiyon kaydı) | `auth.currentUser` varken |

**Önemli:** Bu doküman gerçek dokümanlardan veri kopyalamaz; yalnız
collection adlarını ve amaçlarını listeler.

### 5.2 localStorage key'leri

| Key | Amaç | Modda yazılır |
|---|---|---|
| `metavis1on_debts` | Eski lokal borç verisi (yedek/legacy) | Lokal mod |
| `metavis1on_debts_backup` | Firestore snapshot'larından yerel yedek | Auth varken |
| `metavis1on_last_backup` | Son backup zamanı (human-readable string) | Auth varken |
| `metavis1on_logs` | sysLogs lokal yedeği (son 100 kayıt) | Yalnız tam-lokal mod (Firebase init başarısız) |

### 5.3 sessionStorage key'leri

| Key | Amaç |
|---|---|
| `metavis1on_admin` | Dev/misafir admin flag'i (üretimde Firestore yazımı için yetersiz) |
| `mv_admin_session` | `shared/js/auth.js` dış gate oturum verisi |

### 5.4 Export / backup mekanizması

- Modül **JSON export** akışı sağlar; tüm `debts` dizisini metadata
  ile birlikte (`exportedAt`, `totalRecords`, vb.) JSON olarak indirir.
- Kayıt kullanıcısı `addLog("EXPORT_JSON", ...)` ile loglanır.
- Import akışı da mevcut; ancak bu doküman kapsamında detaylı
  incelenmedi (audit'in `phase B` fazına ait).

### 5.5 Log akışı

- `addLog(action, message)` helper'ı tek noktadan tüm aksiyonları
  loglar.
- Kayıt formatı: `{ action, message, timestamp, ...details }`.
- UI son 50 log gösterir, `timestamp desc` sıralı.
- Lokal modda son 100 kayıt localStorage'a yazılır; üretimde Firestore
  `sysLogs` koleksiyonu kullanılır.

---

## 6. Risk Seviyesi Tablosu

| Risk | Seviye | Mevcut durum | Önerilen gelecek aksiyon |
|---|---|---|---|
| Firestore Rules yanlış yapılandırılırsa veri sızıntısı | **Yüksek** | Bu doküman kapsamında Rules dosyası okunmadı; mevcut Firebase project rules durumu manuel inceleme gerektirir | Phase B: Firebase console üzerinden mevcut rules export edilip review edilecek |
| Production'da dev fallback açık kalırsa yetkisiz erişim | **Orta** | Kod içinde explicit `auth.currentUser` kontrolü var; sessionStorage flag tek başına yetersiz tutuluyor | Phase D: emulator/staging negatif testlerle doğrulanacak |
| localStorage backup hassas veri taşıyorsa cihaz tarafında risk | **Orta** | `metavis1on_debts_backup` ve `metavis1on_logs` tarayıcıda plain JSON olarak duruyor | Phase C: backup şifreleme veya kısaltma stratejisi değerlendirilecek; ayrıca cihaz devir/teslim senaryosu için "verileri temizle" akışı UI'da görünür yapılabilir |
| Export/backup olmadan refactor veri kaybı riski | **Yüksek** | Şu an `gcloud firestore export` benzeri otomatik backup planı dokümante değil | Phase C: scheduled export + manuel checkpoint prosedürü yazılacak |
| Collection/localStorage key değişimi migration olmadan yapılırsa veri kaybı | **Yüksek** | `debts`, `sysLogs`, `metavis1on_*` key'leri kod içinde literal sabit; rename = veri kaybı | Hiçbir rename ayrı `docs/debt-panel-migration.md` planı olmadan yapılmayacak |
| adminLogs yetersizse işlem takibi zayıflar | **Düşük** | `sysLogs` modül-içi loglar mevcut; ancak portal-genelinde `adminLogs` koleksiyonu (firebase-transition-plan §6.4) bağımsız çalışıyor | v12.5.0'da merkezi `adminLogs` ile bağlantı değerlendirilebilir |
| Borç panelinin public content koleksiyonlarıyla karışması | **Yüksek** | Şu an karışmıyor; ayrı `debts` ve `sysLogs` collection'ları, ayrı sayfa path'i (`admin/borc/`) | firebase-transition-plan §12 politikası ile kalıcı hale getirilmeli; v12 Rules yazımında namespace izolasyonu zorunlu |
| Firebase 10.8.1 SDK CDN-import bağımlılığı | **Düşük** | gstatic.com CDN'den import; offline çalışma sınırlı | Opsiyonel — vendoring veya self-host değerlendirilebilir; bu fazda öneri değil, not |
| Yanlış firebaseConfig canlıya çıkarsa sessizce lokal moda düşme | **Orta** | Apı key kontrolü yalnız `"YOUR_API_KEY"` literal'i; başka placeholder durumlar tespit edilmiyor | Phase D: config doğrulama daha sıkı bir healthcheck'e taşınabilir |

> Hiçbir satırda "hemen kodla düzeltildi" yazılmadı. Tüm önerilen
> aksiyonlar **gelecek fazlara** referansla kayda alınmıştır.

---

## 7. Güvenli Geçiş Önerisi

Borç paneli için tavsiye edilen faz sıralaması:

### Phase A — Read-only audit (bu doküman, tamamlandı)
- Mevcut yapı haritası çıkarıldı.
- Dış + iç gate akışları belgelendi.
- Risk tablosu kayıt altına alındı.
- Runtime'a hiç dokunulmadı.

### Phase B — Firebase project ayarları manuel kontrol
- Firebase console üzerinden mevcut **Firestore Rules** export edilir.
- Authentication provider durumu kontrol edilir.
- Admin whitelist (varsa) durumu belgelenir.
- App Check / restriction durumu kayıt altına alınır.
- Çıktı: bu doküma ek olarak `docs/debt-panel-firebase-config.md`
  (gerekirse).

### Phase C — Export / backup planı
- `gcloud firestore export` veya scheduled Cloud Function ile
  otomatik export prosedürü yazılır.
- Manuel snapshot prosedürü dokümante edilir.
- Restore prosedürü test edilir.
- Çıktı: `docs/debt-panel-backup-plan.md`.

### Phase D — Emulator / staging rules testleri
- Firebase Emulator Suite kurulur.
- Pozitif test'ler: yetkili admin yazabiliyor mu?
- Negatif test'ler: anon, viewer, yanlış uid yazabiliyor mu?
- Test sonuçları kayıt altına alınır.

### Phase E — Küçük ve atomik güvenlik düzeltmeleri
- **Yalnız Phase B–D tamamlandıktan sonra.**
- Her düzeltme tek odaklı PR olarak işlenir; refactor yapılmaz.
- Düzeltmelerin geri alınabilir olması zorunludur (revert-friendly diff).

### Phase F — Büyük refactor (ileri faz)
- Yalnız ayrı `docs/debt-panel-migration.md` planı yazıldıktan sonra
  açılır.
- Collection rename / localStorage key change yalnız bu fazda.
- Production'a çıkmadan staging'de en az 1 hafta gözlem.

---

## 8. Borç Paneli İçin Dokunma Kuralları

Bu kurallar [`firebase-transition-plan.md`](./firebase-transition-plan.md)
§12 ile tutarlı, daha somut şekilde:

1. **Export/backup planı olmadan refactor yok.** Phase C tamamlanmadan
   `admin/borc/` içinde fonksiyonel değişiklik yapılmaz.
2. **Collection isimleri (`debts`, `sysLogs`) plansız değiştirilmeyecek.**
   Rename = veri kaybı. Ayrı `docs/debt-panel-migration.md` zorunlu.
3. **localStorage key'leri (`metavis1on_debts`, `metavis1on_debts_backup`,
   `metavis1on_last_backup`, `metavis1on_logs`) plansız
   değiştirilmeyecek.** Mevcut cihazlardaki kullanıcı yedeklerini
   geçersiz kılar.
4. **Public koleksiyonlarla karıştırılmayacak.** `announcements`,
   `events`, `apps` ile aynı namespace altına yazılmaz, aynı rules
   bloğu paylaşılmaz.
5. **Firebase'e taşımak için çalışan yapı bozulmayacak.** Mevcut
   modül zaten Firebase Auth + Firestore kullanıyor; "merkezi auth'a
   geçirelim" gerekçesiyle iç katman çıkarılmayacak.
6. **`admin/borc/index.html` v12.0 – v12.5 boyunca mümkünse
   dokunulmayacak.** Bu fazlar public site + admin modüllerini Firebase'e
   geçirir; borç paneli paralel ama bağımsız kalır.
7. **v12.6.0 yalnız security review / küçük kontrollü aksiyon fazı
   olacak.** Refactor sprint'i değil; bu doküman + Phase B–D çıktıları
   referans alınır.
8. **Dış kapı + iç kapı çift katmanı** her zaman aktif kalır. Birinin
   "gereksiz olduğu" iddiasıyla diğeri devre dışı bırakılmaz.

---

## 9. Sürüm Notu

| Sürüm | Tarih | Açıklama |
|---|---|---|
| v11.5.2 | 2026-05-23 | İlk audit. Read-only haritalama. Aktif kod yok. |

Bu doküman canlı bir referanstır — v12.6.0 fazına yaklaşırken
Phase B / C / D çıktıları geldikçe ek bölümler eklenir; mevcut bölümlerin
geçmiş hali git history üzerinden takip edilir.
