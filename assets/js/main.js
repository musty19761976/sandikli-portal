/* Sandıklı Portal — interactions */
(function () {
  "use strict";

  // Aurora background removed — static canvas surface
  // Navbar, navbar.js fetch sonrası yüklendiğinden interaction kodları
  // ayrıca tanımlanır ve navbar.js tarafından tetiklenir. bkz. _initNavbarInteractions.

  // Reveal on scroll
  const reveals = document.querySelectorAll(".reveal");
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
  document.querySelectorAll("[data-lightbox]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (!lb || !lbImg) return;
      const src = el.getAttribute("data-full") || el.querySelector("img")?.src || el.src;
      const alt = el.getAttribute("data-caption") || el.querySelector("img")?.alt || "";
      lbImg.src = src;
      lbImg.alt = alt;
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  });
  if (lb) {
    lb.addEventListener("click", () => {
      lb.classList.remove("open");
      document.body.style.overflow = "";
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("open")) {
        lb.classList.remove("open");
        document.body.style.overflow = "";
      }
    });
  }

  // ---------- PWA: service worker kaydı ----------
  initSW();

  // ---------- Hava: yalnızca bugünün ikonu, navbar sağ üst ----------
  initNavWeatherIcon();

  // ---------- Text-to-speech: yalnızca vefat (cenaze) sayfası ----------
  const pageFile = (location.pathname.split("/").pop() || "").toLowerCase();
  if (pageFile === "cenaze-ilanlari.html") {
    initTextToSpeech();
  }

  // ---------- Nöbetçi Eczane: günün eczanesini en üstte göster ve tabloda vurgula ----------
  if (pageFile === "nobetci-eczaneler.html" || document.getElementById("pharma-table")) {
    initNobetciEczane();
  }

  initThemeToggle();
  window._initThemeToggle = initThemeToggle;
  // Hava durumu ikonu da navbar yüklendikten sonra çağrılmalı (aynı sıralama deseni)
  window._initNavWeatherIcon = initNavWeatherIcon;

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

    btn.textContent = theme === "dark" ? "☀️" : "🌙";
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      btn.textContent = next === "dark" ? "☀️" : "🌙";
      btn.title = next === "dark" ? "Açık temaya geç" : "Koyu temaya geç";
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  function initSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((err) => {
          console.warn("SW kayıt başarısız:", err);
        });
      });
    }
  }

  function initNavWeatherIcon() {
    const inner = document.querySelector(".navbar-inner");
    if (!inner) return;

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

    const WMO = {
      0: ["Açık", "☀️"],
      1: ["Çoğunlukla açık", "🌤️"],
      2: ["Parçalı bulutlu", "⛅"],
      3: ["Kapalı", "☁️"],
      45: ["Sisli", "🌫️"],
      48: ["Kırağılı sis", "🌫️"],
      51: ["Hafif çisenti", "🌦️"],
      53: ["Çisenti", "🌦️"],
      55: ["Yoğun çisenti", "🌧️"],
      61: ["Hafif yağmur", "🌧️"],
      63: ["Yağmur", "🌧️"],
      65: ["Şiddetli yağmur", "🌧️"],
      66: ["Dondurucu yağmur", "🌨️"],
      67: ["Şiddetli dondurucu yağmur", "🌨️"],
      71: ["Hafif kar", "🌨️"],
      73: ["Kar", "❄️"],
      75: ["Yoğun kar", "❄️"],
      77: ["Kar taneleri", "❄️"],
      80: ["Hafif sağanak", "🌦️"],
      81: ["Sağanak", "🌧️"],
      82: ["Şiddetli sağanak", "⛈️"],
      85: ["Hafif kar sağanağı", "🌨️"],
      86: ["Kar sağanağı", "❄️"],
      95: ["Gök gürültülü", "⛈️"],
      96: ["Dolu riski", "⛈️"],
      99: ["Şiddetli dolu", "⛈️"],
    };

    // Sandıklı
    const lat = "38.465";
    const lon = "30.270";
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,weather_code" +
      "&timezone=Europe%2FIstanbul";

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("fail");
        return r.json();
      })
      .then((data) => {
        const code = data.current && data.current.weather_code;
        const temp =
          data.current && typeof data.current.temperature_2m === "number"
            ? Math.round(data.current.temperature_2m)
            : null;
        const pair = WMO[code] || ["Hava", "🌡️"];
        const desc = pair[0];
        const icon = pair[1];
        el.textContent = icon;
        el.title =
          temp != null
            ? `Sandıklı · ${desc} · ${temp}°C`
            : `Sandıklı · ${desc}`;
        el.setAttribute(
          "aria-label",
          temp != null
            ? `Sandıklı hava: ${desc}, ${temp} derece`
            : `Sandıklı hava: ${desc}`
        );
        el.hidden = false;
        // fade-in
        requestAnimationFrame(() => el.classList.add("is-ready"));
      })
      .catch(() => {
        // Sessizce gizle — ikon zorunlu değil
        el.hidden = true;
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
      floatBtn.innerHTML = "⏹ Seslendirmeyi durdur";
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
        activeBtn.innerHTML = '<span class="tts-icon" aria-hidden="true">🔊</span> Dinle';
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
        btn.innerHTML = '<span class="tts-icon" aria-hidden="true">⏹</span> Durdur';
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
      btn.innerHTML = '<span class="tts-icon" aria-hidden="true">🔊</span> Dinle';
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
          addrEl.innerHTML = `<span aria-hidden="true">📍</span> ${addr}`;
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
          addrEl.innerHTML = `<span aria-hidden="true">📍</span> ${addr}`;
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

    function closeMenu() {
      if (links) links.classList.remove("open");
      if (navbar) navbar.classList.remove("menu-open");
      if (backdrop) backdrop.classList.remove("active");
      document.body.style.overflow = "";
      closeAllDropdowns();
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
    }

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
        if (e.key === "Escape") closeMenu();
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
})();
