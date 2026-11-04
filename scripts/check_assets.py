# -*- coding: utf-8 -*-
"""HTML/JS/CSS icindeki yerel asset referanslarini dogrula."""
import os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

patterns = [
    (r'<script[^>]+src=["\']([^"\']+)["\']', 'script'),
    (r'<link[^>]+href=["\']([^"\']+)["\']', 'link'),
    (r'<img[^>]+src=["\']([^"\']+)["\']', 'img'),
    (r'<source[^>]+src=["\']([^"\']+)["\']', 'source'),
    (r'url\(["\']?([^"\')]+)["\']?\)', 'css-url'),
    (r'focusedImage="([^"]+)"|\bsrc="([^"]+)"', 'misc'),
]

EXT = {'.html', '.css', '.js'}
skip = ('http://', 'https://', 'data:', '#', 'mailto:', 'tel:',
        'javascript:', '//', 'repo/', 'wiki/', 'http')
queryless = lambda s: s.split('?')[0].split('#')[0].split('{')[0].split('}')[0].strip()

missing = []
SKIP_DIRS = {'node_modules', '.git', '.freebuff', '.cloud-attachments', '.tmp', '__pycache__'}
files = [p for p in ROOT.rglob('*') if p.suffix in EXT
         and not SKIP_DIRS.intersection(p.parts) and 'package-lock' not in str(p)]

for fp in files:
    rel = fp.relative_to(ROOT)
    try:
        text = fp.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        continue
    found = set()
    for pat, kind in patterns[:3]:  # script/link/img src href
        for m in re.finditer(pat, text, re.I):
            v = m.group(1)
            if not v or v.startswith(skip):
                continue
            found.add((queryless(v), kind))
    for m in re.finditer(r'(?:src|href)=["\']([^"\']+)["\']', text, re.I):
        v = m.group(1)
        if not v or v.startswith(skip):
            continue
        found.add((queryless(v), 'attr'))
    for v, kind in sorted(found):
        # resolve relative to root for navbar.html (links target root pages)
        base = ROOT if fp.parent.name == 'components' else fp.parent
        target = (base / v)
        if not target.exists():
            missing.append((str(rel), kind, v))

# dedup & print
seen = set()
print("=== EKSIK ASSET REFERANSLARI ===")
for src, kind, v in missing:
    key = (src, v)
    if key in seen:
        continue
    seen.add(key)
    print(f"[{kind}] {src} -> {v}")
if not seen:
    print("(yok)")

# CSS @import control
print("\n=== CSS @import ===")
for fp in (ROOT/'assets/css').glob('*.css'):
    for m in re.finditer(r'@import\s+url\(["\']?([^"\')]+)["\']?\)', fp.read_text(encoding='utf-8')):
        v = m.group(1)
        if not v.startswith('http'):
            print(f"{fp.name}: {v}")
