/* ============================================================================
   metavis1on — Firebase Config (Merkezi)
   ----------------------------------------------------------------------------
   Bu dosya, ileride borc.html'in kendi içindeki Firebase yapılandırmasını
   yerine getirecek merkezi bir referans noktası olarak kuruldu.

   ÖNEMLİ:
   - Mevcut borc.html DOKUNULMADI; kendi Firebase config'i orada duruyor.
   - Production geçişi yapılana kadar bu dosyada gerçek apiKey saklanmaz.
   - Firebase apiKey değerleri tasarımı gereği client'a açıktır; gerçek
     güvenlik Firestore Security Rules tarafında yapılır.

   Production auth Firebase ile bağlanacak. Aktivasyon zamanı:
   - apps/borc/ taşıma fazında bu dosya doldurulacak,
   - shared/js/auth.js Firebase Auth wrapper'ı buradan beslenecek.
   ============================================================================ */
(function () {
  'use strict';

  window.MV_FIREBASE = {
    configured: false,
    config: null,
    note: 'Aktif değil. Şu an borc.html kendi config\'ini kullanıyor.'
  };
})();
