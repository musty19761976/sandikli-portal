/* Sandıklı Portal — Cloudinary URL builder
   Kullanım: resim URL'si lazım olunca Python script'ini (scripts/upload.py) çalıştır.
   Çıktıdaki URL'yi HTML'e kopyala.

   URL formatı:
   https://res.cloudinary.com/njivgbxn/image/upload/f_auto,q_auto/DOSYA_ADI
*/
(function () {
  "use strict";

  var BASE = "https://res.cloudinary.com/njivgbxn/image/upload/";

  window.SandikliCloudinary = {
    url: function (publicId) {
      return BASE + "f_auto,q_auto/" + publicId;
    }
  };
})();
