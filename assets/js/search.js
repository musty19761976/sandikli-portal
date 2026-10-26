/* Sandıklı Portal — sayfa içi arama
   Statik basit indeks: her sayfanın başlığı + anahtar kelimeler.
   index.html'deki arama kutusuyla kullanılır; ana sayfa dışında gizli kalır. */
(function () {
  "use strict";

  var INDEX = [
    { t: "Ana Sayfa", href: "index.html", k: "sandıklı afyonkarahisar hüdai akdağ leblebi nüfus rakım istatistik" },
    { t: "Tarihçe", href: "tarih.html", k: "tarih kusura höyük hitit frig roma bizans germiyanoğulları osmanlı kurtuluş yunus emre taptuk emre efsane" },
    { t: "Belgeler ile Sandıklı", href: "belgeler-ile-sandikli.html", k: "belge osmanlı arşiv nfs nüfus defteri transkripsiyon 1831" },
    { t: "Hüdai Termal", href: "termal.html", k: "termal kaplıca hüdai çamur banyo şifalı su otel spa sağlık turizm" },
    { t: "Keşfet — Gezilecek Yerler", href: "kesfet.html", k: "gezi rota akdağ tabiat yunus emre ulu cami kale tokalı kanyon kurtini mağara yılkı" },
    { t: "Ekonomi", href: "ekonomi.html", k: "ekonomi tarım haşhaş leblebi patates şeker pancarı hayvancılık sanayi ticaret altın" },
    { t: "Lezzet & Kültür", href: "lezzet.html", k: "lezzet yemek leblebi ekmek kebap haşhaş hamur işi gastronomi kültür" },
    { t: "Galeri", href: "galeri.html", k: "galeri fotoğraf görsel resim şehir akdağ köy manzara" },
    { t: "Geleneklerimiz", href: "geleneklerimiz.html", k: "gelenek adet ramazan iftar kabir arife bayram dogum besik dogdu pelte corbasi dis duzlamasi hedik sunnet dugun takim gelin cumasi kultur" },
    { t: "Nöbetçi Eczaneler", href: "nobetci-eczaneler.html", k: "eczane nöbetçi ilaç ecza bugün harita" },
    { t: "Vefat İlanları", href: "cenaze-ilanlari.html", k: "vefat cenaze ilan duyuru ölüm taziye" },
    { t: "Ulaşım & İletişim", href: "ulasim.html", k: "ulaşım otobüs tren havalimanı konaklama otel yatak iletişim adres telefon form" },
  ];

  function norm(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g")
      .replace(/[ıİ]/g, "i").replace(/[öÖ]/g, "o")
      .replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
      .replace(/[^a-z0-9 ]/g, "");
  }

  function search(q) {
    q = norm(q);
    if (!q || q.length < 2) return [];
    var terms = q.split(" ").filter(Boolean);
    var out = [];
    INDEX.forEach(function (page) {
      var hay = norm(page.t + " " + page.k);
      var hits = terms.filter(function (t) { return hay.indexOf(t) !== -1; }).length;
      if (hits > 0) {
        out.push({ page: page, score: hits + (hay.indexOf(q) !== -1 ? 2 : 0) });
      }
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.map(function (o) { return o.page; });
  }

  function ensureUI() {
    var box = document.getElementById("site-search");
    if (box) return;
    var bar = document.getElementById("search-bar");
    if (!bar) return;
    bar.hidden = false;
    bar.innerHTML =
      '<form class="search-form" role="search" action="javascript:void 0">' +
      '<input id="site-search" class="search-input" type="search" placeholder="Sandıklı’da ara… (eczane, termal, haber…)" autocomplete="off" aria-label="Site içinde ara" />' +
      '<ul id="search-results" class="search-results" hidden></ul>' +
      "</form>";
    box = document.getElementById("site-search");
    if (!box) return;
    box.addEventListener("input", render);
    box.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        box.value = "";
        hideResults();
        box.blur();
      }
    });
    document.addEventListener("click", function (e) {
      if (!bar.contains(e.target)) hideResults();
    });
  }

  function render() {
    var box = document.getElementById("site-search");
    var list = document.getElementById("search-results");
    if (!box || !list) return;
    var term = box.value.trim();
    var items = search(term);
    if (!items.length) return hideResults();
    list.innerHTML = items
      .map(function (p) {
        return '<li><a href="' + p.href + '">' + p.t + "</a></li>";
      })
      .join("");
    list.hidden = false;
  }

  function hideResults() {
    var list = document.getElementById("search-results");
    if (list) list.hidden = true;
  }

  // Sadece index.html üzerinde çalıştır (search-bar orada)
  var page = (location.pathname.split("/").pop() || "").toLowerCase();
  if (page === "index.html" || page === "" || page === "index") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureUI);
    } else {
      ensureUI();
    }
  }
})();
