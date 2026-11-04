"""components/navbar.html icerigini her sayfaya <div id="navbar-root"> icine gomer.

Neden: navbar daha once JS ile fetch ediliyordu. fetch basarisiz olursa
(offline, dosya:// acilis, SW eski onbellek, yavas ag) sayfada hic menu
kalmazdi. Inline gomme ile menuler HTML'in kendisinde; JS sadece acilir
kutulari/mobil menuyu baglar.

Kullanim: python scripts/inline_navbar.py [--check]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMPONENT = ROOT / "components" / "navbar.html"
PAGES = sorted(p for p in ROOT.glob("*.html") if not p.name.startswith("_"))

ROOT_EMPTY = re.compile(r'<div id="navbar-root"></div>')
ROOT_FILLED = re.compile(r'<div id="navbar-root">.*?</div>\s*(?=<section|<!--)', re.DOTALL)


def main() -> int:
    nav = COMPONENT.read_text(encoding="utf-8").strip()
    if not nav.startswith("<header"):
        print(f"HATA: {COMPONENT} <header> ile baslamali")
        return 1

    changed = 0
    for page in PAGES:
        html = page.read_text(encoding="utf-8")
        if ROOT_EMPTY.search(html):
            new = ROOT_EMPTY.sub(lambda _: f'<div id="navbar-root">{nav}</div>', html, count=1)
        elif 'id="navbar-root"' in html:
            # Bos degil: icerigi yeni navbar ile degistir
            start = html.index('<div id="navbar-root">')
            end = html.index("</header>", start) + len("</header>")
            # Eski gommede header'dan sonra navbar-root'un kapanisi kaliyor;
            # onu da yut, yoksa her calistirmada fazladan bir </div> eklenir.
            kuyruk = re.match(r"\s*</div>", html[end:])
            if kuyruk:
                end += kuyruk.end()
            new = html[:start] + f'<div id="navbar-root">{nav}</div>' + html[end:]
        else:
            print(f"ATLANDI (navbar-root yok): {page.name}")
            continue
        if new != html:
            page.write_text(new, encoding="utf-8", newline="")
            changed += 1

    print(f"Guncellendi: {changed} / {len(PAGES)} sayfa")
    return 0


if __name__ == "__main__":
    sys.exit(main())
