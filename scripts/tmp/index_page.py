"""Sandiklimiz hub sayfasi (sandiklimiz.html) uretir."""
import html
import json
import pathlib
import re

ROOT = pathlib.Path('C:/Users/musty/sandikli-portal')
data = json.loads((ROOT / 'scripts/tmp/sections.json').read_text(encoding='utf-8'))
NAV = (ROOT / 'components/navbar.html').read_text(encoding='utf-8').strip()

CARDS = [
    ('sandikli-tarihcesi', 'Sandıklı Tarihçesi', 'Kusura Höyük, Hitit dönemi, Frigya ve isim efsaneleri.', '📜'),
    ('sandikli-siyasi-yapisi', 'Sandıklı Siyasi Yapısı', '1869’dan bugüne belediye başkanları.', '🏛️'),
    ('sandiklida-kullanilan-lakaplar', 'Kullanılan Lakaplar', 'Sülale ve aile lakapları, alfabetik liste.', '🏷️'),
    ('sandiklida-kultur-sanat', 'Kültür-Sanat', 'Yunus Emre, medreseler, camiler, yatırlar ve kitabeler.', '🎭'),
    ('sandikli-kaymakamlari', 'Sandıklı Kaymakamları', '1935’ten bugüne göreve gelen kaymakamlar.', '📋'),
    ('sandikli-mahalli-sozleri', 'Mahalli Sözler', 'Yörede kullanılan kelimeler ve anlamları.', '💬'),
    ('sandikli-atasozleri', 'Atasözleri', 'Sandıklı’da yaşayan atasözleri.', '🗣️'),
    ('sandikli-deyimleri', 'Deyimleri', 'Yörede kullanılan deyimler.', '✍️'),
    ('bunlari-biliyor-musunuz', 'Bunları Biliyor musunuz?', 'Ünlü hemşehriler ve az bilinen gerçekler.', '✨'),
]

counts = {k: len(v['items']) or len(v['paragraphs']) for k, v in data.items()}
COUNTS = {
    'sandikli-tarihcesi': None,
    'sandikli-siyasi-yapisi': None,
    'sandiklida-kullanilan-lakaplar': counts['sandiklida.kullanilan.lakaplar'],
    'sandiklida-kultur-sanat': None,
    'sandikli-kaymakamlari': None,
    'sandikli-mahalli-sozleri': counts['sandikli.mahalli.sozleri'],
    'sandikli-atasozleri': counts['sandikli.atasozleri'],
    'sandikli-deyimleri': counts['sandikli.deyimleri'],
    'bunlari-biliyor-musunuz': None,
}

cards = []
for slug, title, desc, icon in CARDS:
    n = COUNTS[slug]
    badge = f'<span class="mn-count">{n}</span>' if n else ''
    cards.append(f"""        <a class="mn-card reveal" href="{slug}.html">
          <span class="mn-icon" aria-hidden="true">{icon}</span>
          <h3>{html.escape(title)}{badge}</h3>
          <p>{html.escape(desc)}</p>
          <span class="mn-more">Oku →</span>
        </a>""")

CSS = """
  .mn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
  .mn-card { display: flex; flex-direction: column; gap: 0.4rem; padding: 1.5rem; background: var(--canvas); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); transition: var(--transition); }
  .mn-card:hover { transform: translateY(-3px); border-color: var(--primary); box-shadow: var(--shadow-md); }
  .mn-icon { font-size: 1.6rem; line-height: 1; }
  .mn-card h3 { font-family: var(--font-display); font-size: 1.15rem; color: var(--ink); display: flex; align-items: center; gap: 0.5rem; }
  .mn-count { font-family: var(--font-body); font-size: 0.7rem; font-weight: 700; color: var(--on-primary); background: var(--primary); padding: 1px 8px; border-radius: var(--radius-pill); }
  .mn-card p { font-size: 0.9rem; color: var(--body); flex: 1; }
  .mn-more { font-size: 0.8125rem; font-weight: 700; color: var(--primary); }
  @media (max-width: 1024px) { .mn-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px) { .mn-grid { grid-template-columns: 1fr; } }
"""

PAGE = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Sandıklımız: Sandıklı tarihçesi, siyasi yapısı, lakaplar, kültür-sanat, kaymakamlar, mahalli sözler, atasözleri ve deyimler." />
  <title>Sandıklımız | Sandıklı Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#c9952e" />
  <link rel="stylesheet" href="assets/css/style.css" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Sandıklımız | Sandıklı Portal" />
  <meta property="og:url" content="https://musty19761976.github.io/sandikli-portal/sandiklimiz.html" />
  <link rel="canonical" href="https://musty19761976.github.io/sandikli-portal/sandiklimiz.html" />
  <style>{CSS}</style>
</head>
<body>
      <div id="navbar-root">{NAV}</div>

  <section class="page-hero">
    <div class="page-hero-bg" style="background-image:url('https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Sand%C4%B1kl%C4%B1_Afyon.jpg/1600px-Sand%C4%B1kl%C4%B1_Afyon.jpg')"></div>
    <div class="container">
      <nav class="breadcrumb"><a href="index.html">Ana Sayfa</a> · <span>Sandıklımız</span></nav>
      <h1 class="display h1">Sandıklımız</h1>
      <p class="lead">Tarih, siyaset, kültür, lakaplar ve yöre sözleri — Sandıklı’yı dokuz ayrı başlıkta okuyun.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="mn-grid">
{chr(10).join(cards)}
      </div>
      <p class="sd-note" style="margin-top:2rem;font-size:.8125rem;color:var(--mute)">Kaynak: <a href="http://www.sanvak.org/" target="_blank" rel="noopener">SANVAK — Sandıklı Vakfı</a>.</p>
    </div>
  </section>

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

(ROOT / 'sandiklimiz.html').write_text(PAGE, encoding='utf-8', newline='')
print('yazildi sandiklimiz.html', len(PAGE))
