/* Sandıklı Portal — Cloudinary entegrasyonu
   Kullanım:
   1. Cloudinary.com'da ücretsiz hesap aç
   2. Settings > Upload > Upload presets > "Unsigned" preset oluştur
   3. Aşağıdaki CLOUD_NAME ve UPLOAD_PRESET'i doldur
   4. Admin sayfası: dosya seç → Cloudinary'e yükle → URL'yi göster/kaydet
*/
(function () {
  "use strict";

  // ---- KONFİG ----
  // Cloudinary dashboard'dan al: https://cloudinary.com/console
  var CLOUD_NAME = ""; // örn: "sandikli-portal"
  var UPLOAD_PRESET = ""; // örn: "sandikli_unsigned"
  var CLOUDINARY_BASE = CLOUD_NAME
    ? "https://res.cloudinary.com/" + CLOUD_NAME + "/image/upload/"
    : null;

  // ---- GÖRSEL HARİTASI ----
  // Eski Wikimedia URL'leri -> Cloudinary public_id'leri
  // Görseller Cloudinary'e yüklendikçe doldurulur.
  // public_id = Cloudinary'deki dosya adı (uzantısız)
  var IMAGE_MAP = {
    // Örnek:
    // "sandikli-sehir": "sandikli-sehir",
    // "akdag-manzara": "akdag-manzara",
  };

  // ---- FONKSİYONLAR ----

  function getCloudinaryUrl(publicId, options) {
    if (!CLOUDINARY_BASE) return null;
    options = options || {};
    var transforms = [];
    if (options.w) transforms.push("w_" + options.w);
    if (options.h) transforms.push("h_" + options.h);
    if (options.c) transforms.push("c_" + options.c);
    if (options.f) transforms.push("f_" + options.f);
    if (options.q) transforms.push("q_" + options.q);
    if (options.l) transforms.push("l_" + options.l);
    var tx = transforms.length ? transforms.join(",") + "/" : "";
    return CLOUDINARY_BASE + tx + publicId;
  }

  // Wikimedia URL'sinden public_id çöz
  function wikimediaToPublicId(wmUrl) {
    for (var key in IMAGE_MAP) {
      if (IMAGE_MAP.hasOwnProperty(key) && wmUrl.indexOf(key) !== -1) {
        return IMAGE_MAP[key];
      }
    }
    return null;
  }

  // Sayfadaki tüm Wikimedia görsellerini Cloudinary'ye yönlendir
  function migratePageImages() {
    if (!CLOUDINARY_BASE || !Object.keys(IMAGE_MAP).length) return;

    // img tag'leri
    document.querySelectorAll("img[src*='upload.wikimedia.org']").forEach(function (img) {
      var pid = wikimediaToPublicId(img.src);
      if (!pid) return;
      var url = getCloudinaryUrl(pid, { f: "auto", q: "auto" });
      if (url) img.src = url;
    });

    // background-image'ler
    document.querySelectorAll("[style*='upload.wikimedia.org']").forEach(function (el) {
      var match = el.getAttribute("style").match(/url\(['"]?([^'")]+)['"]?\)/);
      if (!match) return;
      var pid = wikimediaToPublicId(match[1]);
      if (!pid) return;
      var url = getCloudinaryUrl(pid, { f: "auto", q: "auto" });
      if (url) {
        el.style.backgroundImage = "url('" + url + "')";
      }
    });

    // data-full (lightbox)
    document.querySelectorAll("[data-full*='upload.wikimedia.org']").forEach(function (el) {
      var pid = wikimediaToPublicId(el.getAttribute("data-full"));
      if (!pid) return;
      var url = getCloudinaryUrl(pid);
      if (url) el.setAttribute("data-full", url);
    });
  }

  // ---- UPLOAD WIDGET ----
  function initUploadWidget(buttonEl, onSuccess) {
    if (!window.cloudinary) {
      // Cloudinary Upload Widget SDK'sını yükle
      var s = document.createElement("script");
      s.src = "https://upload-widget.cloudinary.com/global/all.js";
      s.onload = function () { createWidget(buttonEl, onSuccess); };
      document.head.appendChild(s);
    } else {
      createWidget(buttonEl, onSuccess);
    }
  }

  function createWidget(buttonEl, onSuccess) {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      console.warn("Cloudinary: CLOUD_NAME veya UPLOAD_PRESET eksik. cloudinary.js'de doldur.");
      return;
    }
    var widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "camera", "url"],
        multiple: true,
        maxFiles: 10,
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
        maxFileSize: 10000000, // 10MB
      },
      function (error, result) {
        if (!error && result && result.event === "success" && onSuccess) {
          onSuccess(result.info);
        }
      }
    );
    buttonEl.addEventListener("click", function (e) {
      e.preventDefault();
      widget.open();
    });
  }

  // Admin sayfası için
  function showUploadUI() {
    var container = document.getElementById("cloudinary-upload");
    if (!container) return;

    container.innerHTML =
      '<div class="upload-area">' +
      '<h3>Görsel Yükle (Cloudinary)</h3>' +
      '<p class="upload-info">Seçtiğin görseller Cloudinary\'e yüklenecek. URL\'ler otomatik kopyalanır.</p>' +
      '<button id="cloudinary-upload-btn" class="btn btn-primary">📤 Görsel Seç & Yükle</button>' +
      '<div id="cloudinary-results" class="upload-results"></div>' +
      "</div>";

    var btn = document.getElementById("cloudinary-upload-btn");
    if (!btn) return;

    var results = document.getElementById("cloudinary-results");
    initUploadWidget(btn, function (info) {
      var publicId = info.public_id;
      var url = info.secure_url;
      var html =
        '<div class="upload-item">' +
        '<img src="' + url + '" style="max-width:120px;border-radius:8px" />' +
        '<div class="upload-meta">' +
        '<code>public_id: ' + publicId + "</code><br />" +
        '<code style="font-size:0.75rem;word-break:break-all">' + url + "</code><br />" +
        '<button class="copy-btn" data-url="' + url +
        '" data-pid="' + publicId + '">📋 Kopyala</button>' +
        "</div></div>";
      results.insertAdjacentHTML("afterbegin", html);

      // Kopyalama butonu
      results.querySelector(".copy-btn:last-child").addEventListener("click", function (e) {
        var url = e.target.getAttribute("data-url");
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).catch(function () {});
        }
      });
    });

    // Upload CSS
    if (!document.getElementById("cloudinary-css")) {
      var css = document.createElement("style");
      css.id = "cloudinary-css";
      css.textContent =
        ".upload-area { padding:2rem; background:var(--canvas); border:2px dashed var(--primary); border-radius:var(--radius-lg); margin:2rem 0; }" +
        ".upload-area h3 { margin-bottom:0.5rem; }" +
        ".upload-info { color:var(--body); font-size:0.875rem; margin-bottom:1.5rem; }" +
        ".upload-results { display:flex; flex-direction:column; gap:0.75rem; margin-top:1.5rem; }" +
        ".upload-item { display:flex; gap:1rem; align-items:center; padding:0.75rem; background:var(--canvas-soft); border-radius:var(--radius-md); border:1px solid var(--line); }" +
        ".upload-meta { flex:1; font-size:0.8125rem; }" +
        ".copy-btn { padding:4px 12px; background:var(--primary); color:var(--on-primary); border:none; border-radius:var(--radius-sm); cursor:pointer; font-size:0.75rem; font-weight:600; margin-top:4px; }" +
        ".copy-btn:hover { background:var(--primary-active); }";
      document.head.appendChild(css);
    }
  }

  // API
  window.SandikliCloudinary = {
    getUrl: getCloudinaryUrl,
    migrate: migratePageImages,
    initUpload: initUploadWidget,
    showUploadUI: showUploadUI,
    config: function (cloudName, uploadPreset) {
      CLOUD_NAME = cloudName;
      UPLOAD_PRESET = uploadPreset;
      CLOUDINARY_BASE = cloudName
        ? "https://res.cloudinary.com/" + cloudName + "/image/upload/"
        : null;
    },
    addImage: function (key, publicId) {
      IMAGE_MAP[key] = publicId;
    },
    loadMap: function (mapObj) {
      for (var k in mapObj) {
        if (mapObj.hasOwnProperty(k)) IMAGE_MAP[k] = mapObj[k];
      }
    },
  };

  // Auto-migrate on DOM ready (if config complete)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", migratePageImages);
  } else {
    migratePageImages();
  }
})();
