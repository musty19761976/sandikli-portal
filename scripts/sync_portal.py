#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sandıklı Portal — günlük otomatik senkron (GitHub Actions uyumlu).

Kaynak: Sandıklı Belediyesi (nöbetçi eczane, vefat ilanları). Sadece stdlib.

Davranış:
- Önce doğrudan istek atar; 403/429/5xx alırsa okuyucu proxy üzerinden tekrar dener
  (GitHub runner IP'leri belediye tarafından engellendiği için gerekli).
- Ayrıştırma/doğrulama başarısızsa sessizce geçmez: çıkış kodu 1 döner, iş kırmızı yanar.
- Yalnızca içerik gerçekten değiştiyse dosya yazar; boş commit üretmez.
"""
from __future__ import annotations

import html
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("Europe/Istanbul")
UA = "SandikliPortalBot/1.0 (+https://github.com/musty19761976/sandikli-portal; gunluk senkron)"
PROXY = "https://r.jina.ai/"

ECZANE_URL = "https://sandikli.bel.tr/nobetci-eczaneler"
CENAZE_URL = "https://sandikli.bel.tr/cenaze-ilanlari"

HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}

DATE_RE = re.compile(r"^(\d{2})\.(\d{2})\.(\d{4})$")


def dizgi_duzelt(metin: str) -> str:
    """Kaynaktan gelen vefat metinlerindeki dizgi hatalarini duzeltir.

    Belediye sayfasinda cumleler bazen noktalama sonrasi bosluksuz geliyor
    ("etmistir.Cenazesi") ve duz kesme isareti kullaniliyor. Bu fonksiyon
    ayni metni portalda tipografik olarak dogru hale getirir.
    """
    metin = re.sub(r"[ 	]+([,;:!?])", r"", metin)
    metin = re.sub(r"([,;:])(?=[^\s\d])", r" ", metin)
    metin = re.sub(r"\.(?=[A-ZÇĞİÖŞÜ][a-zçğıöşü])", ". ", metin)
    return metin.replace("'", "’")


# --------------------------------------------------------------------- HTTP


def _get(url: str, headers: dict, timeout: int = 45) -> bytes:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}")
        return resp.read()


def _decode(raw: bytes) -> str:
    for enc in ("utf-8", "utf-8-sig", "iso-8859-9", "windows-1254"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def fetch(url: str, tries: int = 2) -> tuple[str, str]:
    """(html, kaynak) döndürür. kaynak: 'dogrudan' | 'proxy'."""
    son_hata = ""
    for i in range(tries):
        try:
            return _decode(_get(url, HEADERS)), "dogrudan"
        except urllib.error.HTTPError as e:
            son_hata = f"HTTP {e.code}"
            if e.code not in (403, 429, 451, 500, 502, 503, 504):
                break
        except Exception as e:  # ağ hatası, zaman aşımı, TLS
            son_hata = str(e)
        time.sleep(2 + i * 3)

    # Yedek yol: okuyucu proxy — sayfayı HTML olarak geri verir
    try:
        h = dict(HEADERS)
        h["X-Return-Format"] = "html"
        return _decode(_get(PROXY + url, h, timeout=60)), "proxy"
    except Exception as e:
        raise RuntimeError(f"kaynak alınamadı (doğrudan: {son_hata} · proxy: {e})") from e


# ------------------------------------------------------------------- yardımcı


def replace_between(text: str, start: str, end: str, new_inner: str) -> str:
    i = text.find(start)
    j = text.find(end)
    if i < 0 or j < 0 or j <= i:
        raise RuntimeError(f"İşaret bulunamadı: {start!r} … {end!r}")
    return text[: i + len(start)] + "\n" + new_inner.rstrip() + "\n      " + text[j:]


def between(text: str, start: str, end: str) -> str:
    i = text.find(start)
    j = text.find(end)
    if i < 0 or j < 0 or j <= i:
        return ""
    return text[i + len(start) : j].strip()


def stamp_replace(text: str, stamp: str) -> str:
    """Sayfadaki 'Portal Senkron: YYYY-MM-DD' damgasını günceller (iki sayfada
    farklı yazımlar var: büyük/küçük S ve </strong> sarmalı olabilir)."""
    return re.sub(
        r"(?i)(portal\s+senkron:\s*(?:</strong>\s*)?)\d{4}-\d{2}-\d{2}",
        rf"\g<1>{stamp}",
        text,
        count=1,
    )


def upper_tr(s: str) -> str:
    """Türkçe büyük harf (i→İ, ı→I)."""
    trans = str.maketrans({"i": "İ", "ı": "I"})
    return s.strip().translate(trans).upper()


def write_if_changed(path: Path, text: str) -> bool:
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if old == text:
        print(f"  · {path.name}: değişiklik yok")
        return False
    path.write_text(text, encoding="utf-8")
    print(f"  · {path.name}: güncellendi")
    return True


# --------------------------------------------------------------- ayrıştırma


def parse_eczane(page_html: str) -> list[tuple[str, str, str, str]]:
    """Nöbetçi eczane tablosu → (tarih, eczane, adres, harita) listesi.

    En yeni tarihin bulunduğu aya ait satırlar döner; böylece ay devri
    (Ekim → Kasım) sorun olmaz ve eski ayın satırları tabloya karışmaz.
    """
    text = re.sub(r"<script[\s\S]*?</script>", " ", page_html, flags=re.I)
    maps = re.findall(r'href="(https://maps\.app\.goo\.gl/[^"]+)"', text)
    plain = html.unescape(re.sub(r"<[^>]+>", "\n", text))
    lines = [ln.strip() for ln in plain.splitlines() if ln.strip()]

    rows: list[tuple[str, str, str, str]] = []
    i = 0
    map_i = 0
    while i < len(lines):
        if DATE_RE.match(lines[i]) and i + 2 < len(lines):
            d, name, addr = lines[i], lines[i + 1], lines[i + 2]
            if name.lower() not in ("haritada aç", "button") and name != d:
                rows.append((d, name, addr, maps[map_i] if map_i < len(maps) else "#"))
                if map_i < len(maps):
                    map_i += 1
                i += 3
                continue
        i += 1

    if not rows:
        return []

    def anahtar(r: tuple[str, str, str, str]) -> tuple[int, int, int]:
        g, a, y = DATE_RE.match(r[0]).groups()
        return (int(y), int(a), int(g))

    en_yeni = max(rows, key=anahtar)[0]
    ay = en_yeni[3:10]  # MM.YYYY
    return [r for r in rows if r[0][3:10] == ay]


def parse_cenaze(page_html: str) -> list[dict]:
    parts = re.split(r'<div class="dead-item">', page_html)
    items = []
    for t in parts[1:]:
        if 'class="pt-[18px]"' in t:
            t = t.split('class="pt-[18px]"')[0]
        nm = re.search(r'heading-6">\s*([^<]+)', t)
        if not nm:
            continue
        name = upper_tr(nm.group(1))
        tarih = (re.search(r"Tarih:</span>\s*([^<\s]+)", t) or type("X", (), {"group": lambda *a: ""})()).group(1)
        yas_m = re.search(r"Yaş:</span>\s*([^<\s]+)", t)
        if not yas_m:
            yas_m = re.search(r"Ya[^:]*:</span>\s*([^<\s]+)", t)
        yas = yas_m.group(1) if yas_m else ""
        defin_t = (re.search(r"Defin Tarihi:</span>\s*([^<\s]+)", t) or type("X", (), {"group": lambda *a: ""})()).group(1)
        defin_s_m = re.search(r"Defin Saati:</span>\s*([^<]+)", t)
        defin_s = defin_s_m.group(1).strip() if defin_s_m else ""
        metin_m = re.search(r'item-foot">\s*<p class="text-small">\s*(.*?)\s*</p>', t, re.S)
        metin = ""
        if metin_m:
            metin = dizgi_duzelt(re.sub(r"\s+", " ", html.unescape(metin_m.group(1))).strip())
        items.append(
            {
                "name": name,
                "tarih": tarih,
                "yas": yas,
                "definT": defin_t,
                "definS": defin_s,
                "metin": metin,
            }
        )
    return items


# ---------------------------------------------------------------- doğrulama


def validate_eczane(rows: list[tuple[str, str, str, str]], today: datetime) -> None:
    if not rows:
        raise RuntimeError("eczane tablosu boş ayrıştırıldı (kaynak yapısı değişmiş olabilir)")

    def d(s: str) -> datetime:
        return datetime.strptime(s, "%d.%m.%Y")

    tarihler = [d(r[0]) for r in rows]
    en_eski, en_yeni = min(tarihler), max(tarihler)
    if today.date() < en_eski.date() or today.date() > en_yeni.date():
        raise RuntimeError(
            f"eczane listesi bugünü kapsamıyor (liste aralığı {en_eski:%d.%m.%Y} – {en_yeni:%d.%m.%Y})"
        )


def validate_cenaze(items: list[dict], page_html: str, today: datetime) -> None:
    if items:
        en_yeni = max(
            (datetime.strptime(i["tarih"], "%d.%m.%Y") for i in items if DATE_RE.match(i.get("tarih", ""))),
            default=None,
        )
        if en_yeni and (today.date() - en_yeni.date()).days > 30:
            print(f"  ! vefat listesindeki en yeni kayıt {en_yeni:%d.%m.%Y} — kaynak güncellenmiyor olabilir")
        return
    # Hiç kayıt yok: sayfada kart varsa yapı değişmiş demektir
    if 'dead-item' in page_html:
        raise RuntimeError("vefat kartları sayfada var ama hiçbiri ayrıştırılamadı (yapı değişmiş)")


# ------------------------------------------------------------------ üretim


def cenaze_cards_html(items: list[dict]) -> str:
    blocks = []
    for it in items:
        name = upper_tr(it["name"])
        metin = html.escape(dizgi_duzelt(it["metin"]))
        blocks.append(
            f"""        <article class="vefat-card">
          <div class="head">
            <p class="label">Vefat eden</p>
            <h3>{html.escape(name)}</h3>
          </div>
          <div class="vefat-meta">
            <div><span>Tarih</span><strong>{html.escape(it["tarih"])}</strong></div>
            <div><span>Yaş</span><strong>{html.escape(it["yas"])}</strong></div>
            <div><span>Defin tarihi</span><strong>{html.escape(it["definT"])}</strong></div>
            <div><span>Defin saati</span><strong>{html.escape(it["definS"])}</strong></div>
          </div>
          <div class="vefat-body">
            <p>{metin}</p>
          </div>
        </article>
"""
        )
    return "\n".join(blocks)


def eczane_data_json(rows: list[tuple[str, str, str, str]], stamp: str) -> str:
    """Ana sayfa "Bugün Sandıklı'da" kartı için küçük JSON.

    Kart, tablo HTML'ini tarayıcıda ayrıştırmak yerine bu dosyayı okur; böylece
    ana sayfa kırılgan HTML ayrıştırmasına bağlı kalmaz.
    """
    return json.dumps(
        {
            "guncelleme": stamp,
            "eczaneler": [
                {"tarih": d, "eczane": ad, "adres": addr, "harita": harita}
                for d, ad, addr, harita in rows
            ],
        },
        ensure_ascii=False,
        indent=2,
    )


def eczane_table_html(rows: list[tuple[str, str, str, str]], today: str) -> str:
    trs = []
    for d, name, addr, map_url in rows:
        cls = ' class="today"' if d == today else ""
        trs.append(
            f"""          <tr{cls}>
            <td class="date" data-label="Tarih">{html.escape(d)}</td>
            <td class="name" data-label="Eczane">{html.escape(name)}</td>
            <td data-label="Adres">{html.escape(addr)}</td>
            <td data-label="Harita"><a class="map" href="{html.escape(map_url)}" target="_blank" rel="noopener">Aç</a></td>
          </tr>
"""
        )
    return "".join(trs)


# -------------------------------------------------------------------- akış


def sync_eczane(today: datetime, stamp: str) -> None:
    page, via = fetch(ECZANE_URL)
    rows = parse_eczane(page)
    validate_eczane(rows, today)
    print(f"  eczane: {len(rows)} satır · kaynak: {via}")

    # Ana sayfa kartı bu dosyayı okur (HTML tablosunu ayrıştırmaya gerek kalmaz).
    data_path = ROOT / "assets" / "eczane-data.json"
    write_if_changed(data_path, eczane_data_json(rows, stamp))

    path = ROOT / "nobetci-eczaneler.html"
    txt = path.read_text(encoding="utf-8")
    yeni_tablo = eczane_table_html(rows, today.strftime("%d.%m.%Y"))
    eski_tablo = between(txt, "<!-- SYNC:ECZANE:START -->", "<!-- SYNC:ECZANE:END -->")
    if eski_tablo == yeni_tablo.strip():
        print("  · nobetci-eczaneler.html: değişiklik yok")
        return

    txt = txt.replace(' class="today"', "")
    if "<!-- SYNC:ECZANE:START -->" not in txt:
        txt = txt.replace("<tbody>", "<tbody>\n      <!-- SYNC:ECZANE:START -->", 1)
        txt = txt.replace("</tbody>", "<!-- SYNC:ECZANE:END -->\n        </tbody>", 1)
    txt = replace_between(txt, "<!-- SYNC:ECZANE:START -->", "<!-- SYNC:ECZANE:END -->", yeni_tablo)
    txt = stamp_replace(txt, stamp)
    write_if_changed(path, txt)


def sync_cenaze(today: datetime, stamp: str) -> None:
    page, via = fetch(CENAZE_URL)
    items = parse_cenaze(page)
    validate_cenaze(items, page, today)
    if not items:
        print(f"  cenaze: kaynakta ilan yok · kaynak: {via} — dosyalar korunuyor")
        return
    print(f"  cenaze: {len(items)} kayıt · kaynak: {via}")

    data_path = ROOT / "assets" / "cenaze-data.json"
    write_if_changed(data_path, json.dumps(items, ensure_ascii=False, indent=2))

    path = ROOT / "cenaze-ilanlari.html"
    txt = path.read_text(encoding="utf-8")
    yeni_kartlar = cenaze_cards_html(items)
    eski_kartlar = between(txt, "<!-- SYNC:CENAZE:START -->", "<!-- SYNC:CENAZE:END -->")
    if eski_kartlar == yeni_kartlar.strip():
        print("  · cenaze-ilanlari.html: değişiklik yok")
        return

    if "<!-- SYNC:CENAZE:START -->" not in txt:
        txt = txt.replace(
            '<div class="vefat-list">', '<div class="vefat-list">\n      <!-- SYNC:CENAZE:START -->', 1
        )
        txt = txt.replace('<p class="note">', "<!-- SYNC:CENAZE:END -->\n\n      <p class=\"note\">", 1)
    txt = replace_between(txt, "<!-- SYNC:CENAZE:START -->", "<!-- SYNC:CENAZE:END -->", yeni_kartlar)
    txt = stamp_replace(txt, stamp)
    write_if_changed(path, txt)


def main() -> int:
    now = datetime.now(TZ)
    stamp = now.strftime("%Y-%m-%d")
    print(f"sync start {stamp} Europe/Istanbul today={now:%d.%m.%Y}")

    hatalar: list[str] = []
    for ad, islev in (("eczane", sync_eczane), ("cenaze", sync_cenaze)):
        try:
            islev(now, stamp)
        except Exception as e:
            hatalar.append(f"{ad}: {e}")
            print(f"  HATA — {ad}: {e}")

    if hatalar:
        print("sync FAILED: " + " | ".join(hatalar))
        return 1

    print("sync done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
