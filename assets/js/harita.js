/* Sandıklı Portal — ilçe haritası
   Veri: assets/harita/sandikli.json (OpenStreetMap idari sınırları, ODbL).
   Harita kütüphanesi CDN'den gelir; CDN'e ulaşılamazsa sayfa metni ve köy
   listesi çalışmaya devam eder, yalnızca harita yerine açıklama görünür. */
(function () {
  "use strict";

  var kap = document.getElementById("harita");
  if (!kap) return;

  var bekleme = document.getElementById("harita-yukleniyor");
  var sifirla = document.getElementById("harita-sifirla");

  var AYLAR_YON = ["kuzey", "kuzeydoğu", "doğu", "güneydoğu", "güney", "güneybatı", "batı", "kuzeybatı"];

  function yonAdi(dLat, dLon, enlem) {
    // Doğu-batı mesafesini enleme göre ölçekle; açı 0 = kuzey.
    var aci = (Math.atan2(dLon * Math.cos((enlem * Math.PI) / 180), dLat) * 180) / Math.PI;
    var i = Math.round((((aci % 360) + 360) % 360) / 45) % 8;
    return AYLAR_YON[i];
  }

  function halkaCevir(halka) {
    return halka.map(function (p) {
      return [p[1], p[0]];
    });
  }

  function merkez(halka) {
    var lat = 0;
    var lon = 0;
    for (var i = 0; i < halka.length; i++) {
      lon += halka[i][0];
      lat += halka[i][1];
    }
    return [lat / halka.length, lon / halka.length];
  }

  // Komşu etiketi ilçe merkezine en yakın sınır noktasına konur: merkez
  // noktası ekran dışında kalınca ad görünmez oluyordu.
  function sinirNoktasi(halka, hedef) {
    var en_iyi = null;
    var en_az = Infinity;
    for (var i = 0; i < halka.length; i++) {
      var d = Math.pow(halka[i][0] - hedef[0], 2) + Math.pow(halka[i][1] - hedef[1], 2);
      if (d < en_az) {
        en_az = d;
        en_iyi = halka[i];
      }
    }
    if (!en_iyi) return null;
    var m = merkez(halka); // [lat, lon]
    var p = [en_iyi[1], en_iyi[0]]; // halka [lon, lat] → Leaflet [lat, lon]
    return [p[0] + (m[0] - p[0]) * 0.25, p[1] + (m[1] - p[1]) * 0.25];
  }

  function alanKm2(halka) {
    var R = 6371.0088;
    var t = 0;
    for (var i = 0; i < halka.length - 1; i++) {
      var lon1 = (halka[i][0] * Math.PI) / 180;
      var lat1 = (halka[i][1] * Math.PI) / 180;
      var lon2 = (halka[i + 1][0] * Math.PI) / 180;
      var lat2 = (halka[i + 1][1] * Math.PI) / 180;
      t += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs((t * R * R) / 2);
  }

  function yaz(alan, deger) {
    var el = document.querySelector('[data-alan="' + alan + '"]');
    if (el) el.textContent = deger;
  }

  function hata(mesaj) {
    if (bekleme) {
      bekleme.textContent = mesaj;
      bekleme.classList.add("is-hata");
      bekleme.hidden = false;
    }
  }

  fetch("assets/harita/sandikli.json", { cache: "no-cache" })
    .then(function (y) {
      if (!y.ok) throw new Error("veri");
      return y.json();
    })
    .then(ciz)
    .catch(function () {
      hata("Harita verisi yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.");
    });

  function ciz(veri) {
    if (typeof L === "undefined") {
      hata("Harita kütüphanesi yüklenemedi; köy listesi aşağıda kullanılabilir.");
      return;
    }

    var harita = L.map(kap, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
      preferCanvas: true,
      minZoom: 7,
      maxZoom: 16,
    });

    L.control.zoom({ position: "bottomright" }).addTo(harita);
    // Hata ayıklama ve dış bağlantılar için harita nesnesini öğede tut.
    kap.haritaNesnesi = harita;
    harita.attributionControl.setPrefix("");

    // Anahtarsız resmî OSM döşemeleri (kullanım politikasına uygun, atıf zorunlu).
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> katkıcıları',
    }).addTo(harita);

    // Dokununca/tek tıkla tekerlek yakınlaştırması açılır (sayfa kaydırmayı bozmasın).
    harita.on("click focus", function () {
      harita.scrollWheelZoom.enable();
    });

    // ---------------------------------------------------------- ilçe sınırı
    var sinirHalkalari = veri.sinir.map(halkaCevir);
    var sinirKat = L.polygon(sinirHalkalari, {
      color: "#0d6a5c",
      weight: 2.4,
      opacity: 1,
      fillColor: "#0d6a5c",
      fillOpacity: 0.08,
      className: "harita-sinir",
    }).addTo(harita);
    sinirKat.bindTooltip("Sandıklı ilçe sınırı", { sticky: true });

    // ---------------------------------------------------------- komşu ilçeler
    var komsuKat = L.layerGroup();
    var komsuEtiketleri = [];
    var merkezNokta = veri.meta.merkez; // [lon, lat]
    var komsuListesi = document.getElementById("harita-komsu-listesi");
    if (komsuListesi) komsuListesi.textContent = "";

    veri.komsular.forEach(function (k) {
      var halkalar = [halkaCevir(k.halka)];
      var poligon = L.polygon(halkalar, {
        color: "#9b5330",
        weight: 1.3,
        opacity: 0.9,
        dashArray: "5 4",
        fill: false,
        interactive: true,
      }).addTo(komsuKat);

      poligon.bindTooltip(k.ad, { sticky: true });

      var m = merkez(k.halka);
      var yon = yonAdi(m[0] - merkezNokta[1], m[1] - merkezNokta[0], merkezNokta[1]);
      var etiketNoktasi = sinirNoktasi(k.halka, merkezNokta) || m;
      komsuEtiketleri.push(
        L.marker(etiketNoktasi, {
          interactive: false,
          icon: L.divIcon({
            className: "harita-komsu-etiket",
            html: '<span>' + k.ad + "</span>",
            iconSize: null,
            iconAnchor: [0, 0],
          }),
        }).addTo(komsuKat)
      );

      if (komsuListesi) {
        var li = document.createElement("li");
        li.className = "harita-komsu";
        var ad = document.createElement("strong");
        ad.textContent = k.ad;
        var il = document.createElement("span");
        il.textContent = (k.il || "Afyonkarahisar") + " · " + yon;
        li.appendChild(ad);
        li.appendChild(il);
        komsuListesi.appendChild(li);
      }
    });

    if (komsuListesi) {
      var ulke = document.createElement("li");
      ulke.className = "harita-komsu harita-komsu-not";
      ulke.textContent = "Komşu ilçe sınırları yalnızca bağlam için gösterilir; Sandıklı sınırı yeşil çizgidir.";
      komsuListesi.appendChild(ulke);
    }
    komsuKat.addTo(harita);

    // ---------------------------------------------------------- köyler
    var koyKat = L.layerGroup();
    var markerlar = [];
    var liste = document.getElementById("harita-koyler");
    if (liste) liste.textContent = "";

    veri.koyler.forEach(function (k) {
      var marker = L.circleMarker([k.lat, k.lon], {
        radius: 4.5,
        color: "#0b3a31",
        weight: 1.4,
        fillColor: "#f7f3e8",
        fillOpacity: 1,
      }).addTo(koyKat);

      var icerik = document.createElement("div");
      icerik.className = "harita-popup";
      var ad = document.createElement("strong");
      ad.textContent = k.ad;
      var tip = document.createElement("span");
      tip.className = "harita-popup-tip";
      tip.textContent = k.tip === "hamlet" ? "Yayla / mezra" : "Köy";
      var yol = document.createElement("a");
      yol.href = "https://www.google.com/maps/dir/?api=1&destination=" + k.lat + "," + k.lon;
      yol.target = "_blank";
      yol.rel = "noopener";
      yol.textContent = "Yol tarifi";
      icerik.appendChild(ad);
      icerik.appendChild(tip);
      icerik.appendChild(yol);
      marker.bindPopup(icerik);

      marker.bindTooltip(k.ad, {
        permanent: true,
        direction: "right",
        offset: [7, 0],
        className: "harita-etiket",
      });

      markerlar.push(marker);

      if (liste) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "harita-koy";
        b.textContent = k.ad;
        b.addEventListener("click", function () {
          // Animasyonsuz geçiş: bazı tarayıcı/ayarlarda CSS geçişi tamamlanmıyor
          // ve harita eski yakınlaştırmada kilitli kalıyor.
          harita.stop();
          harita.setView([k.lat, k.lon], 14, { animate: false });
          marker.openPopup();
        });
        liste.appendChild(b);
      }
    });
    koyKat.addTo(harita);

    // ---------------------------------------------------------- etiket yoğunluğu
    // Ekran kenarında yarım kalan komşu adlarını gizle.
    function komsuEtiketKirp() {
      var gorunen = harita.getBounds().pad(-0.03);
      komsuEtiketleri.forEach(function (e) {
        var el = e.getElement();
        if (el) el.style.visibility = gorunen.contains(e.getLatLng()) ? "" : "hidden";
      });
    }

    function etiketAyari() {
      // 60 yerleşim aynı ekranda üst üste binmesin: adlar yakınlaşınca görünür.
      kap.classList.toggle("etiket-gizli", harita.getZoom() < 11);
    }
    harita.on("zoomend", etiketAyari);
    harita.on("moveend", komsuEtiketKirp);

    // ---------------------------------------------------------- katman düğmeleri
    var katmanlar = { sinir: sinirKat, koyler: koyKat, komsular: komsuKat };
    Array.prototype.forEach.call(document.querySelectorAll("[data-katman]"), function (kutu) {
      kutu.addEventListener("change", function () {
        var kat = katmanlar[kutu.getAttribute("data-katman")];
        if (!kat) return;
        if (kutu.checked) kat.addTo(harita);
        else harita.removeLayer(kat);
      });
    });

    function sigdir() {
      // Animasyonsuz: kap gizliyken/ölçü alınmadan başlayan animasyon takılı kalabiliyor.
      harita.fitBounds(sinirKat.getBounds(), { padding: [24, 24], animate: false });
    }

    if (sifirla) sifirla.addEventListener("click", sigdir);

    sigdir();
    etiketAyari();
    komsuEtiketKirp();

    // ---------------------------------------------------------- özet
    yaz("koy", veri.koyler.length);
    yaz("komsu", veri.komsular.length);
    yaz("alan", Math.round(alanKm2(veri.sinir[0])).toLocaleString("tr-TR"));

    if (bekleme) bekleme.hidden = true;
    harita.invalidateSize();
  }
})();
