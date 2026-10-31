// Sandıklı fotoğrafları — kaynak: Wikimedia Commons.
//
// Hepsi CC BY-SA lisanslı olduğu için her karenin altında fotoğrafçı, lisans ve
// dosya bağlantısı gösterilir. Lisans gereği bunları kaldırmayın.
//
// Üretime alırken bu dosyaları indirip /public/photos altında kendi sunucunuzdan
// yayınlamak daha doğru olur (Commons'u CDN gibi kullanmayın); o durumda `kok`
// alanını kendi klasörünüze çevirmeniz yeterli.

const COMMONS_THUMB = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';

// Wikimedia küçük resim servisinin kabul ettiği genişlik kovaları.
const KOVALAR = [500, 960, 1280, 1920];

const kanal = (yol, dosya) => `${COMMONS_THUMB}/${yol}/${dosya}`;

export const PHOTOS = [
  {
    id: 'merkez',
    dosya: 'Sand%C4%B1kl%C4%B1_Afyon.jpg',
    kok: kanal('3/32', 'Sand%C4%B1kl%C4%B1_Afyon.jpg'),
    en: 4608,
    boy: 3456,
    baslik: 'Sandıklı, Afyonkarahisar',
    alt: 'Sandıklı ilçesinden bir görünüm',
    yazar: 'Poyraz ss',
    lisans: 'CC BY-SA 4.0',
    lisansUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sayfa: 'https://commons.wikimedia.org/wiki/File:Sand%C4%B1kl%C4%B1_Afyon.jpg'
  },
  {
    id: 'panorama',
    dosya: 'Sand%C4%B1kl%C4%B1_Abanner.jpg',
    kok: kanal('7/7f', 'Sand%C4%B1kl%C4%B1_Abanner.jpg'),
    en: 3686,
    boy: 527,
    genis: true,
    baslik: 'Sandıklı panoraması',
    alt: 'Sandıklı ve çevresinin geniş açılı görünümü',
    yazar: 'Poyraz ss',
    lisans: 'CC BY-SA 4.0',
    lisansUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sayfa: 'https://commons.wikimedia.org/wiki/File:Sand%C4%B1kl%C4%B1_Abanner.jpg'
  },
  {
    id: 'akdag-yamac',
    dosya: 'Akdag-6256.jpg',
    kok: kanal('e/ea', 'Akdag-6256.jpg'),
    en: 1700,
    boy: 1131,
    baslik: 'Akdağ',
    alt: 'Akdağ’ın Sandıklı’ya bakan yamaçları',
    yazar: 'Istanbulkontrast',
    lisans: 'CC BY-SA 4.0',
    lisansUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sayfa: 'https://commons.wikimedia.org/wiki/File:Akdag-6256.jpg'
  },
  {
    id: 'akdag-kar',
    dosya: 'Akdag_01.jpg',
    kok: kanal('9/93', 'Akdag_01.jpg'),
    en: 3000,
    boy: 2000,
    baslik: 'Akdağ yolundan',
    alt: 'Akdağ yolundan karlı yamaçlar ve yeşil alanlar',
    yazar: 'Emir Kalaycı',
    lisans: 'CC BY-SA 4.0',
    lisansUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sayfa: 'https://commons.wikimedia.org/wiki/File:Akdag_01.jpg'
  },
  {
    id: 'akdag-yuruyus',
    dosya: 'Akdag_bridge.jpg',
    kok: kanal('6/6e', 'Akdag_bridge.jpg'),
    en: 3000,
    boy: 2000,
    baslik: 'Akdağ’da yürüyüş yolu',
    alt: 'Akdağ’da ahşap yürüyüş yolu',
    yazar: 'Emir Kalaycı',
    lisans: 'CC BY-SA 4.0',
    lisansUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sayfa: 'https://commons.wikimedia.org/wiki/File:Akdag_bridge.jpg'
  },
  {
    id: 'mezire',
    dosya: 'Ball%C4%B1k.jpg',
    kok: kanal('4/4c', 'Ball%C4%B1k.jpg'),
    en: 1024,
    boy: 768,
    baslik: 'Ballık köyü mesire alanı',
    alt: 'Sandıklı Ballık köyündeki Avdaz Dede mesire alanı',
    yazar: 'Ahmtozdmr',
    lisans: 'CC BY-SA 4.0',
    lisansUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sayfa: 'https://commons.wikimedia.org/wiki/File:Ball%C4%B1k.jpg'
  },
  {
    id: 'ilce',
    dosya: 'Afyon.jpg',
    kok: kanal('7/7d', 'Afyon.jpg'),
    en: 4608,
    boy: 3456,
    baslik: 'Sandıklı',
    alt: 'Sandıklı’dan bir görünüm',
    yazar: 'Poyraz ss',
    lisans: 'CC BY-SA 4.0',
    lisansUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sayfa: 'https://commons.wikimedia.org/wiki/File:Afyon.jpg'
  }
];

// Kaynağın kendi genişliğinden büyük varyant istemiyoruz.
export function kullanilabilirGenislikler(foto) {
  const liste = KOVALAR.filter(w => w <= foto.en);
  return liste.length ? liste : [foto.en];
}

export function fotoUrl(foto, genislik) {
  return `${foto.kok}/${genislik}px-${foto.dosya}`;
}

export function srcset(foto) {
  return kullanilabilirGenislikler(foto).map(w => `${fotoUrl(foto, w)} ${w}w`).join(', ');
}

export function enBuyukUrl(foto) {
  const liste = kullanilabilirGenislikler(foto);
  return fotoUrl(foto, liste[liste.length - 1]);
}

// sizes: panorama tüm sütunları kapladığı için 30vw değil tam genişlik ister.
export function boyutlar(foto) {
  return foto.genis
    ? '(max-width: 850px) 92vw, 96vw'
    : '(max-width: 560px) 92vw, (max-width: 850px) 46vw, 30vw';
}

export const HERO_FOTO = PHOTOS[0];
