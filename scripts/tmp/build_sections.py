"""sections.json -> 9 bolum sayfasi (sandiklimiz alt sayfalari)."""
import html
import json
import pathlib
import re

ROOT = pathlib.Path('C:/Users/musty/sandikli-portal')
data = json.loads((ROOT / 'scripts/tmp/sections.json').read_text(encoding='utf-8'))
NAV = (ROOT / 'components/navbar.html').read_text(encoding='utf-8').strip()

PAGES = {
    'sandikli-tarihcesi': dict(
        title='Sandıklı Tarihçesi', key='sandikli.tarihcesi', kind='prose',
        desc='Sandıklı tarihçesi: Kusura Höyük, Hitit dönemi, Frigya, isim efsaneleri ve Osmanlı’dan Cumhuriyet’e.'),
    'sandikli-siyasi-yapisi': dict(
        title='Sandıklı Siyasi Yapısı', key='sandikli.siyasi.yapisi', kind='table2',
        desc='Sandıklı Belediye başkanları 1869’dan bugüne — dönem dönem başkan listesi.'),
    'sandiklida-kullanilan-lakaplar': dict(
        title='Sandıklı’da Kullanılan Lakaplar', key='sandiklida.kullanilan.lakaplar', kind='chips',
        desc='Sandıklı’da sülale ve aile lakapları: alfabetik liste.'),
    'sandiklida-kultur-sanat': dict(
        title='Sandıklı’da Kültür-Sanat', key='sandiklida.kultur.sanat', kind='prose',
        desc='Yunus Emre, Taptuk Emre, medreseler ve Sandıklı’nın kültür-sanat mirası.'),
    'sandikli-kaymakamlari': dict(
        title='Sandıklı Kaymakamları', key='sandikli.kaymakamlari', kind='table3',
        desc='Sandıklı’da 1935’ten bugüne görev yapan kaymakamlar ve görev tarihleri.'),
    'sandikli-mahalli-sozleri': dict(
        title='Sandıklı Mahalli Sözleri', key='sandikli.mahalli.sozleri', kind='deflist',
        desc='Sandıklı yöresinde kullanılan mahalli kelimeler ve anlamları.'),
    'sandikli-atasozleri': dict(
        title='Sandıklı Atasözleri', key='sandikli.atasozleri', kind='quotes',
        desc='Sandıklı’da kullanılan atasözleri listesi.'),
    'sandikli-deyimleri': dict(
        title='Sandıklı Deyimleri', key='sandikli.deyimleri', kind='quotes',
        desc='Sandıklı yöresinde kullanılan deyimler.'),
    'bunlari-biliyor-musunuz': dict(
        title='Bunları Biliyor musunuz?', key='bunlari.biliyormusunuz', kind='bullets',
        desc='Sandıklı hakkında az bilinen gerçekler: ünlü hemşehriler, tarihte ilkler.'),
}

CSS = """
  .sd-table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--canvas); }
  .sd-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .sd-table th { background: var(--canvas-soft); text-align: left; padding: 10px 14px; font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink); border-bottom: 1px solid var(--line); }
  .sd-table td { padding: 9px 14px; border-bottom: 1px solid var(--line); color: var(--body); vertical-align: top; }
  .sd-table tr:last-child td { border-bottom: none; }
  .sd-table tr:hover td { background: var(--primary-pale); }
  .sd-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .sd-chip { display: inline-block; padding: 6px 12px; border-radius: var(--radius-pill); background: var(--canvas-soft); border: 1px solid var(--line); color: var(--ink); font-size: 0.8125rem; }
  .sd-def { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0 2rem; }
  .sd-def li { padding: 0.55rem 0; border-bottom: 1px solid var(--line); font-size: 0.9375rem; color: var(--body); line-height: 1.5; }
  .sd-def li b { color: var(--ink); font-weight: 700; }
  @media (max-width: 768px) { .sd-def { grid-template-columns: 1fr; } }
  .sd-quotes { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 2rem; }
  .sd-quotes li { padding: 0.5rem 0 0.5rem 1.1rem; border-bottom: 1px solid var(--line); position: relative; color: var(--body); font-size: 0.9375rem; }
  .sd-quotes li::before { content: "◆"; position: absolute; left: 0; top: 0.6rem; color: var(--primary); font-size: 0.6rem; }
  @media (max-width: 768px) { .sd-quotes { grid-template-columns: 1fr; } }
  .sd-bullets { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
  .sd-bullets li { display: flex; gap: 0.75rem; padding: 0.9rem 1.1rem; background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-md); color: var(--body); }
  .sd-bullets li::before { content: "✦"; color: var(--primary); font-weight: 700; }
  .sd-note { margin-top: 2rem; font-size: 0.8125rem; color: var(--mute); }
"""


def esc(t):
    return html.escape(t, quote=False)


def head_line(p):
    """Kaynak metinlerde baslik satirlari BUYUK harf ve kisa."""
    stripped = p.rstrip(':')
    return len(stripped) < 70 and re.fullmatch(r"[A-ZÇĞİÖŞÜ0-9’'()\-–. ]{4,}:?", stripped) is not None


HEAD_RE = re.compile(r"^([A-ZÇĞİÖŞÜ0-9’'()\-–. ]{3,}):\s*(.*)$")


def join_wrapped(lines):
    """Kaynak HTML'de her satir <br>; satirlari paragraflara birlestir.

    * Satir basindaki BUYUK HARF + ':' -> alt baslik
    * Onceki satir '.' ile bittiyse veya satir kisa kalip cumleyi bitirmediyse
      ayni paragrafta devam et; aksi halde yeni paragraf.
    """
    out = []
    for p in lines:
        m = HEAD_RE.match(p)
        if m and len(m.group(1)) < 60:
            out.append(('h', m.group(1).strip()))
            if m.group(2).strip():
                out.append(('p', m.group(2).strip()))
            continue
        if out and out[-1][0] == 'p':
            prev = out[-1][1]
            ends = prev.endswith(('.', '!', '?', '”', '".'))
            if not ends:
                out[-1] = ('p', prev + ' ' + p)
                continue
        out.append(('p', p))
    return out


def body_for(cfg, sec):
    k = cfg['kind']
    items, paras = sec['items'], sec['paragraphs']
    paras = [p for p in paras if p.upper() != sec['title'].upper()]

    if k == 'prose':
        out = []
        for kind, txt in join_wrapped(paras):
            out.append(f'        <h2>{esc(txt)}</h2>' if kind == 'h' else f'        <p>{esc(txt)}</p>')
        return '\n'.join(out)

    if k == 'bullets':
        lis = '\n'.join(f'          <li>{esc(p)}</li>' for p in paras if p and not head_line(p))
        return f'        <ul class="sd-bullets">\n{lis}\n        </ul>'

    if k == 'chips':
        ch = '\n'.join(f'          <span class="sd-chip">{esc(i)}</span>' for i in items)
        return f'        <div class="sd-chips">\n{ch}\n        </div>'

    if k == 'quotes':
        lis = '\n'.join(f'          <li>{esc(i)}</li>' for i in items)
        return f'        <ul class="sd-quotes">\n{lis}\n        </ul>'

    if k == 'deflist':
        lis = []
        for it in items:
            it = it.rstrip(',.')
            m = re.match(r'^(.*?)\s*[:]\s*(.+)$', it)
            if m:
                lis.append(f'          <li><b>{esc(m.group(1).strip())}</b> — {esc(m.group(2).strip())}</li>')
            else:
                lis.append(f'          <li>{esc(it)}</li>')
        return '        <ul class="sd-def">\n' + '\n'.join(lis) + '\n        </ul>'

    if k == 'table3':
        skip = {"SANDIKLI'DA", 'GÖREV YAPAN KAYMAKAMLAR', 'Adı Soyadı', 'Göreve',
                'Başlayış Tarihi', 'Görevden Ayrılış Tarihi'}
        rows = [p for p in paras if p not in skip]
        trs, i = [], 0
        while i < len(rows):
            name = rows[i]
            i += 1
            dates = []
            while i < len(rows) and re.match(r'^\d{2}\.\d{2}\.\d{4}', rows[i]):
                dates.append(rows[i])
                i += 1
            dates += ['—'] * (2 - len(dates))
            trs.append(f'            <tr><td><strong>{esc(name)}</strong></td><td>{esc(dates[0])}</td><td>{esc(dates[1])}</td></tr>')
        return ('        <div class="sd-table-wrap"><table class="sd-table">\n'
                '          <thead><tr><th>Adı Soyadı</th><th>Göreve Başlayış</th><th>Görevden Ayrılış</th></tr></thead>\n'
                '          <tbody>\n' + '\n'.join(trs) + '\n          </tbody>\n        </table></div>')

    if k == 'table2':
        trs = []
        for p in paras:
            m = re.match(r'^(\d{3,4}\s*[–-]\s*\d{3,4}|\d{4})\s*(.*)$', p)
            if m:
                name = re.sub(r'^y[ıi]llar[ıi]\s+aras[ıi]nda\s+', '', m.group(2)).strip()
                trs.append(f'            <tr><td>{esc(m.group(1))}</td><td><strong>{esc(name)}</strong></td></tr>')
            elif p.startswith('yılları arasında'):
                # Onceki satir tarih+isim; ayni satira ekle
                cont = re.sub(r'^y[ıi]llar[ıi]\s+aras[ıi]nda\s+', '', p).strip()
                trs[-1] = trs[-1].replace('</strong></td></tr>', ' ' + esc(cont) + '</strong></td></tr>')
            else:
                trs.append(f'            <tr><td colspan="2">{esc(p)}</td></tr>')
        return ('        <div class="sd-table-wrap"><table class="sd-table">\n'
                '          <thead><tr><th>Dönem</th><th>Belediye Başkanı</th></tr></thead>\n'
                '          <tbody>\n' + '\n'.join(trs) + '\n          </tbody>\n        </table></div>')

    raise ValueError(k)


TEMPLATE = """<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{desc}" />
  <title>{title} | Sandıklı Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#c9952e" />
  <link rel="stylesheet" href="assets/css/style.css" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Sandıklı Portal" />
  <meta property="og:title" content="{title} | Sandıklı Portal" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="https://musty19761976.github.io/sandikli-portal/{slug}.html" />
  <meta property="og:locale" content="tr_TR" />
  <link rel="canonical" href="https://musty19761976.github.io/sandikli-portal/{slug}.html" />
  <style>{css}</style>
</head>
<body>
      <div id="navbar-root">{nav}</div>

  <section class="page-hero">
    <div class="page-hero-bg" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Sand%C4%B1kl%C4%B1_Afyon.jpg/1600px-Sand%C4%B1kl%C4%B1_Afyon.jpg')"></div>
    <div class="container">
      <nav class="breadcrumb"><a href="index.html">Ana Sayfa</a> · <a href="sandiklimiz.html">Sandıklımız</a> · <span>{title}</span></nav>
      <h1 class="display h1">{title}</h1>
      <p class="lead">{desc}</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="prose reveal">
{body}
      </div>
      <p class="sd-note">Kaynak: <a href="http://www.sanvak.org/sandiklimiz/{src}.html" target="_blank" rel="noopener">SANVAK — Sandıklı Vakfı</a>.</p>
    </div>
  </section>

{cta}

  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo"><span class="logo-mark">S</span><span class="logo-text">Sandıklı Portal</span></a>
          <p>Sandıklı’yı tanıtan bağımsız tanıtım portalı. Kaynak: Valilik ve kaymakamlık kamuya açık metinleri.</p>
        </div>
        <div><h4>Keşfet</h4><ul class="footer-links"><li><a href="tarih.html">Tarihçe</a></li><li><a href="sandiklimiz.html">Sandıklımız</a></li><li><a href="termal.html">Hüdai Termal</a></li><li><a href="kesfet.html">Gezilecek Yerler</a></li><li><a href="geleneklerimiz.html">Geleneklerimiz</a></li></ul></div>
        <div><h4>Pratik</h4><ul class="footer-links"><li><a href="ulasim.html">Ulaşım</a></li><li><a href="ulasim.html#konaklama">Konaklama</a></li><li><a href="ulasim.html#iletisim">İletişim</a></li></ul></div>
        <div><h4>Resmi</h4><ul class="footer-links">
          <li><a href="http://www.sanvak.org/" target="_blank" rel="noopener">SANVAK</a></li>
          <li><a href="https://www.facebook.com/SaNDiKLiiLCe/" target="_blank" rel="noopener">SaNDiKLiiLCe</a></li><li><a href="https://www.sandikli.gov.tr" target="_blank" rel="noopener">Kaymakamlık</a></li><li><a href="https://www.afyonkarahisar.gov.tr/sandikli" target="_blank" rel="noopener">Valilik</a></li></ul></div>
      </div>
      <div class="footer-bottom"><span>© <span data-year></span> Sandıklı Tanıtım Portalı</span><span>Afyonkarahisar · Türkiye</span></div>
    </div>
  </footer>
  <script src="assets/js/navbar.js"></script>
  <script src="assets/js/main.js"></script>
</body>
</html>
"""

CTA = """  <section class="section section-alt">
    <div class="container">
      <div class="cta-banner reveal">
        <div>
          <p class="tag-gold">Devam edin</p>
          <h2>Sandıklı’yı keşfedin</h2>
          <p>Diğer bölümlerle devam edin: tarih, kültür, gelenekler ve doğa.</p>
        </div>
        <div class="cta-actions">
          <a href="tarih.html" class="btn btn-gold">Tarihçe</a>
          <a href="sandiklimiz.html" class="btn btn-outline">Sandıklımız</a>
          <a href="geleneklerimiz.html" class="btn btn-outline">Geleneklerimiz</a>
        </div>
      </div>
    </div>
  </section>"""


def main():
    for slug, cfg in PAGES.items():
        sec = data[cfg['key']]
        out = TEMPLATE.format(slug=slug, title=cfg['title'], desc=cfg['desc'], nav=NAV,
                              css=CSS, body=body_for(cfg, sec), src=cfg['key'], cta=CTA)
        (ROOT / f'{slug}.html').write_text(out, encoding='utf-8', newline='')
        print('yazildi', slug, len(out))


if __name__ == '__main__':
    main()
