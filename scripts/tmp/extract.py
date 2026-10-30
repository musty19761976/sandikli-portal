"""SANVAK sandiklimiz sayfalarindan icerik cikar -> scripts/tmp/sections.json

Kaynak dosyalar _scratch/ icinde (cp1254). Sadece tek seferlik veri cikarma;
siteye giren dosya JSON'dur.
"""
import json
import pathlib
import re

SRC = pathlib.Path('C:/Users/musty/sandikli-portal/_scratch')
OUT = pathlib.Path('C:/Users/musty/sandikli-portal/scripts/tmp/sections.json')


def decode(f):
    return (SRC / f).read_bytes().decode('cp1254', 'replace')


def content(f):
    s = decode(f)
    i = s.find('background="../images/fligram2.png"')
    k = s.find('SANDIKLIMIZ /', i)
    e = s.find('fligram.bg.png', k)
    if e < 0:
        e = s.find('</body>', k)
    return s[k:e]


ENT = [('&nbsp;', ' '), ('&amp;', '&'), ('&quot;', '"'), ('&uuml;', 'u'),
       ('&Uuml;', 'U'), ('&ouml;', 'o'), ('&#8220;', '"'), ('&#8221;', '"')]


def clean_block(t):
    t = re.sub(r'<[^>]+>', ' ', t)
    for a, b in ENT:
        t = t.replace(a, b)
    t = re.sub(r'[ \t\r\f\v]+', ' ', t)
    t = re.sub(r' *\n *', '\n', t)
    return t


def clean(t):
    return re.sub(r'\s+', ' ', clean_block(t)).strip()


def list_items(c):
    parts = re.split(r'<img[^>]*arrow\.png[^>]*>', c)[1:]
    items = []
    for p in parts:
        p = re.split(r'<br', p)[0]
        t = clean(p)
        if t:
            items.append(t)
    return items


def paras(c):
    c2 = re.sub(r'(?i)<br\s*/?>', '\n', c)
    c2 = re.sub(r'(?is)<(p|div|tr|h\d)[^>]*>', '\n', c2)
    c2 = re.sub(r'<img[^>]*>', '', c2)
    c2 = re.sub(r'(?i)</(td|th|li)>', '\n', c2)
    out = []
    for line in clean_block(c2).split('\n'):
        line = line.strip()
        if line and not line.startswith('SANDIKLIMIZ /'):
            out.append(line)
    return out


def main():
    res = {}
    for f in sorted(SRC.glob('*.html')):
        c = content(f.name)
        m = re.search(r'SANDIKLIMIZ /\s*(.*?)</font>', c, re.S)
        title = clean(m.group(1)) if m else '?'
        res[f.stem] = {'title': title, 'items': list_items(c), 'paragraphs': paras(c)}
    OUT.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    for k, v in res.items():
        print(k, v['title'], len(v['items']), len(v['paragraphs']))


if __name__ == '__main__':
    main()
