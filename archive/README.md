# Archive — metavis1on

Bu klasör, refactor süreci boyunca **mevcut çalışan dosyaların yedeklerini** ve
ileride kullanılma ihtimali olan **deneme/legacy parçaları** taşımak için
hazırlanmıştır.

## Durum (v11.0.7)

v11.0.7 swap fazıyla birlikte v11 landing canlı ana sayfa oldu. Eski v10
ana sayfa, CSS ve JS dosyaları silinmedi; bu klasör altında yedek olarak
durmaya devam ediyor.

## Mevcut İçerikler

- `borc-v5-snapshot.html` — eski borç paneli yedeği (Faz 2 öncesi)
- `index-v10.html` — eski v10 ana site (`index.html`) yedeği
- `style-v10.css` — eski v10 ana site CSS yedeği (`style.css`)
- `script-v10.js` — eski v10 ana site JS yedeği (`script.js`)

## v11.0.7 Swap Notu

- `index-v11.html` → `index.html` olarak canlıya alındı.
- Eski `index.html` → `archive/index-v10.html`.
- Eski `style.css` → `archive/style-v10.css`.
- Eski `script.js` → `archive/script-v10.js`.
- Geri dönüş gerekirse bu üç dosya kökten tekrar canlıya alınabilir.
- Arşiv kopyaları, kökteki dosya yapısına göre yazıldıkları haliyle
  korunmuştur (yol referansları değiştirilmedi); kökten açılmak üzere
  tasarlandıkları için arşiv klasöründen doğrudan açıldığında bazı
  kaynaklar bulunamayabilir.

## Kurallar

1. Bu klasördeki **hiçbir dosya** otomatik silinmez.
2. Bir dosyanın buraya taşınması için **açık kullanıcı onayı** şarttır.
3. Taşıma yapıldığında, eski URL'i kıran olmaması için kök dizine küçük bir
   redirect/uyarı sayfası bırakılır.

## Faz Geçmişi

- **Faz 0 (yedekleme + klasör iskeleti):** ✅ Tamamlandı
- **Faz 1 (ortak CSS/JS):** ✅ Tamamlandı
- **Faz 2 (admin + projeler iskeleti):** ✅ Tamamlandı
- **v11 paralel landing (v11.0.1 – v11.0.6):** ✅ Tamamlandı
- **v11.0.7 ana sayfa swap:** ✅ Tamamlandı
- **Faz 3+ (canlı veri bağlama, borç taşıma, içerik yönetimi):** ⏳ Onay bekliyor
