#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Batch improvements: add search to all pages, organize tmp scripts, update sitemap."""
from __future__ import annotations
import pathlib
import re
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[1]
TODAY = date.today().isoformat()

PAGES = [
    "index.html", "tarih.html", "belgeler-ile-sandikli.html",
    "termal.html", "kesfet.html", "ekonomi.html", "lezzet.html",
    "galeri.html", "geleneklerimiz.html", "nobetci-eczaneler.html",
    "cenaze-ilanlari.html", "ulasim.html", "sandiklimiz.html",
    "sandikli-tarihcesi.html", "sandikli-siyasi-yapisi.html",
    "sandiklida-kullanilan-lakaplar.html", "sandiklida-kultur-sanat.html",
    "sandikli-kaymakamlari.html", "sandikli-mahalli-sozleri.html",
    "sandikli-atasozleri.html", "sandikli-deyimleri.html",
    "bunlari-biliyor-musunuz.html",
]

SEARCH_BAR = '<div id="search-bar" class="search-bar" hidden></div>'

def add_search_to_page(path):
    txt = path.read_text(encoding="utf-8")
    if 'id="search-bar"' in txt:
        return
    # Insert search-bar after </nav> in page-hero
    # pattern: <p class="lead">...</p> then whitespace then </div>
    m = re.search(r'(<p class="lead">.*?</p>\s*)\n(\s*</div>)', txt, re.DOTALL)
    if m:
        txt = txt.replace(m.group(0), m.group(1) + "\n" + SEARCH_BAR + "\n" + m.group(2))
        path.write_text(txt, encoding="utf-8")
        print("  added search:", path.name)
    else:
        print("  ! no lead found:", path.name)

def update_search_js():
    js = (ROOT / "assets/js/search.js").read_text(encoding="utf-8")
    old = 'var page = (location.pathname.split("/").pop() || "").toLowerCase();\n  if (page === "index.html" || page === "" || page === "index") {\n    if (document.readyState === "loading") {\n      document.addEventListener("DOMContentLoaded", ensureUI);\n    } else {\n      ensureUI();\n    }\n  }'
    new = 'if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", ensureUI);\n  } else {\n    ensureUI();\n  }'
    if old in js:
        js = js.replace(old, new)
        (ROOT / "assets/js/search.js").write_text(js, encoding="utf-8")
        print("search.js updated for all pages")
    else:
        # find what's actually there
        for line in js.split("\n"):
            if "index.html" in line or "Sadece" in line:
                print("  found line:", line.strip())

def update_sitemap():
    sp = ROOT / "sitemap.xml"
    txt = sp.read_text(encoding="utf-8")
    txt = re.sub(r'<lastmod>\d{4}-\d{2}-\d{2}</lastmod>', f'<lastmod>{TODAY}</lastmod>', txt)
    sp.write_text(txt, encoding="utf-8")
    print("sitemap.xml updated:", TODAY)

def organize_tmp():
    doc = [
        "# Scripts / Araclar",
        "",
        "## Ana senkron",
        "- `sync_portal.py` — belediye sitesinden eczane, cenaze verisi ceker",
        "- `inline_navbar.py` — navbar'i her sayfaya gomer",
        "- `update_navbar.py` — navbar bloklarini donusturur",
        "- `batch_updates.py` — toplu HTML guncelleme",
        "- `clean_js.py` — JS'den istenmeyen kodu temizler",
        "- `check_assets.py` — varlik referanslarini dogrular",
        "- `batch_improvements.py` — toplu iyilestirme (bu script)",
        "",
        "## Tek seferlik SANVAK araclari (`tmp/`)",
        "- `extract.py` — cp1254 kaynaktan JSON cikarma",
        "- `build_sections.py` — JSON'dan 9 alt sayfa olusturma",
        "- `index_page.py` — sandiklimiz.html hub sayfasi olusturma",
        "",
        "_Son guncelleme: {}_".format(TODAY),
    ]
    (ROOT / "scripts/README.md").write_text("\n".join(doc), encoding="utf-8")
    print("scripts/README.md written")

def patch_weather_error():
    js = (ROOT / "assets/js/main.js").read_text(encoding="utf-8")
    old = '.catch(() => {\n        // Sessizce gizle — ikon zorunlu değil\n        el.hidden = true;\n      });'
    new = '.catch((e) => {\n        console.warn("SandikliPortal: hava durumu alinamadi:", e?.message ?? "unknown");\n        el.hidden = true;\n      });'
    if old in js:
        js = js.replace(old, new)
        (ROOT / "assets/js/main.js").write_text(js, encoding="utf-8")
        print("weather error handling improved")
    else:
        print("! weather catch not found")

if __name__ == "__main__":
    print("=== Batch Improvements ===\n")

    print("--- Search bar addition ---")
    for p in PAGES:
        f = ROOT / p
        if f.exists():
            add_search_to_page(f)

    print("\n--- search.js ---")
    update_search_js()

    print("\n--- Sitemap ---")
    update_sitemap()

    print("\n--- Scripts README ---")
    organize_tmp()

    print("\n--- Weather error handling ---")
    patch_weather_error()

    print("\n=== Done ===")
