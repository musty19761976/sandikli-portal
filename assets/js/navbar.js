/* Sandıklı Portal — Navbar
   Navbar HTML'i her sayfaya scripts/inline_navbar.py ile gömülüdür
   (<div id="navbar-root">…</div>). JS yalnızca davranışı bağlar:
   scroll, aktif link, mobil menü, açılır kutular, tema, hava durumu.

   Geriye dönük uyumluluk: gömülü navbar bulunamazsa components/navbar.html
   fetch edilir (eski page templates). Fetch de başarısız olursa yine de
   interaction'lar kurulur; menüler HTML'de zaten var. */
(function () {
  "use strict";

  var root = document.getElementById("navbar-root");
  if (!root) return;

  function bind() {
    if (typeof window._initNavbarInteractions === "function") {
      window._initNavbarInteractions();
    }
    // Tema toggle'ı (navbar DOM'a oturunca mevcut fonksiyona güvenir)
    if (typeof window._initThemeToggle === "function") window._initThemeToggle();
    // Hava durumu ikonu
    if (typeof window._initNavWeatherIcon === "function") window._initNavWeatherIcon();
  }

  if (root.querySelector(".navbar")) {
    // Gömülü navbar: sadece davranış bağla
    bind();
    return;
  }

  fetch("components/navbar.html")
    .then(function (r) {
      if (!r.ok) throw new Error("navbar fetch failed");
      return r.text();
    })
    .then(function (html) {
      root.innerHTML = html;
      bind();
    })
    .catch(function () {
      // Navbar yoksa kullanicinin bos bir header gormesindense sayfa basligi
      // linki ile en azindan ana sayfaya donus birak.
      var fallback = document.querySelector("header.navbar");
      if (fallback) fallback.style.display = "";
      bind();
    });
})();
