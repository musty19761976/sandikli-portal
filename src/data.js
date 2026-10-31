// Sandıklı tanıtım portalının içerik verisi.
// Yeni bir mekân/lezzet eklemek için ilgili dizinin sonuna aynı alanlarla kayıt ekleyin.
//
// cat    : filtre kategorisi (CATEGORIES içindeki id) — dizin satırındaki aksan rengini de belirler
// best   : en iyi ziyaret zamanı    stay   : önerilen süre
// transport / lodging / tips : ziyaretçi detayları

export const CATEGORIES = [
  {id: 'all', n: 'Tümü'},
  {id: 'termal', n: 'Termal & şifa'},
  {id: 'doga', n: 'Doğa & macera'},
  {id: 'tarih', n: 'Tarih & kültür'},
  {id: 'lezzet', n: 'Lezzet & tarım'}
];

export const PLACES = [
  {
    id: 'hudai',
    cat: 'termal',
    n: 'Hüdai Kaplıcaları',
    t: 'Şifa & termal',
    d: 'Binlerce yıldır şifa arayanları buluşturan, çamur banyoları ve termal suyuyla Sandıklı’nın dünyaya açılan kapısı.',
    long: 'Sandıklı’nın batısındaki Hüdai bölgesi, yüzyıllardır aynı kaynaktan akan termal suyla şifa dağıtıyor. Kapalı ve açık havuzlar, çamur banyoları ve dinlenme alanlarıyla yılın dört mevsimi hizmet veren tesisler; romatizma, cilt ve solunum şikâyetleri için uğrak noktası.',
    facts: ['Çamur banyosu ve termal havuz seçenekleri', 'Kapalı havuzlar sayesinde kışın da kullanılabilir', 'Konaklamalı tesislerle yarım veya tam pansiyon imkânı'],
    best: 'Nisan – Ekim',
    stay: 'Yarım gün',
    transport: 'İlçe merkezinden kısa bir araç yolculuğu; gün içinde servis ve taksi imkânı bulunur.',
    lodging: 'Bölgede termal oteller ve konaklama tesisleri var; ilçe merkezinde de otel ve pansiyon seçenekleri mevcut.',
    tips: [
      'Şifa programları için 2-3 günlük konaklama günübirlik ziyaretten daha verimli olur.',
      'Havlu ve terlik getirmek pratik; tesislerde de temin edilebiliyor.',
      'Kalp, tansiyon gibi kronik rahatsızlıklarda havuza girmeden önce hekime danışmak gerekir.'
    ],
    map: 'Hüdai Kaplıcaları Sandıklı'
  },
  {
    id: 'akdag',
    cat: 'doga',
    n: 'Akdağ Tabiat Parkı',
    t: 'Doğa & macera',
    d: 'Yaban hayatı, kanyonları ve çam ormanlarıyla yürüyüşten kampçılığa dört mevsim özgürlük alanı.',
    long: 'Akdağ, Sandıklı Ovası’na bakan yamaçları ve serin çam ormanlarıyla bölgenin en geniş doğal yaşam alanı. İşaretli parkurlar, seyir noktaları ve kamp alanları sayesinde hem günübirlik yürüyüşler hem de konaklamalı doğa kampları mümkün.',
    facts: ['İşaretli yürüyüş ve trekking parkurları', 'Kuş gözlemi ve doğa fotoğrafçılığı', 'Piknik ve kamp alanları'],
    best: 'İlkbahar & sonbahar',
    stay: 'Tam gün',
    transport: 'İlçe merkezinden araçla ulaşılır; parkur girişleri tabelalarla işaretli.',
    lodging: 'Günübirlik kullanım yaygın; kamp alanları mevcut, otelde konaklamak için ilçe merkezi tercih ediliyor.',
    tips: [
      'Sabahın erken saatleri kuş gözlemi ve fotoğraf için en verimli zaman.',
      'Patika yürüyüşlerinde sağlam ayakkabı ve yeterli su şart.',
      'Yayla havası hızla değişebilir; mevsim dışı bir rüzgârlık yanınızda olsun.'
    ],
    map: 'Akdağ Tabiat Parkı Sandıklı'
  },
  {
    id: 'ulucami',
    cat: 'tarih',
    n: 'Sandıklı Ulu Camii',
    t: 'Tarih & mimari',
    d: 'Ahşap işçiliği ve zarif mimarisiyle ilçenin yüzyıllara uzanan belleğini bugüne taşıyan simge yapı.',
    long: 'İlçe merkezinde, eski çarşının hemen yanında yükselen cami; ahşap sütunları, tavan işçiliği ve sade taş duvarlarıyla Anadolu cami geleneğinin güzel bir örneği. Çevresindeki sokaklar yürüyerek keşfedilecek konaklar ve dükkânlarla dolu.',
    facts: ['Merkezde, yürüyerek kolay ulaşım', 'Ahşap sütun ve tavan işçiliği', 'Namaz vakitleri dışında ziyarete uygun'],
    best: 'Tüm yıl',
    stay: '1 saat',
    transport: 'İlçe merkezinde, eski çarşının içinde; araç gerekmeden yürüyerek gezilir.',
    lodging: 'Merkezde konaklandığında cami, çarşı ve kale yürüme mesafesinde olur.',
    tips: [
      'Namaz vakitlerinde içeri girmek yerine çevredeki çarşıyı gezmek daha uygun.',
      'İbadet mekânı olduğu için sessizlik ve uygun kıyafet önemli.',
      'Camiyi çevredeki tarihi sokaklarla birlikte tek rotada gezebilirsiniz.'
    ],
    map: 'Sandıklı Ulu Camii'
  },
  {
    id: 'kale',
    cat: 'tarih',
    n: 'Sandıklı Kalesi',
    t: 'Tarih & manzara',
    d: 'İlçeye hâkim tepedeki sur kalıntıları, katmanlı tarihi ve ovaya bakan geniş manzarayı bir arada sunuyor.',
    long: 'Sandıklı’nın kurulduğu tepenin üzerindeki kale kalıntıları, yöredeki yerleşim izlerinin en görünür parçası. Surlardan ilçenin damları ve Sandıklı Ovası kuş bakışı izlenebiliyor; gün batımı saatleri manzara için en iyi zaman.',
    facts: ['Tepeden ilçe ve ova manzarası', 'Sur ve burç kalıntıları', 'Gün batımı fotoğrafı için uygun nokta'],
    best: 'İlkbahar & sonbahar',
    stay: '1-2 saat',
    transport: 'İlçe merkezinden yürüyerek veya kısa bir araç yolculuğuyla; tepeye çıkan patika yer yer dik.',
    lodging: 'Merkez otelleri kaleye yürüme mesafesinde.',
    tips: [
      'Tırmanış için tutuşu iyi, rahat bir ayakkabı seçin.',
      'Sabah veya akşamüstü sıcaklık yürüyüş için daha uygun.',
      'Kalıntılar koruma altında; taşlara zarar vermeden gezin.'
    ],
    map: 'Sandıklı Kalesi'
  },
  {
    id: 'carsi',
    cat: 'tarih',
    n: 'Tarihi Çarşı & Eski Evler',
    t: 'Kültür & yaşam',
    d: 'Ulu Cami çevresinden başlayan çarşı; ahşap kapıları, cumbalı evleri ve el işi dükkânlarıyla ilçenin gündelik hayatı.',
    long: 'Eski çarşı, Sandıklı’nın gündelik ritmini en iyi anlatan bölge. Bakır işi ve manifatura dükkânlarının arasında yürürken cumbalı geleneksel evleri, taş avluları ve küçük kahveleri görebilirsiniz. Yerel ürün almak için de en doğru adres.',
    facts: ['Cumbalı geleneksel ev örnekleri', 'Bakır ve el işi dükkânları', 'Yerel ürün satan küçük esnaf'],
    best: 'Tüm yıl',
    stay: '2 saat',
    transport: 'İlçe merkezinde, Ulu Cami çevresinde; tamamı yürüyerek gezilir.',
    lodging: 'Merkezdeki otel ve pansiyonlar çarşıya yürüme mesafesinde.',
    tips: [
      'Hafta içi sabah saatleri daha sakin, gezmesi daha kolay.',
      'Üreticiden alışveriş için yerel pazar günlerini değerlendirin.',
      'Eski evleri fotoğraflarken sakinlerin mahremiyetine dikkat edin.'
    ],
    map: 'Sandıklı tarihi çarşı'
  },
  {
    id: 'ova',
    cat: 'lezzet',
    n: 'Sandıklı Ovası & Üretici Pazarı',
    t: 'Tarım & lezzet',
    d: 'Patatesiyle ünlü verimli ova, tarladan sofraya giden yolun başlangıcı; yerel pazar bu bereketin en canlı hâli.',
    long: 'Sandıklı’nın bereketli ovası, başta patates olmak üzere tahıl ve sebze üretiminin merkezi. Hasat döneminde tarlalar sarıya boyanır; ilçe pazarında üreticiler kendi ürünlerini doğrudan satar. Sabah pazarı gezip kahvaltıyı köy sofrasında yapmak, yöre mutfağını anlamanın en kısa yolu.',
    facts: ['Sandıklı patatesi ve yerel üretici tezgâhları', 'Hasat döneminde tarla manzaraları', 'Köy kahvaltısı ve ev yapımı ürünler'],
    best: 'Hasat dönemi: yaz – sonbahar',
    stay: 'Yarım gün',
    transport: 'Pazar alanı ilçe merkezinde, yürüyerek ulaşılır; tarla gezileri için araç gerekir.',
    lodging: 'Merkezde konaklayıp sabah pazarıyla güne başlamak en pratiği.',
    tips: [
      'Pazara sabah erken gitmek daha geniş çeşit demek.',
      'Ürün alırken nerede ve nasıl yetiştiğini satıcıya sorun.',
      'Hasat döneminde tarla yollarında yavaş ve dikkatli araç kullanın.'
    ],
    map: 'Sandıklı pazarı'
  }
];

export const FLAVORS = [
  {
    id: 'patates',
    cat: 'lezzet',
    t: 'Yerel lezzet',
    icon: 'wheat',
    n: 'Sandıklı Patatesi',
    d: 'Coğrafyanın bereketi',
    long: 'Sandıklı Ovası’nın kumlu-killi toprağında yetişen patates, yörenin en bilinen ürünü. Fırında, haşlamada ve yöresel güveçlerde ana malzeme olarak kullanılır; hasadı yaz sonunda başlar.',
    where: 'Pazar tezgâhları, yerel lokantalar ve köy kahvaltıları',
    best: 'Hasat: ağustos – ekim',
    tips: ['Yörede kavurması ve güveçte kullanımı yaygın.', 'Alırken sertliğine ve kabuk rengine bakmak kaliteyi gösterir.']
  },
  {
    id: 'lokul',
    cat: 'lezzet',
    t: 'Yerel lezzet',
    icon: '♨',
    n: 'Haşhaşlı Lokul',
    d: 'Taş fırından gelenek',
    long: 'Taş fırında pişen hamurun içine haşhaş ezmesi sürülerek hazırlanan lokul, kahvaltı sofralarının vazgeçilmezi. Yörede haşhaş hem hamur işinde hem tatlılarda yaygın olarak kullanılıyor.',
    where: 'Taş fırınlar ve sabah kahvaltı sofraları',
    best: 'Tüm yıl',
    tips: ['Fırından yeni çıkmış lokul, kahvaltıda kaymak ve balla iyi gider.']
  },
  {
    id: 'sacet',
    cat: 'lezzet',
    t: 'Yerel lezzet',
    icon: '◉',
    n: 'Saç Eti',
    d: 'Yöresel ustalık',
    long: 'Kuzu veya dana etinin sac üzerinde kendi suyunda, yavaş ateşte pişirilmesiyle yapılan saç eti, yöresel lokantaların imza yemeği. Yanında soğan salatası ve tandır ekmeğiyle servis edilir.',
    where: 'Yöresel lokantalar ve düğün sofraları',
    best: 'Akşam yemeği',
    tips: ['Kalabalık gruplar için porsiyonları paylaşmak daha uygun olur.', 'Sac üzerinde servis edildiği için sıcakken tüketmek gerekir.']
  },
  {
    id: 'kaymak',
    cat: 'lezzet',
    t: 'Yerel lezzet',
    icon: '✿',
    n: 'Kaymak & Bal',
    d: 'Sabahın en güzel hali',
    long: 'İlçe kahvaltılarının sabit ikilisi: kaymak yerel sütten, bal ise çevre köylerden geliyor. Taş fırın ekmeğinin üzerine sürülerek yenilen klasik bir başlangıç.',
    where: 'Kahvaltı salonları ve termal tesis restoranları',
    best: 'Sabah kahvaltısı',
    tips: ['Serin havada taşınan kaymak daha dayanıklı olur; yol için vakumlu alın.']
  },
  {
    id: 'sucuk',
    cat: 'lezzet',
    t: 'Yöre mutfağı',
    icon: '❖',
    n: 'Afyon Sucuğu',
    d: 'Bölgenin imzası',
    long: 'Afyonkarahisar’ın en bilinen lezzeti olan sucuk, yöredeki kasap ve şarküterilerde farklı olgunluklarda bulunur. Kahvaltıda ızgarada ya da yumurtayla pişirilerek yenir.',
    where: 'Kasap ve şarküteriler; kahvaltı sofraları',
    best: 'Tüm yıl',
    tips: ['Vakumlu paket alarak yol boyunca rahatça taşıyabilirsiniz.']
  },
  {
    id: 'ekmekkadayifi',
    cat: 'lezzet',
    t: 'Yöre mutfağı',
    icon: '✱',
    n: 'Kaymaklı Ekmek Kadayıfı',
    d: 'Afyon mutfağının tatlısı',
    long: 'Ekmek kadayıfının şerbetle yumuşatılıp üzerine kaymak konmasıyla yapılan tatlı, Afyon mutfağının imzası. Sandıklı’daki tatlıcılarda da düzenli olarak bulunur.',
    where: 'Tatlıcılar ve lokantaların tatlı menüleri',
    best: 'Tüm yıl',
    tips: ['Üzerine ceviz ilavesiyle servis edilen hâli en yaygını.']
  }
];

// Gezi planlayıcısının kullandığı havuzlar
export const INTERESTS = [
  {id: 'termal', n: 'Termal & şifa', items: ['Hüdai Kaplıcaları', 'Çamur banyosu & termal havuz', 'Termal tesiste dinlenme']},
  {id: 'doga', n: 'Doğa & yürüyüş', items: ['Akdağ Tabiat Parkı', 'Çam ormanı yürüyüşü', 'Kuş gözlemi & doğa fotoğrafçılığı']},
  {id: 'tarih', n: 'Tarih & kültür', items: ['Sandıklı Ulu Camii', 'Sandıklı Kalesi', 'Tarihi çarşı & eski evler']},
  {id: 'lezzet', n: 'Lezzet durakları', items: ['Üretici pazarı turu', 'Yöresel kahvaltı molası', 'Saç eti akşam yemeği']}
];
