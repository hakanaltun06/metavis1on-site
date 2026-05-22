# Archive — metavis1on

Bu klasör, refactor süreci boyunca **mevcut çalışan dosyaların yedeklerini** ve
ileride kullanılma ihtimali olan **deneme/legacy parçaları** taşımak için
hazırlanmıştır.

## Durum (v10.0.0-alpha)

Şu an klasör **boş**. Faz 0/1/2 kapsamında hiçbir dosya taşınmadı; mevcut
sistem aynen çalışıyor. Bu README sadece bir yer tutucudur.

## Buraya Hangi Dosyalar Gelecek?

İleride (faz onayıyla) buraya taşınabilecek olası içerikler:

- `a/` klasörünün kullanılmayan parçaları (seçim simülatörü, eski borç paneli)
- `borc.html` taşınırken kök dizinde bırakılacak son kullanım yedeği
- `assets/yusuf.mp4` — referansı bulunmayan medya (kullanıldığı yer
  belirsiz; **kullanıcı onayı olmadan silinmeyecek**, sadece buraya taşınabilir)
- Eski `style.css` / `script.js` snapshot'ları

## Kurallar

1. Bu klasördeki **hiçbir dosya** otomatik silinmez.
2. Bir dosyanın buraya taşınması için **açık kullanıcı onayı** şarttır.
3. Taşıma yapıldığında, eski URL'i kıran olmaması için kök dizine küçük bir
   redirect/uyarı sayfası bırakılır.

## Faz Geçmişi

- **Faz 0 (yedekleme + klasör iskeleti):** ✅ Tamamlandı
- **Faz 1 (ortak CSS/JS):** ✅ Tamamlandı
- **Faz 2 (admin + projeler iskeleti):** ✅ Tamamlandı
- **Faz 3+ (canlı veri bağlama, borç taşıma, içerik yönetimi):** ⏳ Onay bekliyor
