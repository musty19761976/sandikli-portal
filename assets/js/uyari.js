/* Sandıklı Portal — meteorolojik uyarı bandı
   Veri: assets/hava-uyari.json (scripts/sync_uyari.py, GitHub Actions).
   Yalnızca turuncu/kırmızı seviyede, sayfanın en üstünde ince bir bant çıkar.
   Kapatma tercihi uyarının imzasına bağlıdır: yeni uyarı gelince bant döner. */
(function () {
  "use strict";

  var VERI_URL = "assets/hava-uyari.json";
  var KAPATMA_ANAHTARI = "sandikli.uyari.kapatilan";
  var EN_FAZLA_SAAT = 6; // damga bundan eskiyse bant gösterilmez
  var SEVIYE_ADI = { turuncu: "Turuncu", kirmizi: "Kırmızı" };
  var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
    "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  function kisaZaman(deger) {
    if (!deger) return "";
    var d = new Date(deger);
    if (isNaN(d.getTime())) return "";
    var bugun = new Date();
    var ayniGun = d.getFullYear() === bugun.getFullYear() &&
      d.getMonth() === bugun.getMonth() && d.getDate() === bugun.getDate();
    var saat = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    if (ayniGun) return saat;
    return d.getDate() + " " + AY[d.getMonth()] + " " + saat;
  }

  function kapatildiMi(imza) {
    try {
      return window.localStorage.getItem(KAPATMA_ANAHTARI) === imza;
    } catch (e) {
      return false;
    }
  }

  function kapat(imza) {
    try {
      window.localStorage.setItem(KAPATMA_ANAHTARI, imza);
    } catch (e) { /* gizli mod: yalnızca bu sayfada kapalı kalır */ }
  }

  function imza(veri, uyari) {
    return [
      veri.seviye || "",
      veri.kapsam || "",
      uyari && uyari.seriNo ? uyari.seriNo : "",
      uyari && uyari.zaman ? uyari.zaman : "",
      (veri.uyarilar || []).length
    ].join("|");
  }

  function kapsamAdi(veri) {
    return veri.kapsam === "il" ? veri.il : veri.ilce || veri.il;
  }

  function kur(veri) {
    var seviye = veri.seviye === "kirmizi" ? "kirmizi" : "turuncu";
    var liste = Array.isArray(veri.uyarilar) ? veri.uyarilar : [];
    var uyari = liste[0] || {};
    var imzaDegeri = imza({ seviye: seviye, kapsam: veri.kapsam, uyarilar: liste }, uyari);
    if (kapatildiMi(imzaDegeri)) return;

    var bant = document.createElement("div");
    bant.className = "uyari-bant uyari-" + seviye;
    bant.setAttribute("role", "status");
    bant.setAttribute("aria-live", "polite");

    var ic = document.createElement("div");
    ic.className = "uyari-bant-ic";

    var simge = document.createElement("span");
    simge.className = "uyari-simge";
    simge.setAttribute("aria-hidden", "true");
    simge.textContent = "⚠";

    var metin = document.createElement("p");
    metin.className = "uyari-metin";
    var baslik = document.createElement("strong");
    baslik.textContent = "Meteoroloji " + (SEVIYE_ADI[seviye] || "").toLocaleLowerCase("tr") + " uyarı";
    metin.appendChild(baslik);
    metin.appendChild(document.createTextNode(" · " + kapsamAdi(veri)));

    var hadise = uyari.hadise || (uyari.baslik ? String(uyari.baslik).slice(0, 120) : "");
    var zaman = kisaZaman(uyari.bitis);
    if (hadise) {
      var alt = document.createElement("span");
      alt.className = "uyari-ayrinti";
      alt.textContent = " — " + hadise;
      metin.appendChild(alt);
    }
    if (zaman) {
      // Dar ekranda gizlenir (CSS): bant üç satıra çıkmasın.
      var bitis = document.createElement("span");
      bitis.className = "uyari-bitis";
      bitis.textContent = " · bitiş " + zaman;
      metin.appendChild(bitis);
    }

    var baglanti = document.createElement("a");
    baglanti.className = "uyari-baglanti";
    baglanti.href = veri.kaynak_url || "https://www.mgm.gov.tr/meteouyari/turkiye.aspx";
    baglanti.target = "_blank";
    baglanti.rel = "noopener";
    baglanti.textContent = "MGM'de gör";

    var kaynak = document.createElement("span");
    kaynak.className = "uyari-kaynak";
    var damga = kisaZaman(veri.cekildi);
    kaynak.textContent = "Kaynak: Meteoroloji Genel Müdürlüğü" + (damga ? " · son kontrol " + damga : "");

    var kapatBtn = document.createElement("button");
    kapatBtn.className = "uyari-kapat";
    kapatBtn.type = "button";
    kapatBtn.setAttribute("aria-label", "Uyarı bandını kapat");
    kapatBtn.textContent = "×";
    kapatBtn.addEventListener("click", function () {
      kapat(imzaDegeri);
      bant.remove();
      document.documentElement.classList.remove("uyari-acik");
      document.documentElement.style.removeProperty("--uyari-h");
    });

    ic.appendChild(simge);
    ic.appendChild(metin);
    ic.appendChild(baglanti);
    ic.appendChild(kaynak);
    ic.appendChild(kapatBtn);
    bant.appendChild(ic);

    if (!document.body) return;
    document.body.insertBefore(bant, document.body.firstChild);

    // Navbar sabit olduğu için bandın yüksekliği hem navbarı hem içeriği kaydırır.
    var otur = function () {
      var h = Math.round(bant.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--uyari-h", h + "px");
    };
    otur();
    document.documentElement.classList.add("uyari-acik");
    if (typeof window.ResizeObserver === "function") {
      new window.ResizeObserver(otur).observe(bant);
    } else {
      window.addEventListener("resize", otur);
    }
  }

  function tazeMi(veri) {
    var d = new Date(veri && veri.cekildi);
    if (isNaN(d.getTime())) return false;
    var fark = (Date.now() - d.getTime()) / 3600000;
    return fark >= -1 && fark <= EN_FAZLA_SAAT;
  }

  function basla() {
    if (window.fetch === undefined) return;
    window.fetch(VERI_URL, { cache: "no-store" })
      .then(function (yanit) { return yanit.ok ? yanit.json() : null; })
      .then(function (veri) {
        if (!veri || !veri.seviye) return;
        if (veri.seviye !== "turuncu" && veri.seviye !== "kirmizi") return;
        if (!tazeMi(veri)) return;
        kur(veri);
      })
      .catch(function () { /* veri yoksa bant çıkmaz; sayfa normal çalışır */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", basla, { once: true });
  } else {
    basla();
  }
})();
