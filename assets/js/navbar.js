/* Sandıklı Portal — Navbar loader
   Tek bir navbar.html dosyasını tüm sayfalara yükler.
   Her sayfada <header class="navbar"> yerine <div id="navbar-root"></div> kullan. */
(function () {
  "use strict";

  const root = document.getElementById("navbar-root");
  if (!root) return;

  var basePath = "";

  fetch(basePath + "components/navbar.html")
    .then(function (r) {
      if (!r.ok) throw new Error("navbar fetch failed");
      return r.text();
    })
    .then(function (html) {
      root.innerHTML = html;

      // Tema toggle'ı (navbar DOM'a oturunca mevcut fonksiyona güvenir)
      if (typeof window._initThemeToggle === "function") window._initThemeToggle();

      // Navbar interaction'ları (scroll, aktif link, mobil menü, dropdown)
      if (typeof window._initNavbarInteractions === "function") {
        window._initNavbarInteractions();
      }

      // Hava durumu ikonu (navbar-inner artık DOM'da)
      if (typeof window._initNavWeatherIcon === "function") {
        window._initNavWeatherIcon();
      }
    })
    .catch(function () {
      // Yedek: sayfadaki mevcut navbarı göster (inline fallback)
      var fallback = document.querySelector("header.navbar");
      if (fallback) fallback.style.display = "";
    });
})();