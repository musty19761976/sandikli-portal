#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse raw lakaplar text -> individual chips, update page."""
from __future__ import annotations
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]

# Raw text, split by newline groups, each line has space-separated lakaplar
RAW = r"""
Abbaklar Acıvalar Acamlar Adamamatlar Akoğlanlar Akçalar Aktakkalar
Aladınlar Alaklar Alallar Alaybeyler Alanyalılar Alanköylüler Alorlar
Apaklar Apanlar Aptallar Araphocalar Arapzekiler Araposmanlar Arapaliler
Arifler Aşcınebiler Ataşlar Ayerler

Badiler Başdeliler Bağdatlılar Berberler Bekircikler Bulgurcular Buçuklar
Borborlar Börekler Boyacılar Bozamatlar Boşnaklar

Cambazlar Camallar Camgözler Caranlar Canazlar Cennetler Cımızalar Cicililer
Civezler Cucuflar Condililer

Çebidelikler Çangırlar Çandıklar Çanaklar Çaleliler Çantadavulcular Çavdarlar
Çapıtçılar Çenteler Çenesizler Çeşmeliler Çınarlar Çikinler Çikinzenginler
Çiviciler Çirpişikler Çorumlular Çöteneler

Dabancalılar Dağlılar Dayılar Davazlar Davulcular Danala Danabaşlar Dalyanlar
Develiler Dereller Dıgıllar Dingiller Dinçerler Dizginoğulları Dulunglar
Dulungabalılar Donyağılar

Ecitler Eğinliler Ekşiler Ellezler Eligöğsündeler Eminefendiler Emirveller
Eminnikler Emekler Eminevliler Enikler Erenler Erikgurular Eşşekçiler
Etlibekirler Etemler Etikeler Erzurumlular

Fakılar Falaklar Felekler

Gaganalar Galıpçılar Gavaslar Gevrekler Gıcırlar Gıreller Gocaayenler
Göbekbekirler Göceciler Gökmenler Gubullar Güldalılar

Habibler Halithocalar Haydarlar Hamıraşılar Hannılar Hasseler Heybeller
Hedenler Hışırlar Hobbirler Hocazadeler Hopalar Hörüler Hüsrevler
Hacanlılarnler Hamamcalırnlar Hasanonbaşılar Hacıbekirler Hacışerifler
Hacıabdiller Hatipoğulları

İsmayıllar İbişler İmamlar

Kabalar Kabıllar Kabaamatlar Kabaktosunlar Kabakçılar Kadılar Kadıhasanlar
Kadirhocalar Kalemciler Kalenderler Karamcalar Kariserliler Karahallılar
Karagözler Karamezinler Karahasanlar Kasapyusuflar Kaşmerler Katipler
Katıraşalar Kavunlar Kaytancılar Kebapçılar Kelleler Kelekçiler Kemaneler
Keskinler Kelapiller Kelaptiler Kelepiller Keşefler Kızıklılar Kocaibanlar
Kuyuncuamatlar Kocaayenler Körveller Kömürcüler Kubullar Kumlar Kumhocalar
Kunduzlar Küçükibanlar

Marallar Mazinler Mercimekler Melikler Menteşliler Memenler Mezinler Menziller
Mesgutlar Mıcıklar Minavlar Mollalar Musluhocalar Mutaflar Müslehettinler
Mühtüler

Nalbantlar Nailler Nomenler Nuriağalar

Osmanağalar Osmançavuşlar Omarosmanlar Omareşeler Omarçavuşlar

Öküzaliler Ölengarılar Özdayılar Özaydınlar

Palandızlar Paşafatmalar Perişanlar Pekmezciler Pırsacılar Pireler

Rahmanlar

Sakallılar Sarıhafızlar Sarıamatlar Saraçaliler Sarallar Sadıklar Seydallar
Serenler Seferler Sinirler Sinirgetliler Soğukgaveler Söğütlüler Sucular
Süngerler Sülaleler

Şallar Şahanlar

Tabağıbekirler Tatlar Tatarlar Tantanlar Terziler Tenikeciler Tekgözler
Tekeliler Totolar Topbaşlar Tokiller Tokuşlar Topalamatlar Topaltahirler
Topalağalar Topeşeler Tombaklar Tösgelgil Turşular

Uncular Uncuamatlar Uncuhesnalar Uncuacıvalar Uzunlar

Üyürler

Vanlılar Veyisler Vahaplar

Yağcılar Yakabağlar Yemeniciler Yoğurtçular Yaşmaklar

Zeybekler
"""

def parse_lakap(text):
    items = set()
    for line in text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        for word in line.split():
            word = word.strip()
            if word:
                items.add(word)
    return sorted(items)

items = parse_lakap(RAW)
chips_html = "\n".join(f'          <span class="sd-chip">{name}</span>' for name in items)

page_path = ROOT / "sandiklida-kullanilan-lakaplar.html"
html = page_path.read_text(encoding="utf-8")

html = re.sub(
    r'<div class="sd-chips">.*?</div>',
    f'<div class="sd-chips">\n{chips_html}\n        </div>',
    html,
    flags=re.DOTALL
)

page_path.write_text(html, encoding="utf-8")
print(f"Lakaplar: {len(items)} unique, {page_path.name} updated")
