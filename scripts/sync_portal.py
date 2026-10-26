#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sandıklı Portal — GitHub Actions uyumlu otomatik senkron.
Kaynak: Sandıklı Belediyesi (haberler, nöbetçi eczane, vefat).
Sadece stdlib. Telifli medya indirmez.
"""
from __future__ import annotations

import html
import json
import re
import ssl
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("Europe/Istanbul")
UA = "SandikliPortalBot/1.0 (+https://github.com/; daily sync; contact: local)"

# WMO not needed here


def fetch(url: str, timeout: int = 45) -> str:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
        raw = resp.read()
    for enc in ("utf-8", "utf-8-sig", "iso-8859-9", "windows-1254"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def replace_between(text: str, start: str, end: str, new_inner: str) -> str:
    i = text.find(start)
    j = text.find(end)
    if i < 0 or j < 0 or j <= i:
        raise RuntimeError(f"Marker not found: {start!r} … {end!r}")
    return text[: i + len(start)] + "\n" + new_inner.rstrip() + "\n      " + text[j:]






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
        metin_m = re.search(
            r'item-foot">\s*<p class="text-small">\s*(.*?)\s*</p>', t, re.S
        )
        metin = ""
        if metin_m:
            metin = html.unescape(metin_m.group(1))
            metin = re.sub(r"\s+", " ", metin).strip()
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


def upper_tr(s: str) -> str:
    """Turkish-aware uppercase conversion ensuring accurate İ/I casing."""
    trans = str.maketrans({"i": "İ", "ı": "I"})
    return s.strip().translate(trans).upper()


def cenaze_cards_html(items: list[dict]) -> str:
    blocks = []
    for it in items:
        name = upper_tr(it["name"])
        metin = html.escape(it["metin"])
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


def parse_eczane_july(page_html: str) -> list[tuple[str, str, str, str]]:
    """Return list of (date, name, address, map_url) for Temmuz section if present."""
    # After ## Temmuz or Temmuz 2026
    m = re.search(r"Temmuz\s*2026([\s\S]+?)(?:\n\s*Ara\s*|\Z)", page_html)
    chunk = m.group(1) if m else page_html
    text = re.sub(r"<script[\s\S]*?</script>", " ", chunk, flags=re.I)
    # Keep map links
    maps = re.findall(r'href="(https://maps\.app\.goo\.gl/[^"]+)"', text)
    plain = re.sub(r"<[^>]+>", "\n", text)
    plain = html.unescape(plain)
    lines = [ln.strip() for ln in plain.splitlines() if ln.strip()]
    rows = []
    i = 0
    map_i = 0
    date_re = re.compile(r"^(\d{2}\.\d{2}\.\d{4})$")
    while i < len(lines):
        if date_re.match(lines[i]) and i + 2 < len(lines):
            d = lines[i]
            name = lines[i + 1]
            addr = lines[i + 2]
            if name.lower() in ("haritada aç", "button") or d == name:
                i += 1
                continue
            map_url = maps[map_i] if map_i < len(maps) else "#"
            if map_i < len(maps):
                map_i += 1
            rows.append((d, name, addr, map_url))
            i += 3
        else:
            i += 1
    return rows


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




def main() -> None:
    now = datetime.now(TZ)
    today_str = now.strftime("%d.%m.%Y")
    stamp = now.strftime("%Y-%m-%d")
    print(f"sync start {stamp} Europe/Istanbul today={today_str}")

    # --- Eczane ---
    try:
        ecz_html = fetch("https://sandikli.bel.tr/nobetci-eczaneler")
        rows = parse_eczane_july(ecz_html)
        if rows:
            ecz_path = ROOT / "nobetci-eczaneler.html"
            ecz_txt = ecz_path.read_text(encoding="utf-8")
            ecz_txt = re.sub(
                r"(Portal senkron:</strong>\s*)\d{4}-\d{2}-\d{2}",
                rf"\g<1>{stamp}",
                ecz_txt,
                count=1,
            )
            # strip class="today" then re-apply
            ecz_txt = ecz_txt.replace(' class="today"', "")
            # rebuild tbody if markers exist
            if "<!-- SYNC:ECZANE:START -->" not in ecz_txt:
                ecz_txt = ecz_txt.replace(
                    "<tbody>", "<tbody>\n      <!-- SYNC:ECZANE:START -->", 1
                )
                ecz_txt = ecz_txt.replace(
                    "</tbody>", "<!-- SYNC:ECZANE:END -->\n        </tbody>", 1
                )
            table = eczane_table_html(rows, today_str)
            ecz_txt = replace_between(
                ecz_txt, "<!-- SYNC:ECZANE:START -->", "<!-- SYNC:ECZANE:END -->", table
            )
            ecz_path.write_text(ecz_txt, encoding="utf-8")
            print(f"updated nobetci-eczaneler.html rows={len(rows)} today={today_str}")
        else:
            print("eczane: no rows parsed, skip")
    except Exception as e:
        print(f"eczane skip: {e}")

    # --- Cenaze ---
    try:
        cen_html = fetch("https://sandikli.bel.tr/cenaze-ilanlari")
        items = parse_cenaze(cen_html)
        if items:
            data_path = ROOT / "assets" / "cenaze-data.json"
            data_path.write_text(
                json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            cen_path = ROOT / "cenaze-ilanlari.html"
            cen_txt = cen_path.read_text(encoding="utf-8")
            cen_txt = re.sub(
                r"(Portal senkron:</strong>\s*)\d{4}-\d{2}-\d{2}",
                rf"\g<1>{stamp}",
                cen_txt,
                count=1,
            )
            if "<!-- SYNC:CENAZE:START -->" not in cen_txt:
                cen_txt = cen_txt.replace(
                    '<div class="vefat-list">',
                    '<div class="vefat-list">\n      <!-- SYNC:CENAZE:START -->',
                    1,
                )
                # end before note
                cen_txt = cen_txt.replace(
                    '<p class="note">',
                    "<!-- SYNC:CENAZE:END -->\n\n      <p class=\"note\">",
                    1,
                )
            cards = cenaze_cards_html(items)
            cen_txt = replace_between(
                cen_txt, "<!-- SYNC:CENAZE:START -->", "<!-- SYNC:CENAZE:END -->", cards
            )
            cen_path.write_text(cen_txt, encoding="utf-8")
            print(f"updated cenaze-ilanlari.html items={len(items)}")
        else:
            print("cenaze: no items, skip")
    except Exception as e:
        print(f"cenaze skip: {e}")

    print("sync done")


if __name__ == "__main__":
    main()
