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


def parse_belediye_list(page_html: str, base: str, limit: int = 12) -> list[dict]:
    """Parse sandikli.bel.tr haber/duyuru listing links."""
    # Pattern: date then title/summary in markdown-ish fetch, or raw HTML anchors
    items: list[dict] = []

    # Raw HTML: often date in text near <a href=".../haberler/...">
    # Match blocks like: 10 Temmuz - 2026 ... <a href="URL">title paragraphs
    # Simpler: find all haberler/ or duyurular/ article links with nearby text
    link_re = re.compile(
        r'href="(https://sandikli\.bel\.tr/(haberler|duyurular)/[^"]+)"',
        re.I,
    )
    seen = set()
    for m in link_re.finditer(page_html):
        url = m.group(1).split("?")[0]
        if url in seen or url.rstrip("/").endswith(("haberler", "duyurular")):
            continue
        seen.add(url)
        # Look back for date pattern
        start = max(0, m.start() - 800)
        chunk = page_html[start : m.end() + 1200]
        # Strip tags for text extract
        text = re.sub(r"<script[\s\S]*?</script>", " ", chunk, flags=re.I)
        text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
        text = re.sub(r"<[^>]+>", "\n", text)
        text = html.unescape(text)
        text = re.sub(r"[ \t]+", " ", text)
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

        date_s = ""
        title = ""
        body = ""
        date_pat = re.compile(
            r"(\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s*[-–]?\s*\d{4})",
            re.I,
        )
        for ln in lines:
            dm = date_pat.search(ln)
            if dm and not date_s:
                date_s = dm.group(1).replace(" - ", " ").replace("-", " ").strip()
        # Title: often first long line after date that's not "dakika"
        candidates = [
            ln
            for ln in lines
            if len(ln) > 40
            and "dakika" not in ln.lower()
            and "saniye" not in ln.lower()
            and not date_pat.match(ln)
        ]
        if candidates:
            title = candidates[0][:160]
            if len(candidates) > 1:
                body = candidates[1][:320]
        if not title:
            slug = url.rstrip("/").split("/")[-1].replace("-", " ")
            title = slug[:120]
        if not body:
            body = title

        kind = "duyuru" if "/duyurular/" in url else "haber"
        items.append(
            {
                "date": date_s or "—",
                "title": title,
                "body": body,
                "url": url,
                "kind": kind,
            }
        )
        if len(items) >= limit:
            break
    return items


def short_title(text: str, n: int = 70) -> str:
    t = re.sub(r"\s+", " ", text).strip()
    if len(t) <= n:
        return t
    return t[: n - 1].rsplit(" ", 1)[0] + "…"


def news_article_html(it: dict) -> str:
    tag = "duyuru" if it["kind"] == "duyuru" else "haber"
    src = "Belediye web"
    return f"""        <article class="news-item">
          <div class="news-meta">
            <span>{html.escape(it["date"])}</span>
            <span class="src">{html.escape(src)}</span>
            <span class="tag">{tag}</span>
          </div>
          <h3>{html.escape(short_title(it["title"], 100))}</h3>
          <p>
            {html.escape(it["body"])}
          </p>
          <a class="more" href="{html.escape(it["url"])}" target="_blank" rel="noopener">Kaynağa git →</a>
        </article>
"""


def teaser_card_html(it: dict) -> str:
    date_short = it["date"].replace(" 2026", "").replace(" 2025", "")[:20]
    return f"""        <article class="card">
          <div class="card-body">
            <span class="tag-gold">{html.escape(date_short)} · Belediye</span>
            <h3>{html.escape(short_title(it["title"], 48))}</h3>
            <p>{html.escape(short_title(it["body"], 90))}</p>
            <a href="haberler.html" class="card-link">Tüm haberler →</a>
          </div>
        </article>
"""


def parse_cenaze(page_html: str) -> list[dict]:
    parts = re.split(r'<div class="dead-item">', page_html)
    items = []
    for t in parts[1:]:
        if 'class="pt-[18px]"' in t:
            t = t.split('class="pt-[18px]"')[0]
        nm = re.search(r'heading-6">\s*([^<]+)', t)
        if not nm:
            continue
        name = nm.group(1).strip()
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


def title_case_tr(s: str) -> str:
    # Simple title case; Turkish İ/i imperfect but ok for display
    return " ".join(w[:1].upper() + w[1:].lower() if w else "" for w in s.split())


def cenaze_cards_html(items: list[dict]) -> str:
    blocks = []
    for it in items:
        name = title_case_tr(it["name"])
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


def sync_news(stamp: str) -> None:
    """Haber + duyuru çek, haberler.html ve index teaser'ı güncelle.
    Tek kaynak hatası tüm scripti öldürmesin; ana gövdede try/except ile çağrılır."""
    # --- Haberler ---
    haber_html = fetch("https://sandikli.bel.tr/haberler")
    duyuru_html = fetch("https://sandikli.bel.tr/duyurular")
    news = parse_belediye_list(haber_html, "haberler", 10)
    duyurular = parse_belediye_list(duyuru_html, "duyurular", 4)
    # merge: news first, then duyuru not duplicate urls
    urls = {n["url"] for n in news}
    for d in duyurular:
        if d["url"] not in urls:
            news.append(d)
    news = news[:14]
    print(f"news items: {len(news)}")
    if not news:
        print("haber: no items, skip")
        return

    news_inner = "\n".join(news_article_html(n) for n in news)
    teaser_inner = "\n".join(teaser_card_html(n) for n in news[:6])

    haber_path = ROOT / "haberler.html"
    haber_txt = haber_path.read_text(encoding="utf-8")
    # sync stamp block optional replace
    haber_txt = re.sub(
        r"(<strong>Son senkron:</strong>\s*)[^·<\n]+",
        rf"\g<1>{stamp} · Skill: <code>/sandikliportal</code> + GitHub Actions ",
        haber_txt,
        count=1,
    )
    if "<!-- SYNC:NEWS:START -->" not in haber_txt:
        # insert markers around first news-list of belediye section
        haber_txt = haber_txt.replace(
            '<div class="news-list">',
            '<div class="news-list">\n      <!-- SYNC:NEWS:START -->',
            1,
        )
        # close before social section or second section-label
        if "<!-- WEB -->" in haber_txt or "Sosyal medyadan" in haber_txt:
            haber_txt = haber_txt.replace(
                '<h2 class="section-label">Sosyal medyadan',
                "<!-- SYNC:NEWS:END -->\n\n      <h2 class=\"section-label\">Sosyal medyadan",
                1,
            )
        else:
            # end before CTA section
            haber_txt = haber_txt.replace(
                '</div>\n    </div>\n  </section>\n\n  <section class="section section-alt">',
                "<!-- SYNC:NEWS:END -->\n      </div>\n    </div>\n  </section>\n\n  <section class=\"section section-alt\">",
                1,
            )
    haber_txt = replace_between(
        haber_txt, "<!-- SYNC:NEWS:START -->", "<!-- SYNC:NEWS:END -->", news_inner
    )
    haber_path.write_text(haber_txt, encoding="utf-8")
    print("updated haberler.html")

    index_path = ROOT / "index.html"
    index_txt = index_path.read_text(encoding="utf-8")
    index_txt = re.sub(
        r"(/sandikliportal · )\d{4}-\d{2}-\d{2}",
        rf"\g<1>{stamp}",
        index_txt,
        count=1,
    )
    if "<!-- SYNC:TEASER:START -->" not in index_txt:
        index_txt = index_txt.replace(
            '<div class="card-grid reveal">',
            '<div class="card-grid reveal">\n      <!-- SYNC:TEASER:START -->',
            1,
        )
        # first closing of card-grid after teaser - find after Son haberler section
        idx = index_txt.find("<!-- SYNC:TEASER:START -->")
        rest = index_txt[idx:]
        close = rest.find("</div>\n    </div>\n  </section>")
        if close > 0:
            abs_close = idx + close
            index_txt = (
                index_txt[:abs_close]
                + "<!-- SYNC:TEASER:END -->\n      "
                + index_txt[abs_close:]
            )
    index_txt = replace_between(
        index_txt, "<!-- SYNC:TEASER:START -->", "<!-- SYNC:TEASER:END -->", teaser_inner
    )
    index_path.write_text(index_txt, encoding="utf-8")
    print("updated index.html")


def main() -> None:
    now = datetime.now(TZ)
    today_str = now.strftime("%d.%m.%Y")
    stamp = now.strftime("%Y-%m-%d")
    print(f"sync start {stamp} Europe/Istanbul today={today_str}")

    # --- Haberler --- (izole; tek kaynak hatası eczane/cenazeyi engellemesin)
    try:
        sync_news(stamp)
    except Exception as e:
        print(f"haber skip: {e}")

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
