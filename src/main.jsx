import React, {useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUp, Menu, X} from 'lucide-react';
import {CATEGORIES, PLACES, FLAVORS, INTERESTS} from './data.js';
import {PHOTOS, HERO_FOTO, fotoUrl, srcset, enBuyukUrl, boyutlar} from './photos.js';
import './style.css';

/* ------------------------------------------------------------------ veri */

const NAV = [
  ['nerede', 'Nerede'],
  ['yerler', 'Yerler'],
  ['fotograflar', 'Fotoğraflar'],
  ['hikaye', 'Hikâye'],
  ['sofra', 'Sofra'],
  ['rota', 'Rota']
];

const FOOD = INTERESTS[3];

function durum(code) {
  if (code === 0) return 'Açık';
  if (code <= 2) return 'Az bulutlu';
  if (code === 3) return 'Kapalı';
  if (code <= 48) return 'Puslu';
  if (code <= 57) return 'Çisenti';
  if (code <= 67) return 'Yağmurlu';
  if (code <= 77) return 'Karlı';
  if (code <= 82) return 'Sağanak';
  if (code <= 86) return 'Kar sağanaklı';
  return 'Gök gürültülü';
}

function gunAdi(iso, offset) {
  if (offset === 1) return 'Yarın';
  const dt = new Date(iso + 'T12:00:00');
  return new Intl.DateTimeFormat('tr-TR', {weekday: 'short'}).format(dt);
}

function buildItinerary(days, ids) {
  const picked = ids.length ? INTERESTS.filter(x => ids.includes(x.id)) : INTERESTS.slice(0, 3);
  const plans = [];
  let cursor = 0;
  for (let d = 0; d < days; d++) {
    const slots = [];
    for (let k = 0; k < 2; k++) {
      const it = picked[cursor % picked.length];
      slots.push({tab: it.n, text: it.items[Math.floor(cursor / picked.length) % it.items.length]});
      cursor++;
    }
    if (!ids.includes('lezzet')) slots.push({tab: FOOD.n, text: FOOD.items[d % FOOD.items.length]});
    plans.push({day: d + 1, slots});
  }
  return plans;
}

/* --------------------------------------------------------------- yardımcı */

function Brand() {
  return (
    <a className="brand" href="#top">
      <span className="brand-mark" aria-hidden="true" />
      <span className="brand-name">Sandıklı</span>
    </a>
  );
}

// lucide-react marka ikonlarını kaldırdığı için sosyal medya ikonları inline SVG.
function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/* --------------------------------------------------------------- bölümler */

// Hero'daki istasyon okuması: Sandıklı'nın şu anki havası ve kısa tahmin.
function Station() {
  const [expanded, setExpanded] = useState(false);
  const [hava, setHava] = useState({temp: '—', label: 'Hava durumu alınıyor', note: 'Sandıklı merkez', days: []});

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=38.4647&longitude=30.2697' +
        '&current=temperature_2m,apparent_temperature,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7' +
        '&timezone=Europe%2FIstanbul',
      {signal: ctrl.signal}
    )
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('yanıt yok'))))
      .then(d => {
        const cur = d.current;
        const daily = d.daily || {};
        const days = (daily.time || []).slice(0, 7).map((iso, i) => ({
          ad: i === 0 ? 'Bugün' : gunAdi(iso, i),
          yuksek: Math.round(daily.temperature_2m_max[i]),
          dusuk: Math.round(daily.temperature_2m_min[i])
        }));
        setHava({
          temp: Math.round(cur.temperature_2m) + '°',
          label: durum(cur.weather_code),
          note: 'hissedilen ' + Math.round(cur.apparent_temperature) + '°',
          days
        });
      })
      .catch(() => setHava(p => (p.temp === '—' ? {...p, label: 'Şu an alınamadı'} : p)));
    return () => ctrl.abort();
  }, []);

  const gorunen = expanded ? hava.days : hava.days.slice(1, 4);

  return (
    <div className="station" onClick={() => hava.days.length && setExpanded(v => !v)}>
      <p className="station-k">Sandıklı'da şu an</p>
      <p className="station-now" aria-live="polite">
        <b>{hava.temp}</b>
        <span>{hava.label}, {hava.note}</span>
      </p>
      {hava.days.length > 0 && (
        <ul className="station-days" id="tahmin">
          {gorunen.map(d => (
            <li key={d.ad}>
              <span className="gun">{d.ad}</span>
              <span className="yuksek">{d.yuksek}°</span>
              <span className="dusuk">{d.dusuk}°</span>
            </li>
          ))}
        </ul>
      )}
      {hava.days.length > 0 && (
        <button className="station-toggle" type="button" aria-expanded={expanded} aria-controls="tahmin">
          {expanded ? 'Bugünü göster' : '7 günü göster'}
        </button>
      )}
    </div>
  );
}

// Yerler ve sofra için ortak dizin satırı: başlığa dokununca ayrıntı yerinde açılır.
function IndexRow({item}) {
  const [open, setOpen] = useState(false);
  const bodyId = 'satir-' + item.id;

  return (
    <li className={'idx-row' + (open ? ' open' : '')}>
      <div className="idx-head" onClick={() => setOpen(v => !v)}>
        <div>
          <h3 className="idx-name">{item.n}</h3>
          <p className="idx-lede">{item.d}</p>
        </div>
        <p className="idx-facts">
          <span className={'tur tur-' + item.cat}>{item.t}</span>
          {item.best && <span>{item.best}</span>}
          {item.stay && <span>{item.stay}</span>}
          {item.where && <span>Nerede: {item.where}</span>}
        </p>
        <button className="idx-toggle" type="button" aria-expanded={open} aria-controls={bodyId}>
          {open ? 'Kapat' : 'Ayrıntılar'}
        </button>
      </div>

      {open && (
        <div className="idx-body" id={bodyId}>
          <div>
            <p>{item.long}</p>
            {item.facts && (
              <>
                <h4>Öne çıkanlar</h4>
                <ul className="detay">
                  {item.facts.map(f => <li key={f}>{f}</li>)}
                </ul>
              </>
            )}
            {item.map && (
              <a className="idx-link" href={'https://maps.google.com/?q=' + encodeURIComponent(item.map)} target="_blank" rel="noreferrer">
                Haritada gör
              </a>
            )}
          </div>
          <div>
            {item.transport && (
              <>
                <h4>Ulaşım</h4>
                <p>{item.transport}</p>
              </>
            )}
            {item.lodging && (
              <>
                <h4>Konaklama</h4>
                <p>{item.lodging}</p>
              </>
            )}
            {item.tips && (
              <>
                <h4>Gezgin ipuçları</h4>
                <ul className="detay">
                  {item.tips.map(t => <li key={t}>{t}</li>)}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// Fotoğraf galerisi ve büyütme katmanı.
function Galeri({onOpen}) {
  return (
    <div className="galeri">
      {PHOTOS.map((f, i) => (
        <figure className={'kare' + (f.genis ? ' genis' : '')} key={f.id}>
          <button className="kare-btn" type="button" onClick={() => onOpen(i)} aria-label={f.baslik + ' fotoğrafını büyüt'}>
            <img
              src={fotoUrl(f, 960)}
              srcSet={srcset(f)}
              sizes={boyutlar(f)}
              width={f.en}
              height={f.boy}
              alt={f.alt}
              loading="lazy"
              decoding="async"
            />
          </button>
          <figcaption>
            <b>{f.baslik}</b>
            <span className="kaynak">
              {f.yazar},{' '}
              <a href={f.lisansUrl} target="_blank" rel="noreferrer">{f.lisans}</a>,{' '}
              <a href={f.sayfa} target="_blank" rel="noreferrer">Commons</a>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Isik({index, onClose, onMove}) {
  const foto = PHOTOS[index];

  useEffect(() => {
    const tuslar = e => {
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', tuslar);
    return () => window.removeEventListener('keydown', tuslar);
  }, [onMove]);

  return (
    <div className="isik" role="dialog" aria-modal="true" aria-label={foto.baslik} onClick={onClose}>
      <div className="isik-ic" onClick={e => e.stopPropagation()}>
        <img
          src={enBuyukUrl(foto)}
          srcSet={srcset(foto)}
          sizes="92vw"
          width={foto.en}
          height={foto.boy}
          alt={foto.alt}
        />
        <div className="isik-alt">
          <span className="kaynak">
            <b>{foto.baslik}</b>, {foto.yazar},{' '}
            <a href={foto.lisansUrl} target="_blank" rel="noreferrer">{foto.lisans}</a>,{' '}
            <a href={foto.sayfa} target="_blank" rel="noreferrer">Commons</a>
          </span>
          <div className="isik-kontrol">
            <button type="button" onClick={() => onMove(-1)}>Önceki</button>
            <button type="button" onClick={() => onMove(1)}>Sonraki</button>
            <button type="button" onClick={onClose}>Kapat</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Planner() {
  const [days, setDays] = useState(2);
  const [ids, setIds] = useState(['termal', 'doga']);
  const plan = buildItinerary(days, ids);
  const stops = plan.reduce((a, p) => a + p.slots.length, 0);
  const toggle = id => setIds(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  return (
    <div className="planner">
      <h3>Kaç günün var, neyi seversin?</h3>
      <div className="planner-controls">
        <div className="gun-secim" role="group" aria-label="Gün sayısı">
          {[1, 2, 3].map(d => (
            <button key={d} type="button" className={days === d ? 'on' : ''} aria-pressed={days === d} onClick={() => setDays(d)}>
              {d} gün
            </button>
          ))}
        </div>
        <div className="etiket-secim">
          {INTERESTS.map(it => (
            <button
              key={it.id}
              type="button"
              className={ids.includes(it.id) ? 'on' : ''}
              aria-pressed={ids.includes(it.id)}
              onClick={() => toggle(it.id)}
            >
              {it.n}
            </button>
          ))}
        </div>
      </div>

      <p className="rota-ozet">{days} gün, {ids.length || 3} ilgi alanı, {stops} durak</p>

      <div className="rota">
        {plan.map(p => (
          <div className="rota-gun" key={p.day}>
            <b>{p.day}. gün</b>
            <ul>
              {p.slots.map((s, i) => (
                <li key={i}>
                  <span>{s.tab}</span>
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- app */

function App() {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isik, setIsik] = useState(null);

  const visible = filter === 'all' ? PLACES : PLACES.filter(p => p.cat === filter);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = NAV.map(([id]) => document.getElementById(id)).filter(Boolean);
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(e.target.id)),
      {rootMargin: '-45% 0px -50% 0px'}
    );
    sections.forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu || isik !== null ? 'hidden' : '';
    const esc = e => {
      if (e.key !== 'Escape') return;
      setMenu(false);
      setIsik(null);
    };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', esc);
    };
  }, [menu, isik]);

  const isikKaydir = adim => setIsik(i => (i === null ? i : (i + adim + PHOTOS.length) % PHOTOS.length));

  return (
    <>
      <a className="skip" href="#nerede">İçeriğe geç</a>

      <header className="top">
        <Brand />
        <nav>
          {NAV.map(([id, label]) => (
            <a key={id} href={'#' + id} className={active === id ? 'on' : ''}>{label}</a>
          ))}
        </nav>
        <a className="btn" href="#rota">Rota oluştur</a>
        <button className="menu-btn" type="button" aria-label="Menüyü aç" aria-expanded={menu} onClick={() => setMenu(true)}>
          <Menu size={20} />
        </button>
      </header>

      {menu && (
        <div className="mnav" role="dialog" aria-modal="true" aria-label="Ana menü">
          <div className="mtop">
            <Brand />
            <button className="close-btn" type="button" aria-label="Menüyü kapat" onClick={() => setMenu(false)}>
              <X size={20} />
            </button>
          </div>
          <nav className="mlinks">
            {NAV.map(([id, label]) => (
              <a key={id} href={'#' + id} onClick={() => setMenu(false)}>{label}</a>
            ))}
          </nav>
          <a className="btn" href="#rota" onClick={() => setMenu(false)}>Rota oluştur</a>
        </div>
      )}

      <main>
        <section className="hero" id="top">
          <div className="hero-ic">
            <div className="hero-metin">
              <h1 className="kapak-baslik">
              <span className="c c-k">Sıcak su,</span>{' '}
              <span className="c c-s">soğuk</span>{' '}
              <span className="c c-y">çam,</span>{' '}
              <span className="c c-l">sarı tarla.</span>
            </h1>
              <p className="lede">
                Sandıklı, Afyonkarahisar'ın güneyinde bir ilçe: Hüdai'nin termal kaynakları,
                Akdağ'ın çam ormanları ve patates tarlaları aynı ovada buluşuyor.
              </p>
              <div className="hero-actions">
                <a className="btn" href="#yerler">Gezilecek yerler</a>
                <a className="btn btn-sade" href="#fotograflar">Fotoğraflar</a>
              </div>
            </div>
            <Station />
          </div>
          <figure className="hero-foto">
            <img
              src={fotoUrl(HERO_FOTO, 960)}
              srcSet={srcset(HERO_FOTO)}
              sizes="100vw"
              width={HERO_FOTO.en}
              height={HERO_FOTO.boy}
              alt={HERO_FOTO.alt}
              fetchPriority="high"
              decoding="async"
            />
            <figcaption>
              <span className="kaynak"><b>{HERO_FOTO.baslik}</b></span>
              <span className="kaynak">
                Fotoğraf: {HERO_FOTO.yazar},{' '}
                <a href={HERO_FOTO.lisansUrl} target="_blank" rel="noreferrer">{HERO_FOTO.lisans}</a>,{' '}
                <a href={HERO_FOTO.sayfa} target="_blank" rel="noreferrer">Commons</a>
              </span>
            </figcaption>
          </figure>

          <div className="ornekler">
            {PHOTOS.slice(0, 6).map(f => (
              <a className="ornek" key={f.id} href="#fotograflar" aria-label={f.baslik + ' fotoğrafını gör'}>
                <img src={fotoUrl(f, 480)} width={56} height={56} alt="" loading="lazy" decoding="async" />
              </a>
            ))}
            <a className="ornekler-gitis" href="#fotograflar">Bütün fotoğraflar</a>
          </div>
        </section>

        <section className="band band-tebesir" id="nerede">
          <div className="wrap">
            <h2>Antalya yolunun kenarında, bereketli bir ova.</h2>
            <div className="two">
              <p className="standfirst">
                İlçe, Afyonkarahisar'ın güneybatısında; şifalı suları, güçlü tarım geleneği ve
                doğayla kurduğu kadim bağla kendine has bir yaşam kültürü sunuyor. Hüdai'nin sıcak
                suyu yüzyıllardır banyo ve çamur tedavisi için kullanılıyor.
              </p>
              <dl className="kunye">
                <div><dt>Konum</dt><dd>Afyonkarahisar, Türkiye</dd></div>
                <div><dt>Koordinat</dt><dd>38.46° K, 30.27° D</dd></div>
                <div><dt>Afyon'a uzaklık</dt><dd>60 km</dd></div>
                <div><dt>Ana yol</dt><dd>D650, Antalya yolu</dd></div>
                <div><dt>En uygun sezon</dt><dd>Nisan – Ekim, termal için tüm yıl</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="band band-kaya" id="yerler">
          <div className="wrap">
            <h2>Gezilecek yerler.</h2>
            <p className="standfirst">
              Altı durak var: termal kaynaklar, kale, eski çarşı, orman ve ova. Bir satıra
              dokunduğunuzda ulaşım, konaklama ve gezgin ipuçları yerinde açılır.
            </p>
            <div className="filters" role="group" aria-label="Kategori">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={'filter f-' + cat.id + (filter === cat.id ? ' on' : '')}
                  aria-pressed={filter === cat.id}
                  onClick={() => setFilter(cat.id)}
                >
                  {cat.n}
                </button>
              ))}
            </div>
            <ul className="idx">
              {visible.map(p => <IndexRow key={p.id} item={p} />)}
            </ul>
          </div>
        </section>

        <section className="band band-tebesir" id="fotograflar">
          <div className="wrap">
            <h2>Sandıklı'dan ve Akdağ'dan kareler.</h2>
            <p className="standfirst">
              Yedi fotoğrafın hepsi Wikimedia Commons'tan, CC BY-SA lisanslı. Her karenin
              altında fotoğrafçı ve lisans yazıyor; fotoğrafa dokunduğunuzda büyür.
            </p>
            <Galeri onOpen={setIsik} />
          </div>
        </section>

        <section className="band band-derin" id="hikaye">
          <div className="wrap">
            <h2>Aynı ovada, katman katman.</h2>
            <p className="standfirst">
              Friglerden Selçuklu'ya, Osmanlı'dan bugüne uzanan izler Sandıklı'nın sokaklarında
              ve tepenin üzerindeki kale kalıntılarında görülebiliyor.
            </p>
            <ol className="timeline">
              <li>
                <b>MÖ 1200</b>
                <div>
                  <h3>Frig yerleşimi</h3>
                  <p>Anadolu'nun bu kesimindeki en eski yerleşim izleri ilçenin tarihini Frig dönemine kadar götürüyor.</p>
                </div>
              </li>
              <li>
                <b>1071</b>
                <div>
                  <h3>Türk yerleşimi</h3>
                  <p>Malazgirt sonrasında Anadolu'nun Türkleşmesiyle yöre kalıcı bir Türk yerleşimine dönüşüyor.</p>
                </div>
              </li>
              <li>
                <b>1924</b>
                <div>
                  <h3>Modern Sandıklı</h3>
                  <p>Cumhuriyet'le birlikte ilçe bugünkü merkez yapısını ve kurumlarını kazanıyor.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="band band-tebesir sofra" id="sofra">
          <div className="wrap">
            <h2>Sofrada ne var?</h2>
            <p className="standfirst">
              Ovanın patatesi, taş fırından çıkan haşhaşlı hamur işleri ve Afyon mutfağının
              sucuğu; kahvaltıdan tatlıya kadar yörenin sofrası.
            </p>
            <ul className="idx">
              {FLAVORS.map(f => <IndexRow key={f.id} item={f} />)}
            </ul>
          </div>
        </section>

        <section className="band band-derin" id="rota">
          <div className="wrap">
            <h2>Rotanı oluştur.</h2>
            <p className="standfirst">
              Kaç günün olduğunu ve neyi sevdiğini seç; durak listesi anında oluşur.
            </p>
            <dl className="kunye rota-kunye">
              <div><dt>Ulaşım</dt><dd>Afyon'a 60 km, D650 Antalya yolu üzerinde</dd></div>
              <div><dt>Konaklama</dt><dd>Hüdai'de termal tesisler, ilçe merkezinde otel ve pansiyonlar</dd></div>
              <div><dt>En iyi sezon</dt><dd>Nisan – Ekim; termal tesisler yıl boyu açık</dd></div>
            </dl>
            <Planner />
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="foot-inner">
          <div>
            <Brand />
            <p>Sıcak su, çam ormanı ve tarla: Sandıklı'yı anlatan üç şey.</p>
          </div>
          <nav className="foot-nav">
            {NAV.map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}
          </nav>
          <div className="social">
            <a href="#" aria-label="Instagram"><IgIcon /></a>
            <a href="#" aria-label="Facebook"><FbIcon /></a>
          </div>
        </div>
        <small>© 2026 Sandıklı tanıtım portalı. Hava durumu verisi Open-Meteo'dan alınıyor.</small>
      </footer>

      <button
        className={'top-btn' + (scrolled ? ' on' : '')}
        type="button"
        aria-label="Sayfanın başına dön"
        onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
      >
        <ArrowUp size={19} />
      </button>

      {isik !== null && <Isik index={isik} onClose={() => setIsik(null)} onMove={isikKaydir} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
