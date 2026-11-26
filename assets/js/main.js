/* Sandıklı Portal — interactions */
(function () {
  "use strict";

  // ---------------------------------------------------------------- Simgeler
  // Arayüzde emoji yok: tüm simgeler assets/icons/sprite.svg'ten gelir.
  const SPRITE = "assets/icons/sprite.svg";
  function icon(name, cls) {
    return (
      '<svg class="i' +
      (cls ? " " + cls : "") +
      '" aria-hidden="true" focusable="false">' +
      '<use href="' +
      SPRITE +
      "#" +
      name +
      '"></use></svg>'
    );
  }

  // Kırık uzak görseller (404 / hotlink engeli) boş çerçeve bırakmasın:
  // dokulu yer tutucuya dönüşür, düzeni ve okunabilirliği bozmaz.
  function guardImages() {
    document.querySelectorAll("img").forEach((img) => {
      // Henüz kaynağı olmayan görseller (lightbox kabuğu) yer tutucuya dönüşmesin.
      if (!img.getAttribute("src")) return;
      const fail = () => {
        if (img.dataset.failed) return;
        img.dataset.failed = "1";
        img.classList.add("is-missing");
      };
      if (img.complete && img.naturalWidth === 0) fail();
      img.addEventListener("error", fail, { once: true });
    });
  }

  // Lightbox'ın tek <img> kabuğu her açılışta yeni kaynak alır; eski hata
  // işareti temizlenmezse yeni fotoğraf da yer tutucu olarak görünür.
  function resetImageState(img) {
    if (!img) return;
    img.classList.remove("is-missing");
    delete img.dataset.failed;
  }

  guardImages();

  // Aurora background removed — static canvas surface
  // Navbar, navbar.js fetch sonrası yüklendiğinden interaction kodları
  // ayrıca tanımlanır ve navbar.js tarafından tetiklenir. bkz. _initNavbarInteractions.

  // Reveal on scroll
  const reveals = document.querySelectorAll(".reveal");
  // Gizleme yalnızca JS burada çalıştığında devreye girer (aşamalı iyileştirme).
  if (reveals.length) document.documentElement.classList.add("reveal-ready");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  // Contact form demo
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const success = document.querySelector(".form-success");
      if (success) {
        success.classList.add("show");
        success.textContent =
          "Mesajınız alındı. Teşekkür ederiz — en kısa sürede size dönüş yapılacaktır.";
      }
      form.reset();
      setTimeout(() => success && success.classList.remove("show"), 6000);
    });
  }

  // Active nav link
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http")) return;
    const file = href.split("/").pop();
    if (file === path || (path === "" && file === "index.html")) {
      a.classList.add("active");
    }
  });

  // Year in footer
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Lightbox for gallery
  const lb = document.getElementById("lightbox");
  const lbImg = lb && lb.querySelector("img");
  const lbClose = lb && lb.querySelector(".lightbox-close");
  let lbOpener = null;

  // Kapanışta odağı açan öğeye geri ver; ekran okuyucu diyaloğu artık görmesin.
  function closeLightbox() {
    if (!lb || !lb.classList.contains("open")) return;
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lbOpener && typeof lbOpener.focus === "function") lbOpener.focus();
    lbOpener = null;
  }

  function openLightbox(el) {
    if (!lb || !lbImg) return;
    const src = el.getAttribute("data-full") || el.querySelector("img")?.src || el.src;
    const alt = el.getAttribute("data-caption") || el.querySelector("img")?.alt || "";
    resetImageState(lbImg);
    // onerror ataması her açılışta öncekini değiştirir; addEventListener ile
    // görsel başarıyla yüklendiğinde dinleyiciler birikiyordu.
    lbImg.onerror = () => {
      lbImg.dataset.failed = "1";
      lbImg.classList.add("is-missing");
    };
    lbImg.src = src;
    lbImg.alt = alt;
    lbOpener = el;
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (lbClose) lbClose.focus();
  }

  document.querySelectorAll("[data-lightbox]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openLightbox(el);
    });
    // Klavyeyle açılabilir olmalı (bağlantı/buton değilse)
    if (!/^(A|BUTTON)$/.test(el.tagName) && !el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(el);
        }
      });
    }
  });

  if (lb) {
    // Kapatma: arka plana tıklama veya kapat düğmesi (görsele tıklamak kapatmaz)
    lb.addEventListener("click", (e) => {
      if (e.target !== lbImg) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("open")) {
        e.preventDefault();
        closeLightbox();
      }
    });
  }

  // ---------------------------------------------------------------- Hava durumu
  // Tek istek paylaşılır: navbar ikonu ile ana sayfadaki "Bugün Sandıklı'da" kartı
  // aynı veriyi kullanır. Sonuç 15 dakika oturum belleğinde tutulur.
  const HAVA_TTL = 15 * 60 * 1000;
  const HAVA_KEY = "sandikli-hava-v2";
  let havaIstek = null;

  // [açıklama, sprite simge adı]
  const WMO = {
    0: ["Açık", "sun"],
    1: ["Çoğunlukla açık", "cloud-sun"],
    2: ["Parçalı bulutlu", "cloud-sun"],
    3: ["Kapalı", "cloud"],
    45: ["Sisli", "fog"],
    48: ["Kırağılı sis", "fog"],
    51: ["Hafif çisenti", "drizzle"],
    53: ["Çisenti", "drizzle"],
    55: ["Yoğun çisenti", "rain"],
    61: ["Hafif yağmur", "rain"],
    63: ["Yağmur", "rain"],
    65: ["Şiddetli yağmur", "rain"],
    66: ["Dondurucu yağmur", "snow"],
    67: ["Şiddetli dondurucu yağmur", "snow"],
    71: ["Hafif kar", "snow"],
    73: ["Kar", "snow"],
    75: ["Yoğun kar", "snow"],
    77: ["Kar taneleri", "snow"],
    80: ["Hafif sağanak", "drizzle"],
    81: ["Sağanak", "rain"],
    82: ["Şiddetli sağanak", "storm"],
    85: ["Hafif kar sağanağı", "snow"],
    86: ["Kar sağanağı", "snow"],
    95: ["Gök gürültülü", "storm"],
    96: ["Dolu riski", "storm"],
    99: ["Şiddetli dolu", "storm"],
  };

  function loadWeather() {
    if (havaIstek) return havaIstek;

    try {
      const onbellek = JSON.parse(sessionStorage.getItem(HAVA_KEY) || "null");
      if (onbellek && Date.now() - onbellek.ts < HAVA_TTL) {
        havaIstek = Promise.resolve(onbellek);
        return havaIstek;
      }
    } catch (e) {
      /* önbellek okunamadı: ağdan devam */
    }

    // Sandıklı
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=38.465&longitude=30.270" +
      "&current=temperature_2m,apparent_temperature,weather_code," +
      "relative_humidity_2m,wind_speed_10m,precipitation" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min," +
      "precipitation_probability_max" +
      "&forecast_days=7&timezone=Europe%2FIstanbul";

    havaIstek = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((data) => {
        const cur = data.current || {};
        const gunluk = data.daily || {};
        const sayi = (v) => (typeof v === "number" ? Math.round(v) : null);
        const ondalik = (v) => (typeof v === "number" ? Math.round(v * 10) / 10 : null);
        const dizi = (k) => (Array.isArray(gunluk[k]) ? gunluk[k] : []);
        const tarihler = dizi("time");
        const gunler = tarihler.map((tarih, i) => ({
          tarih: tarih,
          code: dizi("weather_code")[i],
          max: sayi(dizi("temperature_2m_max")[i]),
          min: sayi(dizi("temperature_2m_min")[i]),
          yagis: sayi(dizi("precipitation_probability_max")[i]),
        }));
        const out = {
          ts: Date.now(),
          code: cur.weather_code,
          temp: sayi(cur.temperature_2m),
          feels: sayi(cur.apparent_temperature),
          nem: sayi(cur.relative_humidity_2m),
          ruzgar: sayi(cur.wind_speed_10m),
          yagis: ondalik(cur.precipitation),
          max: gunler[0] ? gunler[0].max : null,
          min: gunler[0] ? gunler[0].min : null,
          gunler: gunler,
        };
        try {
          sessionStorage.setItem(HAVA_KEY, JSON.stringify(out));
        } catch (e) {
          /* önbelleğe yazılamadı: sorun değil */
        }
        return out;
      })
      .catch((e) => {
        havaIstek = null;
        throw e;
      });

    return havaIstek;
  }

  // YYYY-MM-DD → "Cum" / "Cuma" (Türkiye saati)
  function gunAdi(tarih, uzun) {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        weekday: uzun ? "long" : "short",
        timeZone: "Europe/Istanbul",
      }).format(new Date(tarih + "T12:00:00Z"));
    } catch (e) {
      return "";
    }
  }

  function gunAy(tarih) {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Istanbul",
      }).format(new Date(tarih + "T12:00:00Z"));
    } catch (e) {
      return tarih;
    }
  }

  // ---------- PWA: service worker kaydı ----------
  initSW();

  // ---------- Hava: yalnızca bugünün ikonu, navbar sağ üst ----------
  initNavWeatherIcon();

  // ---------- Text-to-speech: yalnızca vefat (cenaze) sayfası ----------
  const pageFile = (location.pathname.split("/").pop() || "").toLowerCase();
  if (pageFile === "cenaze-ilanlari.html") {
    initVefatSayfasi();
    initTextToSpeech();
  }

  // ---------- Hava durumu sayfası: hava-durumu.html ----------
  if (document.getElementById("hava-sayfa")) {
    initHavaSayfasi();
  }

  // ---------- Bugün Sandıklı'da: eczane + son vefat + hava (yalnızca ana sayfa) ----------
  if (document.getElementById("bugun-sandiklida")) {
    initBugunSandiklida();
    initPazarKarti();
    initNamazVakitleri();
  }

  // ---------- Nöbetçi Eczane: günün eczanesini en üstte göster ve tabloda vurgula ----------
  if (pageFile === "nobetci-eczaneler.html" || document.getElementById("pharma-table")) {
    initNobetciEczane();
    initEczaneTakvimi();
  }

  initThemeToggle();
  window._initThemeToggle = initThemeToggle;
  // Hava durumu ikonu da navbar yüklendikten sonra çağrılmalı (aynı sıralama deseni)
  window._initNavWeatherIcon = initNavWeatherIcon;

  // ---------- Nöbetçi eczane: 7 günlük takvim + veri tazeliği ----------
  // Kaynak: assets/eczane-data.json (günlük senkron) ve
  // assets/eczane-telefonlar.json (yalnızca iki dizinde aynı görünen numaralar).
  // Numarası doğrulanmamış eczanede arama düğmesi çıkmaz, harita kalır.
  function initEczaneTakvimi() {
    var liste = document.getElementById("eczane-gunler");
    var durum = document.getElementById("veri-durumu");
    var uyari = document.getElementById("veri-uyari");
    if (!liste || !durum) return;

    var AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    var GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

    function isoBugun() {
      try {
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Istanbul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
      } catch (e) {
        return new Date().toISOString().slice(0, 10);
      }
    }

    function isoGun(tarih) {
      var p = String(tarih || "").split(".");
      if (p.length !== 3) return "";
      return p[2] + "-" + p[1] + "-" + p[0];
    }

    var bugun = isoBugun();

    function gunFarki(iso) {
      var t = Date.parse(iso + "T00:00:00Z");
      if (isNaN(t)) return null;
      return Math.round((Date.parse(bugun + "T00:00:00Z") - t) / 86400000);
    }

    function telefonBul(tablosu, ad) {
      if (!tablosu || !ad) return "";
      if (tablosu[ad]) return tablosu[ad];
      var aranan = String(ad).toLocaleLowerCase("tr");
      for (var k in tablosu) {
        if (Object.prototype.hasOwnProperty.call(tablosu, k) && k.toLocaleLowerCase("tr") === aranan) {
          return tablosu[k];
        }
      }
      return "";
    }

    function telRakam(numara) {
      var d = String(numara).replace(/[^0-9]/g, "");
      if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
      return d;
    }

    function telHref(numara) {
      return "tel:+90" + telRakam(numara);
    }

    function telMetin(numara) {
      var d = telRakam(numara);
      if (d.length !== 10) return String(numara);
      return "0" + d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6, 8) + " " + d.slice(8);
    }

    function satirYap(kayit, telefonlar) {
      var iso = isoGun(kayit.tarih);
      var fark = gunFarki(iso);
      var li = document.createElement("li");
      li.className = "eczane-gun" + (fark === 0 ? " is-bugun" : "");

      var tarih = document.createElement("div");
      tarih.className = "eczane-gun-tarih";
      var ad = document.createElement("span");
      ad.className = "eczane-gun-ad";
      var alt = document.createElement("span");
      alt.className = "eczane-gun-gun";

      var p = String(kayit.tarih).split(".");
      var dObj = new Date(iso + "T12:00:00Z");
      var hafta = isNaN(dObj.getTime()) ? "" : GUNLER[dObj.getUTCDay()];
      var kisa = Number(p[0]) + " " + (AYLAR[Number(p[1]) - 1] || "");
      if (fark === 0) {
        ad.textContent = "Bugün";
        alt.textContent = hafta ? hafta + " · " + kisa : kisa;
      } else if (fark === 1) {
        ad.textContent = "Yarın";
        alt.textContent = hafta ? hafta + " · " + kisa : kisa;
      } else {
        ad.textContent = hafta || kisa;
        alt.textContent = hafta ? kisa : "";
      }
      tarih.appendChild(ad);
      tarih.appendChild(alt);

      var govde = document.createElement("div");
      govde.className = "eczane-gun-govde";
      var ecz = document.createElement("p");
      ecz.className = "eczane-gun-eczane";
      ecz.textContent = kayit.eczane;
      govde.appendChild(ecz);
      if (kayit.adres) {
        var adres = document.createElement("p");
        adres.className = "eczane-gun-adres";
        adres.textContent = kayit.adres;
        govde.appendChild(adres);
      }

      var islem = document.createElement("div");
      islem.className = "eczane-gun-islem";
      var numara = telefonBul(telefonlar, kayit.eczane);
      if (numara) {
        var ara = document.createElement("a");
        ara.className = "btn btn-primary";
        ara.href = telHref(numara);
        ara.textContent = "Ara";
        ara.setAttribute("aria-label", kayit.eczane + " — " + telMetin(numara) + " (ara)");
        ara.setAttribute("title", telMetin(numara));
        islem.appendChild(ara);
      }
      if (kayit.harita) {
        var harita = document.createElement("a");
        harita.className = "btn btn-outline-dark";
        harita.href = kayit.harita;
        harita.target = "_blank";
        harita.rel = "noopener";
        harita.textContent = "Harita";
        islem.appendChild(harita);
      }

      li.appendChild(tarih);
      li.appendChild(govde);
      li.appendChild(islem);
      return li;
    }

    function durumYaz(veri) {
      var zaman = veri.guncelleme_zamani ? Date.parse(veri.guncelleme_zamani) : NaN;
      var yasSaat = isNaN(zaman) ? null : (Date.now() - zaman) / 3600000;
      var gunF = gunFarki(veri.guncelleme);

      if (yasSaat === null && gunF === null) return null;

      var metin;
      if (yasSaat !== null && yasSaat < 24) {
        metin = yasSaat < 1 ? "az önce" : Math.max(1, Math.round(yasSaat)) + " saat önce";
      } else {
        var g = gunF;
        if (g === null) g = Math.floor(yasSaat / 24);
        metin = g <= 0 ? "bugün" : g === 1 ? "dün" : g + " gün önce";
      }

      var bayat = (yasSaat !== null && yasSaat >= 48) || (gunF !== null && gunF >= 2);
      var eski = (yasSaat !== null && yasSaat >= 24) || (gunF !== null && gunF >= 1);

      durum.hidden = false;
      durum.classList.toggle("is-eski", eski && !bayat);
      durum.classList.toggle("is-bayat", bayat);
      durum.textContent = "Son senkron: " + metin;
      durum.setAttribute("title", "Nöbetçi eczane listesi en son " + metin + " güncellendi");

      return { bayat: bayat, gunF: gunF };
    }

    function uyariYaz(bilgi, kayitlar) {
      if (!uyari) return;
      var mesajlar = [];
      if (bilgi && bilgi.bayat) {
        var g = bilgi.gunF;
        mesajlar.push(
          "Bu liste " + (g !== null && g >= 2 ? g + " gündür" : "iki gündür") +
            " güncellenemedi; nöbetçi eczane değişmiş olabilir."
        );
      }
      var son = kayitlar[kayitlar.length - 1];
      var sonFark = son ? gunFarki(isoGun(son.tarih)) : null;
      if (sonFark !== null && sonFark > 0) {
        mesajlar.push("Listelenen dönem bugünü kapsamıyor.");
      }
      if (!mesajlar.length) {
        uyari.hidden = true;
        return;
      }

      uyari.textContent = "";
      uyari.appendChild(document.createTextNode(mesajlar.join(" ") + " Güncel bilgi için belediyeyi arayın: "));
      var tel = document.createElement("a");
      tel.href = "tel:+904446003";
      tel.textContent = "444 60 03";
      uyari.appendChild(tel);
      uyari.hidden = false;
    }

    function ciz(veri, telVeri) {
      if (!veri || !Array.isArray(veri.eczaneler) || !veri.eczaneler.length) return;
      var telefonlar = (telVeri && telVeri.telefonlar) || {};

      var kayitlar = veri.eczaneler.slice().sort(function (a, b) {
        return isoGun(a.tarih) < isoGun(b.tarih) ? -1 : 1;
      });
      // gunFarki: bugün - kayıt tarihi. Gelecek günler negatif, bugün 0.
      var gelecek = kayitlar.filter(function (k) {
        var f = gunFarki(isoGun(k.tarih));
        return f !== null && f <= 0;
      }).slice(0, 7);
      if (!gelecek.length) return;

      liste.textContent = "";
      gelecek.forEach(function (k) {
        liste.appendChild(satirYap(k, telefonlar));
      });

      // Bugün kartındaki arama düğmesi (numara doğrulanmışsa görünür).
      var bugunKayit = gelecek[0];
      if (gunFarki(isoGun(bugunKayit.tarih)) === 0) {
        var numara = telefonBul(telefonlar, bugunKayit.eczane);
        var bugunAra = document.getElementById("today-pharmacy-call");
        if (bugunAra && numara) {
          bugunAra.href = telHref(numara);
          bugunAra.setAttribute("aria-label", bugunKayit.eczane + " — " + telMetin(numara) + " (ara)");
          bugunAra.hidden = false;
        }
      }

      uyariYaz(durumYaz(veri), kayitlar);
    }

    function cek(ad) {
      return fetch(ad, { cache: "no-store" })
        .then(function (y) {
          return y.ok ? y.json() : null;
        })
        .catch(function () {
          return null;
        });
    }

    Promise.all([cek("assets/eczane-data.json"), cek("assets/eczane-telefonlar.json")]).then(function (sonuc) {
      ciz(sonuc[0], sonuc[1]);
    });
  }

  function initThemeToggle() {
    const root = document.documentElement;
    const KEY = "sandikli-theme";

    // Varsayılan: sistem tercihi; localStorage'dan üzerine yaz
    const stored = (() => {
      try { return localStorage.getItem(KEY); } catch (e) { return null; }
    })();
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : systemDark ? "dark" : "light";
    root.setAttribute("data-theme", theme);

    const inner = document.querySelector(".navbar-inner");
    if (!inner) return;

    let btn = document.getElementById("theme-toggle");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "theme-toggle";
      btn.type = "button";
      btn.className = "theme-toggle";
      btn.setAttribute("aria-label", "Renk temasını değiştir");
      btn.title = theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç";
      const target = inner.querySelector(".nav-toggle") || inner.querySelector(".nav-links") || inner;
      inner.insertBefore(btn, target);
    }

    function paintThemeButton(isDark) {
      btn.innerHTML = icon(isDark ? "sun" : "moon");
      btn.setAttribute("aria-pressed", String(isDark));
      const label = isDark ? "Açık temaya geç" : "Koyu temaya geç";
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }

    paintThemeButton(theme === "dark");
    // Birden fazla init çağrısı (navbar.js + main.js) dinleyiciyi çoğaltmasın:
    // iki dinleyici tek tıkla temayı ileri-geri alıp "çalışmıyor" gibi görünüyordu.
    if (btn.dataset.themeInit === "1") return;
    btn.dataset.themeInit = "1";
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      paintThemeButton(next === "dark");
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  function initSW() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js", { updateViaCache: "none" })
        .then((reg) => {
          // GitHub Pages sw.js'i ~10 dk önbellekleyebiliyor: hemen güncelleme kontrolü.
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("SW kayıt başarısız:", err);
        });
    });

    // Yeni service worker devreye girdiğinde sayfayı bir kez tazele: eski CSS/JS
    // ile yeni HTML karışımı kullanıcıya "site bozuk" görünmesin. İlk kurulumda
    // (önceden kontrolcü yokken) yenileme yapılmaz, döngü de engellenir.
    const oncekiKontrolcu = !!navigator.serviceWorker.controller;
    let yenilendi = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!oncekiKontrolcu || yenilendi) return;
      yenilendi = true;
      try {
        if (sessionStorage.getItem("sandikli-sw-yenile") === "1") return;
        sessionStorage.setItem("sandikli-sw-yenile", "1");
      } catch (e) {
        /* özel mod: yine de bir kez yenile */
      }
      location.reload();
    });
  }

  function initNavWeatherIcon() {
    const inner = document.querySelector(".navbar-inner");
    if (!inner) return;
    // navbar.js ve main.js ikisi de çağırıyor: tek istek yapılsın.
    if (window._navWeatherInit) return;
    window._navWeatherInit = true;

    // Sağ üst: menü / hamburger'ın hemen solu
    let el = document.getElementById("nav-weather");
    if (!el) {
      el = document.createElement("span");
      el.id = "nav-weather";
      el.className = "nav-weather";
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", "Sandıklı hava durumu");
      el.hidden = true;
      const toggleBtn = inner.querySelector(".nav-toggle");
      if (toggleBtn) {
        inner.insertBefore(el, toggleBtn);
      } else {
        const nav = inner.querySelector(".nav-links");
        if (nav) nav.appendChild(el);
        else inner.appendChild(el);
      }
    }

    loadWeather()
      .then((w) => {
        const pair = WMO[w.code] || ["Hava", "thermometer"];
        el.innerHTML =
          icon(pair[1]) +
          (w.temp != null ? '<span class="nav-weather-temp">' + w.temp + "°</span>" : "");
        el.title =
          w.temp != null ? `Sandıklı · ${pair[0]} · ${w.temp}°C` : `Sandıklı · ${pair[0]}`;
        el.setAttribute(
          "aria-label",
          w.temp != null
            ? `Sandıklı hava: ${pair[0]}, ${w.temp} derece`
            : `Sandıklı hava: ${pair[0]}`
        );
        el.hidden = false;
        // fade-in
        requestAnimationFrame(() => el.classList.add("is-ready"));
      })
      .catch((e) => {
        console.warn("SandikliPortal: hava durumu alinamadi:", e?.message ?? "unknown");
        el.hidden = true;
      });
  }

  // ---------- Vefat ilanları: bugün defnedilecekler + veri tazeliği ----------
  // Kartlardaki "Defin tarihi" bugünse ilan listenin başına taşınır ve
  // rozetlenir. Senkron yaşı assets/cenaze-meta.json'dan okunur; iki günü
  // geçen veri "bayat" sayılır ve sayfada uyarı çıkar.
  function initVefatSayfasi() {
    var liste = document.querySelector(".vefat-list");
    var durum = document.getElementById("vefat-veri-durumu");
    var uyari = document.getElementById("vefat-veri-uyari");

    function trBugun() {
      try {
        return new Intl.DateTimeFormat("tr-TR", {
          timeZone: "Europe/Istanbul",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date());
      } catch (e) {
        var d = new Date();
        return (
          String(d.getDate()).padStart(2, "0") +
          "." +
          String(d.getMonth() + 1).padStart(2, "0") +
          "." +
          d.getFullYear()
        );
      }
    }

    var bugun = trBugun();

    // 1) Bugün defnedilecekler en üste (kendi içinde kaynak sırası korunur)
    if (liste) {
      var kartlar = [].slice.call(liste.querySelectorAll(".vefat-card"));
      var bugunkuler = kartlar.filter(function (kart) {
        var kutular = kart.querySelectorAll(".vefat-meta > div");
        for (var i = 0; i < kutular.length; i++) {
          var etiket = kutular[i].querySelector("span");
          var deger = kutular[i].querySelector("strong");
          if (etiket && deger && /defin tarihi/i.test(etiket.textContent)) {
            return deger.textContent.trim() === bugun;
          }
        }
        return false;
      });
      bugunkuler
        .slice()
        .reverse()
        .forEach(function (kart) {
          liste.insertBefore(kart, liste.firstChild);
        });
      bugunkuler.forEach(function (kart) {
        kart.classList.add("vefat-card--bugun");
        var bas = kart.querySelector(".head");
        if (bas && !bas.querySelector(".vefat-bugun")) {
          var rozet = document.createElement("span");
          rozet.className = "vefat-bugun";
          rozet.textContent = "Bugün defnediliyor";
          bas.appendChild(rozet);
        }
      });
    }

    // 2) Son senkron yaşı + bayat veri uyarısı
    if (!durum) return;
    fetch("assets/cenaze-meta.json", { cache: "no-store" })
      .then(function (y) {
        return y.ok ? y.json() : null;
      })
      .then(function (meta) {
        if (!meta) return;
        var zaman = meta.guncelleme_zamani ? Date.parse(meta.guncelleme_zamani) : NaN;
        var yasSaat = isNaN(zaman) ? null : (Date.now() - zaman) / 3600000;
        var gunF = null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(meta.guncelleme || "")) {
          var bugunIso;
          try {
            bugunIso = new Intl.DateTimeFormat("en-CA", {
              timeZone: "Europe/Istanbul",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date());
          } catch (e) {
            bugunIso = new Date().toISOString().slice(0, 10);
          }
          gunF = Math.round(
            (Date.parse(bugunIso + "T00:00:00Z") - Date.parse(meta.guncelleme + "T00:00:00Z")) / 86400000
          );
        }
        if (yasSaat === null && gunF === null) return;

        var metin;
        if (yasSaat !== null && yasSaat < 24) {
          metin = yasSaat < 1 ? "az önce" : Math.max(1, Math.round(yasSaat)) + " saat önce";
        } else {
          var g = gunF;
          if (g === null) g = Math.floor(yasSaat / 24);
          metin = g <= 0 ? "bugün" : g === 1 ? "dün" : g + " gün önce";
        }

        var bayat = (yasSaat !== null && yasSaat >= 48) || (gunF !== null && gunF >= 2);
        var eski = (yasSaat !== null && yasSaat >= 24) || (gunF !== null && gunF >= 1);

        durum.hidden = false;
        durum.classList.toggle("is-eski", eski && !bayat);
        durum.classList.toggle("is-bayat", bayat);
        durum.textContent = "Son senkron: " + metin;
        durum.setAttribute("title", "Vefat ilanları en son " + metin + " güncellendi");

        if (!uyari || !bayat) return;
        uyari.hidden = false;
        uyari.textContent =
          "Vefat ilanları " +
          (gunF !== null && gunF >= 2 ? gunF + " gündür" : "iki gündür") +
          " güncellenemedi; yeni ilanlar bu sayfada görünmüyor olabilir. ";
        var baglanti = document.createElement("a");
        baglanti.href = "https://sandikli.bel.tr/cenaze-ilanlari";
        baglanti.target = "_blank";
        baglanti.rel = "noopener";
        baglanti.textContent = "Güncel liste için belediye sayfası";
        uyari.appendChild(baglanti);
      })
      .catch(function () {
        /* meta yoksa rozet gizli kalır; sayfa normal çalışır */
      });
  }

  function initTextToSpeech() {
    const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    let floatBtn = document.getElementById("tts-float-stop");
    if (!floatBtn) {
      floatBtn = document.createElement("button");
      floatBtn.id = "tts-float-stop";
      floatBtn.type = "button";
      floatBtn.className = "tts-float";
      floatBtn.setAttribute("aria-label", "Seslendirmeyi durdur");
      floatBtn.innerHTML = icon("stop") + " Seslendirmeyi durdur";
      document.body.appendChild(floatBtn);
    }

    let activeBtn = null;
    let activeBlock = null;

    function pickTurkishVoice() {
      const voices = speechSynthesis.getVoices() || [];
      return (
        voices.find((v) => /tr(-|_)?TR/i.test(v.lang)) ||
        voices.find((v) => /^tr/i.test(v.lang)) ||
        voices.find((v) => /turkish|türkçe|turk/i.test(v.name)) ||
        null
      );
    }

    function stopSpeech() {
      if (supported) speechSynthesis.cancel();
      if (activeBtn) {
        activeBtn.classList.remove("is-playing");
        activeBtn.innerHTML = icon("speak", "tts-icon") + " Dinle";
        activeBtn.setAttribute("aria-pressed", "false");
      }
      if (activeBlock) activeBlock.classList.remove("is-speaking");
      activeBtn = null;
      activeBlock = null;
      floatBtn.classList.remove("show");
    }

    floatBtn.addEventListener("click", stopSpeech);
    window.addEventListener("beforeunload", stopSpeech);

    function speakText(text, btn, block) {
      if (!supported) {
        alert("Tarayıcınız seslendirmeyi desteklemiyor. Chrome veya Edge deneyin.");
        return;
      }
      const clean = (text || "").replace(/\s+/g, " ").trim();
      if (!clean || clean.length < 8) return;

      if (activeBtn === btn && speechSynthesis.speaking) {
        stopSpeech();
        return;
      }

      stopSpeech();

      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "tr-TR";
      u.rate = 0.95;
      u.pitch = 1;
      u.volume = 1;
      const voice = pickTurkishVoice();
      if (voice) u.voice = voice;

      u.onstart = () => {
        activeBtn = btn;
        activeBlock = block;
        btn.classList.add("is-playing");
        btn.innerHTML = icon("stop", "tts-icon") + " Durdur";
        btn.setAttribute("aria-pressed", "true");
        if (block) block.classList.add("is-speaking");
        floatBtn.classList.add("show");
      };
      u.onend = stopSpeech;
      u.onerror = stopSpeech;

      const start = () => speechSynthesis.speak(u);
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.onvoiceschanged = () => {
          const v = pickTurkishVoice();
          if (v) u.voice = v;
          start();
        };
        setTimeout(start, 250);
      } else {
        start();
      }
    }

    function getSpeakableText(el) {
      if (el.getAttribute("data-speak-text")) {
        return el.getAttribute("data-speak-text");
      }
      const clone = el.cloneNode(true);
      clone.querySelectorAll(".tts-toolbar, .tts-btn, script, style, nav").forEach((n) => n.remove());
      return (clone.innerText || clone.textContent || "").trim();
    }

    function attachToolbar(block) {
      if (!block || block.dataset.ttsReady === "1") return;
      block.dataset.ttsReady = "1";
      block.classList.add("speakable");

      const toolbar = document.createElement("div");
      toolbar.className = "tts-toolbar";
      toolbar.setAttribute("role", "group");
      toolbar.setAttribute("aria-label", "Seslendirme");

      if (!supported) {
        toolbar.innerHTML =
          '<span class="tts-unsupported">Seslendirme bu tarayıcıda yok (Chrome/Edge önerilir)</span>';
        block.insertBefore(toolbar, block.firstChild);
        return;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tts-btn";
      btn.innerHTML = icon("speak", "tts-icon") + " Dinle";
      btn.setAttribute("aria-pressed", "false");
      btn.title = "Bu vefat duyurusunu sesli dinle";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        speakText(getSpeakableText(block), btn, block);
      });

      toolbar.appendChild(btn);
      // Vefat kartında başlığın üstüne koy
      const head = block.querySelector(".head");
      if (head) {
        head.insertBefore(toolbar, head.firstChild);
      } else {
        block.insertBefore(toolbar, block.firstChild);
      }
    }

    // Yalnızca vefat kartları
    document.querySelectorAll(".vefat-card").forEach((el) => {
      if (getSpeakableText(el).length >= 20) attachToolbar(el);
    });
  }

  function initNobetciEczane() {
    const table = document.getElementById("pharma-table") || document.querySelector(".pharma-table");
    const card = document.getElementById("today-pharmacy-card");
    if (!table) return;

    // Türkiye saatiyle bugünün tarihini al
    const now = new Date();
    let day = "", month = "", year = "";
    let formattedLongDate = "";

    try {
      const partsFormatter = new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      const parts = partsFormatter.formatToParts(now);
      day = parts.find((p) => p.type === "day")?.value || "";
      month = parts.find((p) => p.type === "month")?.value || "";
      year = parts.find((p) => p.type === "year")?.value || "";

      const longFormatter = new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long"
      });
      formattedLongDate = longFormatter.format(now);
    } catch (e) {
      // Fallback
      const d = String(now.getDate()).padStart(2, "0");
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const y = now.getFullYear();
      day = d;
      month = m;
      year = String(y);
      formattedLongDate = `${d}.${m}.${y}`;
    }

    const todayStr = `${day}.${month}.${year}`;
    const rows = table.querySelectorAll("tbody tr");
    let matchedRow = null;

    rows.forEach((tr) => {
      const dateCell = tr.querySelector(".date");
      if (!dateCell) return;
      const cellText = dateCell.textContent.trim();
      if (cellText === todayStr) {
        matchedRow = tr;
      }
    });

    // Eğer bugünün tarihi tabloda bulunduysa
    if (matchedRow) {
      rows.forEach((r) => r.classList.remove("today"));
      matchedRow.classList.add("today");

      const name = matchedRow.querySelector(".name")?.textContent?.trim() || "";
      const addr = matchedRow.querySelector('[data-label="Adres"]')?.textContent?.trim() || "";
      const mapLink = matchedRow.querySelector('[data-label="Harita"] a')?.getAttribute("href") || "#";

      if (card) {
        const nameEl = document.getElementById("today-pharmacy-name");
        const addrEl = document.getElementById("today-pharmacy-addr");
        const mapEl = document.getElementById("today-pharmacy-map");
        const dateEl = document.getElementById("today-date-display");

        if (nameEl && name) nameEl.textContent = name;
        if (addrEl && addr) {
          addrEl.innerHTML = icon("pin") + " " + addr;
        }
        if (mapEl && mapLink && mapLink !== "#") {
          mapEl.setAttribute("href", mapLink);
        }
        if (dateEl && formattedLongDate) {
          dateEl.textContent = formattedLongDate;
        }
      }
    } else {
      // Tabloda mevcut bir .today satırı varsa kartı onunla senkronize et
      const existingToday = table.querySelector("tr.today");
      if (existingToday && card) {
        const name = existingToday.querySelector(".name")?.textContent?.trim() || "";
        const addr = existingToday.querySelector('[data-label="Adres"]')?.textContent?.trim() || "";
        const mapLink = existingToday.querySelector('[data-label="Harita"] a')?.getAttribute("href") || "#";
        const nameEl = document.getElementById("today-pharmacy-name");
        const addrEl = document.getElementById("today-pharmacy-addr");
        const mapEl = document.getElementById("today-pharmacy-map");
        const dateEl = document.getElementById("today-date-display");

        if (nameEl && name) nameEl.textContent = name;
        if (addrEl && addr) {
          addrEl.innerHTML = icon("pin") + " " + addr;
        }
        if (mapEl && mapLink && mapLink !== "#") {
          mapEl.setAttribute("href", mapLink);
        }
        if (dateEl && formattedLongDate) {
          dateEl.textContent = formattedLongDate;
        }
      }
    }
  }

  // Navbar interaction'ları — navbar.js fetch ile navbar'ı yükledikten
  // SONRA çağrılır (ilk yüklemede navbar yok, bu yüzden burada tanımlı).
  // Ana sayfa: "Bugün Sandıklı'da" üçlü kartı.
  // Kaynaklar: assets/eczane-data.json + assets/cenaze-data.json (günlük senkron) ve
  // Open-Meteo. Veri gelmeyen kutu gizli kalır; üçü de gelmezse bölüm gizlenir.
  function initBugunSandiklida() {
    const bolum = document.getElementById("bugun-sandiklida");
    if (!bolum) return;
    const alan = (ad) => bolum.querySelector('[data-field="' + ad + '"]');
    const yaz = (ad, metin) => {
      const el = alan(ad);
      if (el) el.textContent = metin;
    };
    let gosterilen = 0;
    const goster = (id) => {
      const el = document.getElementById(id);
      if (el && el.hidden) {
        el.hidden = false;
        gosterilen += 1;
      }
    };

    // Türkiye saatiyle bugün (gg.aa.yyyy)
    function bugunStr() {
      try {
        const parts = new Intl.DateTimeFormat("tr-TR", {
          timeZone: "Europe/Istanbul",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).formatToParts(new Date());
        const al = (t) => (parts.find((p) => p.type === t) || {}).value || "";
        return al("day") + "." + al("month") + "." + al("year");
      } catch (e) {
        const d = new Date();
        return (
          String(d.getDate()).padStart(2, "0") +
          "." +
          String(d.getMonth() + 1).padStart(2, "0") +
          "." +
          d.getFullYear()
        );
      }
    }

    // gg.aa.yyyy → bugünden kaç gün sonra (negatifse geçmiş)
    function gunFarki(hedef) {
      const hedefParca = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(hedef || "");
      const bugunParca = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(bugunStr());
      if (!hedefParca || !bugunParca) return NaN;
      const hedefMs = Date.UTC(+hedefParca[3], +hedefParca[2] - 1, +hedefParca[1]);
      const bugunMs = Date.UTC(+bugunParca[3], +bugunParca[2] - 1, +bugunParca[1]);
      return (hedefMs - bugunMs) / 86400000;
    }

    const bugun = bugunStr();

    // 1) Nöbetçi eczane
    const eczane = fetch("assets/eczane-data.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((veri) => {
        const rows = Array.isArray(veri) ? veri : (veri && veri.eczaneler) || [];
        if (!rows.length) return;
        const bugunun = rows.find((x) => x.tarih === bugun);
        const gelecek = rows
          .filter((x) => gunFarki(x.tarih) >= 0)
          .sort((a, b) => gunFarki(a.tarih) - gunFarki(b.tarih));
        const secili = bugunun || gelecek[0] || rows[rows.length - 1];
        if (!secili) return;

        yaz("eczane", secili.eczane || "—");
        yaz("adres", (bugunun ? "" : (secili.tarih || "") + " · ") + (secili.adres || ""));
        const link = alan("harita");
        if (link && secili.harita && secili.harita !== "#") link.setAttribute("href", secili.harita);
        goster("bugun-eczane");
        if (veri && veri.guncelleme) yaz("guncelleme", veri.guncelleme);

        // Yarınki nöbetçi eczane satırı (takvimde yarın varsa)
        var yarin = rows.find(function (x) {
          return gunFarki(x.tarih) === 1;
        });
        var yarinEl = alan("eczane-yarin");
        if (yarin && yarinEl) {
          yarinEl.textContent = "Yarın: " + (yarin.eczane || "—");
          yarinEl.hidden = false;
        }

        // Doğrudan arama: numara yalnızca iki dizinde aynı görünüyorsa var.
        fetch("assets/eczane-telefonlar.json", { cache: "no-store" })
          .then(function (r) {
            return r.ok ? r.json() : null;
          })
          .then(function (telVeri) {
            var tablo = telVeri && telVeri.telefonlar;
            var ara = alan("eczane-ara");
            if (!tablo || !ara || !secili.eczane) return;
            var numara = tablo[secili.eczane];
            if (!numara) {
              var aranan = String(secili.eczane).toLocaleLowerCase("tr");
              Object.keys(tablo).forEach(function (k) {
                if (!numara && k.toLocaleLowerCase("tr") === aranan) numara = tablo[k];
              });
            }
            if (!numara) return;
            var rakam = String(numara).replace(/[^0-9]/g, "");
            if (rakam.length === 11 && rakam.charAt(0) === "0") rakam = rakam.slice(1);
            if (rakam.length !== 10) return;
            var okunur = "0" + rakam.slice(0, 3) + " " + rakam.slice(3, 6) + " " + rakam.slice(6, 8) + " " + rakam.slice(8);
            ara.href = "tel:+90" + rakam;
            ara.textContent = "Hemen ara · " + okunur;
            ara.setAttribute("aria-label", secili.eczane + " — " + okunur + " (ara)");
            ara.hidden = false;
          })
          .catch(function () {});
      })
      .catch(() => {});

    // 2) Son vefat ilanı
    const vefat = fetch("assets/cenaze-data.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((items) => {
        if (!Array.isArray(items) || !items.length) return;
        const it = items[0];
        yaz("vefat-ad", it.name || "—");
        const satir = [];
        if (it.definT) satir.push("Defin: " + it.definT);
        if (it.definS) satir.push(it.definS);
        yaz("vefat-meta", satir.join(" · ") || "Sandıklı Belediyesi duyurusu");
        goster("bugun-vefat");
      })
      .catch(() => {});

    // 3) Bugünün havası (navbar ikonuyla aynı istek)
    const hava = loadWeather()
      .then((w) => {
        const pair = WMO[w.code] || ["Hava", "thermometer"];
        const ikon = alan("hava-ikon");
        if (ikon) ikon.innerHTML = icon(pair[1]);
        yaz("hava-sicaklik", w.temp != null ? w.temp + "°" : "—");
        yaz("hava-durum", pair[0] + (w.feels != null ? " · hissedilen " + w.feels + "°" : ""));
        yaz(
          "hava-aralik",
          w.min != null && w.max != null ? "En düşük " + w.min + "° · en yüksek " + w.max + "°" : ""
        );

        // Üç günlük mini tahmin (aynı istekte gelir)
        const tahmin = alan("hava-tahmin");
        if (tahmin && Array.isArray(w.gunler) && w.gunler.length) {
          tahmin.innerHTML = w.gunler
            .slice(0, 3)
            .map((gun, i) => {
              const p = WMO[gun.code] || ["Hava", "thermometer"];
              const ad = i === 0 ? "Bugün" : gunAdi(gun.tarih);
              return (
                '<span class="today-forecast-day" title="' + ad + " · " + p[0] + '">' +
                '<span class="today-forecast-name">' + ad + "</span>" +
                icon(p[1]) +
                '<span class="today-forecast-temp">' +
                (gun.max != null ? gun.max + "°" : "—") +
                "<small>" + (gun.min != null ? gun.min + "°" : "") + "</small>" +
                "</span></span>"
              );
            })
            .join("");
        }

        goster("bugun-hava");
      })
      .catch(() => {});

    // Üç kaynak da boş dönerse bölümü gizle (boş kart görünmesin)
    Promise.all([eczane, vefat, hava]).then(() => {
      if (!gosterilen) bolum.hidden = true;
    });
  }

  // Detaylı hava durumu sayfası: hava-durumu.html
  // ---------- Ana sayfa: pazar kartı (Pazartesi semt pazarı, Cuma pazarı) ----------
  // ---------- Ana sayfa: namaz vakitleri (Aladhan, Diyanet yöntemi) ----------
  // Veri günlük hesaplanır; aynı gün içinde yeniden istek atılmaz.
  function initNamazVakitleri() {
    var kap = document.getElementById("namaz-vakitleri");
    if (!kap) return;
    var izgara = kap.querySelector('[data-field="namaz-grid"]');
    var tarihEl = kap.querySelector('[data-field="namaz-tarih"]');
    var guncelEl = kap.querySelector('[data-field="namaz-guncelleme"]');
    if (!izgara) return;

    var ADLAR = [
      ["Imsak", "İmsak"],
      ["Sunrise", "Güneş"],
      ["Dhuhr", "Öğle"],
      ["Asr", "İkindi"],
      ["Maghrib", "Akşam"],
      ["Isha", "Yatsı"],
    ];
    var ANAHTAR = "sandikli-namaz-v1";

    function bugun() {
      try {
        return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
      } catch (e) {
        return new Date().toISOString().slice(0, 10);
      }
    }

    // "06:19" / "06:19 (EET)" → gün içindeki dakika (06:19 → 379).
    function dakika(deger) {
      var m = String(deger || "").match(/(\d{1,2}):(\d{2})/);
      if (!m) return null;
      var saat = parseInt(m[1], 10);
      var dk = parseInt(m[2], 10);
      if (isNaN(saat) || isNaN(dk)) return null;
      return saat * 60 + dk;
    }

    // Kullanıcının saati değil, ilçenin saati (Europe/Istanbul) esas alınır.
    function simdiDakika() {
      try {
        var parcalar = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Istanbul",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(new Date());
        var saat = 0;
        var dk = 0;
        parcalar.forEach(function (p) {
          if (p.type === "hour") saat = parseInt(p.value, 10) % 24;
          if (p.type === "minute") dk = parseInt(p.value, 10);
        });
        return saat * 60 + dk;
      } catch (e) {
        var t = new Date();
        return t.getHours() * 60 + t.getMinutes();
      }
    }

    // "1 sa 12 dk" / "12 dk" — süre metni.
    function sureMetni(dk) {
      if (dk <= 0) return "şimdi";
      var saat = Math.floor(dk / 60);
      var kalanDk = dk % 60;
      if (!saat) return kalanDk + " dk";
      if (!kalanDk) return saat + " sa";
      return saat + " sa " + kalanDk + " dk";
    }

    // Sıradaki vakti işaretler ve kalan süreyi yazar; dakikada bir tazelenir.
    function siradakiniIsaretle() {
      var hucreler = [].slice.call(izgara.querySelectorAll(".namaz-cell"));
      if (!hucreler.length) return;
      var simdi = simdiDakika();
      var sira = -1;
      for (var i = 0; i < hucreler.length; i++) {
        var dk = parseInt(hucreler[i].getAttribute("data-dakika"), 10);
        if (!isNaN(dk) && dk > simdi) {
          sira = i;
          break;
        }
      }
      // Bütün vakitler geçtiyse sıradaki, yarınki imsaktır.
      var yarin = false;
      var kalan = 0;
      if (sira === -1) {
        sira = 0;
        yarin = true;
        var ilk = parseInt(hucreler[0].getAttribute("data-dakika"), 10) || 0;
        kalan = 1440 - simdi + ilk;
      } else {
        kalan = parseInt(hucreler[sira].getAttribute("data-dakika"), 10) - simdi;
      }

      hucreler.forEach(function (hucre, i) {
        var sirada = i === sira;
        hucre.classList.toggle("namaz-cell--siradaki", sirada);
        if (sirada) hucre.setAttribute("aria-current", "true");
        else hucre.removeAttribute("aria-current");
        var not = hucre.querySelector(".namaz-kalan");
        if (!sirada) {
          if (not) not.remove();
          return;
        }
        if (!not) {
          not = document.createElement("span");
          not.className = "namaz-kalan";
          hucre.appendChild(not);
        }
        not.textContent = (yarin ? "yarın · " : "") + sureMetni(kalan) + " kaldı";
      });
    }

    function ciz(timings) {
      izgara.textContent = "";
      ADLAR.forEach(function (ikili) {
        var deger = timings[ikili[0]];
        if (!deger) return;
        var hucre = document.createElement("div");
        hucre.className = "namaz-cell";
        hucre.setAttribute("data-vakit", ikili[1]);
        var dk = dakika(deger);
        if (dk !== null) hucre.setAttribute("data-dakika", String(dk));
        var ad = document.createElement("span");
        ad.className = "namaz-ad";
        ad.textContent = ikili[1];
        var saat = document.createElement("span");
        saat.className = "namaz-saat";
        // Aladhan bazen "06:19 (EET)" döndürür; saat kısmını al.
        saat.textContent = String(deger).trim().split(/\s+/)[0];
        hucre.appendChild(ad);
        hucre.appendChild(saat);
        izgara.appendChild(hucre);
      });
      if (!izgara.children.length) return;
      kap.hidden = false;
      siradakiniIsaretle();
      if (izgara.children.length && !izgara.getAttribute("data-sayac")) {
        izgara.setAttribute("data-sayac", "1");
        // Vakit geçince işaret kendiliğinden kayar; sekme arkada kalsa da
        // dönüşte tek karelik gecikmeyle doğru vakti gösterir.
        setInterval(siradakiniIsaretle, 30000);
      }
    }

    // Başlık ve damga Türkçe tarih gösterir; API'nin İngilizce tarihini kullanmayız.
    function tarihiYaz() {
      var metin;
      try {
        metin = new Intl.DateTimeFormat("tr-TR", {
          day: "numeric",
          month: "long",
          weekday: "long",
          timeZone: "Europe/Istanbul",
        }).format(new Date());
      } catch (e) {
        metin = gun.split("-").reverse().join(".");
      }
      if (tarihEl) tarihEl.textContent = "· " + metin;
      if (guncelEl) guncelEl.textContent = metin;
    }

    var gun = bugun();
    var onbellek = null;
    try {
      onbellek = JSON.parse(sessionStorage.getItem(ANAHTAR) || "null");
    } catch (e) {
      onbellek = null;
    }
    if (onbellek && onbellek.gun === gun && onbellek.timings) {
      tarihiYaz();
      ciz(onbellek.timings);
      return;
    }

    var url =
      "https://api.aladhan.com/v1/timings?latitude=38.465&longitude=30.270" +
      "&method=13&timezonestring=Europe/Istanbul";

    fetch(url)
      .then(function (y) {
        return y.ok ? y.json() : null;
      })
      .then(function (veri) {
        if (!veri || !veri.data || !veri.data.timings) return;
        var timings = veri.data.timings;
        try {
          sessionStorage.setItem(ANAHTAR, JSON.stringify({ gun: gun, timings: timings }));
        } catch (e) {
          /* depolama kapalıysa her açılışta yeniden çekilir */
        }
        tarihiYaz();
        ciz(timings);
      })
      .catch(function () {
        /* ağ yoksa bölüm gizli kalır */
      });
  }

  function initPazarKarti() {
    var kart = document.getElementById("bugun-pazar");
    if (!kart) return;
    var baslik = kart.querySelector('[data-field="pazar"]');
    var meta = kart.querySelector('[data-field="pazar-meta"]');
    if (!baslik || !meta) return;

    var PAZARLAR = {
      1: "Semt pazarı · Çay Mah. Dereboyu Cad. No:130",
      5: "Cuma pazarı · Çakır Mah. Lise Cad. No:10",
    };

    function gunUzun(t) {
      try {
        return new Intl.DateTimeFormat("tr-TR", {
          weekday: "long",
          timeZone: "Europe/Istanbul",
        }).format(t);
      } catch (e) {
        return "";
      }
    }

    function tarihUzun(t) {
      try {
        return new Intl.DateTimeFormat("tr-TR", {
          day: "numeric",
          month: "long",
          timeZone: "Europe/Istanbul",
        }).format(t);
      } catch (e) {
        return "";
      }
    }

    var bugun = new Date();
    if (PAZARLAR[bugun.getDay()]) {
      baslik.textContent = "Bugün pazar var";
      meta.textContent = PAZARLAR[bugun.getDay()];
      return;
    }

    var hedef = null;
    for (var i = 1; i <= 7; i += 1) {
      var d = new Date(bugun.getTime());
      d.setDate(d.getDate() + i);
      if (PAZARLAR[d.getDay()]) {
        hedef = d;
        break;
      }
    }
    if (!hedef) return;
    baslik.textContent = "En yakın pazar: " + gunUzun(hedef);
    meta.textContent = tarihUzun(hedef) + " · " + PAZARLAR[hedef.getDay()];
  }

  function initHavaSayfasi() {
    const kok = document.getElementById("hava-sayfa");
    if (!kok) return;
    const alan = (ad) => kok.querySelector('[data-field="' + ad + '"]');
    const yaz = (ad, metin) => {
      const el = alan(ad);
      if (el) el.textContent = metin;
    };

    loadWeather()
      .then((w) => {
        const pair = WMO[w.code] || ["Hava", "thermometer"];
        const ikon = alan("hava-ikon");
        if (ikon) ikon.innerHTML = icon(pair[1]);
        yaz("hava-sicaklik", w.temp != null ? w.temp + "°" : "—");
        yaz(
          "hava-durum",
          pair[0] + (w.max != null && w.min != null ? " · bugün " + w.max + "° / " + w.min + "°" : "")
        );
        yaz("hava-hissedilen", w.feels != null ? w.feels + "°C" : "—");
        yaz("hava-nem", w.nem != null ? "%" + w.nem : "—");
        yaz("hava-ruzgar", w.ruzgar != null ? w.ruzgar + " km/s" : "—");
        yaz("hava-yagis", w.yagis != null ? w.yagis + " mm" : "—");
        try {
          yaz(
            "hava-guncelleme",
            new Date(w.ts).toLocaleString("tr-TR", {
              timeZone: "Europe/Istanbul",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        } catch (e) {
          yaz("hava-guncelleme", "—");
        }

        const liste = alan("hava-gunler");
        if (liste && Array.isArray(w.gunler) && w.gunler.length) {
          liste.innerHTML = w.gunler
            .map((gun, i) => {
              const p = WMO[gun.code] || ["Hava", "thermometer"];
              return (
                '<article class="hava-gun">' +
                '<p class="hava-gun-name">' + (i === 0 ? "Bugün" : gunAdi(gun.tarih, true)) + "</p>" +
                '<p class="hava-gun-date">' + gunAy(gun.tarih) + "</p>" +
                icon(p[1]) +
                '<p class="hava-gun-temp">' +
                (gun.max != null ? gun.max + "°" : "—") +
                " / " +
                (gun.min != null ? gun.min + "°" : "—") +
                "</p>" +
                '<p class="hava-gun-rain">' +
                p[0] +
                (gun.yagis != null ? " · %" + gun.yagis : "") +
                "</p>" +
                "</article>"
              );
            })
            .join("");
        }
      })
      .catch(() => {
        const hata = alan("hava-hata");
        if (hata) hata.hidden = false;
      });
  }

  function initNavbarInteractions() {
    var navbar = document.querySelector(".navbar");
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!navbar) return;

    // Scroll navbar
    var oldScroll = window._navbarScroll;
    if (oldScroll) window.removeEventListener("scroll", oldScroll);
    function onScroll() {
      navbar.classList.toggle("scrolled", window.scrollY > 40);
    }
    window._navbarScroll = onScroll;
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Mobil menü & dropdown
    var backdrop = document.querySelector(".nav-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "nav-backdrop";
      document.body.appendChild(backdrop);
    }

    function syncToggle(willOpen) {
      if (!toggle) return;
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      toggle.setAttribute("aria-label", willOpen ? "Menüyü kapat" : "Menüyü aç");
    }

    function isMobileNav() {
      return window.matchMedia("(max-width: 1080px)").matches;
    }

    // Kapalı çekmece ekran okuyucuya ve klavye sırasına kapalı olmalı.
    // Masaüstünde menü her zaman görünür; orada inert/aria-hidden uygulanmaz.
    function syncDrawer(willOpen) {
      if (!links) return;
      var locked = isMobileNav() && !willOpen;
      links.inert = locked;
      if (locked) links.setAttribute("aria-hidden", "true");
      else links.removeAttribute("aria-hidden");
    }

    function closeMenu(restoreFocus) {
      if (links) links.classList.remove("open");
      if (navbar) navbar.classList.remove("menu-open");
      if (backdrop) backdrop.classList.remove("active");
      document.body.style.overflow = "";
      syncToggle(false);
      syncDrawer(false);
      closeAllDropdowns();
      if (restoreFocus && toggle && typeof toggle.focus === "function") toggle.focus();
    }

    // Tüm açık dropdown'ları kapat ve aria-expanded senkronla
    function closeAllDropdowns() {
      document.querySelectorAll(".nav-dropdown.is-open").forEach(function (d) {
        d.classList.remove("is-open");
        var b = d.querySelector(".nav-dropdown-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }

    function toggleMenu() {
      if (!links || !navbar) return;
      var willOpen = !links.classList.contains("open");
      links.classList.toggle("open", willOpen);
      navbar.classList.toggle("menu-open", willOpen);
      if (backdrop) backdrop.classList.toggle("active", willOpen);
      document.body.style.overflow = willOpen ? "hidden" : "";
      syncToggle(willOpen);
      syncDrawer(willOpen);
      if (willOpen) {
        links.scrollTop = 0;
        var firstLink = links.querySelector("a[href], .nav-dropdown-btn");
        if (firstLink) firstLink.focus();
      } else if (toggle) {
        toggle.focus();
      }
    }

    // Masaüstüne dönünce açık menü kilitli kalmasın (döndürme / yeniden boyutlama)
    if (!window._navResize) {
      window._navResize = function () {
        var open = links && links.classList.contains("open");
        if (!isMobileNav() && open) closeMenu();
        else syncDrawer(open);
      };
      window.addEventListener("resize", window._navResize, { passive: true });
    }

    // Başlangıç durumu: kapalı (ARIA durumu HTML'de sabit kalmasın)
    syncToggle(links ? links.classList.contains("open") : false);
    syncDrawer(links ? links.classList.contains("open") : false);

    if (toggle && !toggle.dataset.navInit) {
      toggle.dataset.navInit = "1";
      toggle.addEventListener("click", toggleMenu);
    }
    if (backdrop && !backdrop.dataset.navInit) {
      backdrop.dataset.navInit = "1";
      backdrop.addEventListener("click", closeMenu);
    }

    // Dropdown butonları
    document.querySelectorAll(".nav-dropdown-btn").forEach(function (btn) {
      if (btn.dataset.navInit === "1") return;
      btn.dataset.navInit = "1";
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var parent = btn.closest(".nav-dropdown");
        var wasOpen = parent.classList.contains("is-open");
        closeAllDropdowns();
        if (!wasOpen) {
          parent.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    // Dış tıklama ile kapat
    if (!window._navOutsideClick) {
      window._navOutsideClick = function (e) {
        if (!e.target.closest(".nav-dropdown")) {
          closeAllDropdowns();
        }
      };
      document.addEventListener("click", window._navOutsideClick);
    }

    // Normal linklere tıklayınca menüyü kapat
    if (links) {
      document.querySelectorAll(".nav-links a[href]:not(.nav-cta)").forEach(function (a) {
        if (a.dataset.navInit === "1") return;
        a.dataset.navInit = "1";
        a.addEventListener("click", closeMenu);
      });
    }

    // Escape ile kapat
    if (!window._navEscape) {
      window._navEscape = function (e) {
        if (e.key !== "Escape") return;
        if (links && links.classList.contains("open")) closeMenu(true);
        else closeAllDropdowns();
      };
      document.addEventListener("keydown", window._navEscape);
    }

    // Aktif link
    var path = (location.pathname.split("/").pop() || "index.html").replace(/^\/+/, "");
    document.querySelectorAll(".nav-links a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      var file = href.split("/").pop();
      if (file === path || (path === "" && file === "index.html")) {
        a.classList.add("active");
      }
    });

    // Tema toggle'ı navbar.js tarafından bağlanır (_initThemeToggle)
  }
  window._initNavbarInteractions = initNavbarInteractions;

  // Gömülü navbar (scripts/inline_navbar.py) varsa davranışı burada da kur.
  // navbar.js bu script'ten önce çalıştığı için kendi çağrısı boşa düşebilir;
  // initNavbarInteractions idempotent (dataset.navInit) olduğundan güvenlidir.
  if (document.querySelector("#navbar-root .navbar")) initNavbarInteractions();
  if (typeof window._initThemeToggle === "function") window._initThemeToggle();
})();
