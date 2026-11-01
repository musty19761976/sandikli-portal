#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Senkron ayrıştırıcıları için çevrimdışı testler.

Ağa çıkmaz, depodaki sayfalara dokunmaz: belediye sayfalarının HTML yapısı
sahte (sentetik) HTML ile taklit edilir. Amaç, günlük senkronun sessizce
bozulduğu iki yeri yakalamak:

  * ay devri  — "Temmuz 2026" gibi sabit bir aya bağlı kalmak
  * gün vurgusu — "bugün" işaretinin doğru satıra taşınmaması

Çalıştırma:  python -m unittest discover -s tests -v
"""
from __future__ import annotations

import importlib.util
import unittest
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _modul():
    spec = importlib.util.spec_from_file_location("sync_portal", ROOT / "scripts" / "sync_portal.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


sp = _modul()


# ------------------------------------------------------------------ sahte HTML
# Kaynak sayfanın gerçek yapısı: <table><tbody><tr><td>tarih</td><td>eczane</td>
# <td>adres</td><td><a href="https://maps.app.goo.gl/...">…</a></td></tr>…
# Ayrıştırıcı etiketleri satır sonuna çevirip metni okuduğu için bu yapı yeterli.


def eczane_satiri(gun: int, ay: int, yil: int = 2026, ad: str = "", harita: str = "") -> str:
    ad = ad or f"Eczane {gun}"
    harita = harita or f"https://maps.app.goo.gl/test{gun:02d}{ay:02d}"
    return (
        "                    <tr>\n"
        f"                        <td>\n                            {gun:02d}.{ay:02d}.{yil}\n                        </td>\n"
        f"                        <td>\n                            {ad}\n                        </td>\n"
        f"                        <td>\n                            Mahalle {gun}, Cadde {gun}\n                        </td>\n"
        "                        <td>\n"
        f'                            <a href="{harita}" target="_blank">Haritada aç</a>\n'
        "                        </td>\n"
        "                    </tr>\n"
    )


def eczane_sayfasi(ay: int, gun_sayisi: int, yil: int = 2026, ay_adi: str = "") -> str:
    satirlar = "".join(eczane_satiri(g, ay, yil) for g in range(1, gun_sayisi + 1))
    return (
        "<html><body>\n"
        f'  <h2>{ay_adi or f"{ay:02d}.{yil}"}</h2>\n'
        "  <table><tbody>\n" + satirlar + "  </tbody></table>\n"
        "</body></html>\n"
    )


def vefat_karti(
    ad: str = "AYŞE YILMAZ",
    tarih: str = "01.11.2026",
    yas: str = "85",
    defin_t: str = "01.11.2026",
    defin_s: str = "Öğle Namazından Sonra",
    metin: str = "İlçemiz Merkez Mahallesinden Ayşe Yılmaz vefat etmiştir. Cenazesi öğle namazına müteakip kaldırılacaktır.",
) -> str:
    return f"""<div class="dead-item">
    <div class="item-head">
        <p class="text-small">Vefat eden</p>
        <p class="heading-6">{ad}</p>
    </div>
    <div class="item-body">
        <span class="text-small"><span>Tarih:</span> {tarih}</span>
        <span class="text-small"><span>Yaş:</span> {yas}</span>
        <span class="text-small"><span>Defin Tarihi:</span> {defin_t}</span>
        <span class="text-small"><span>Defin Saati:</span> {defin_s}</span>
    </div>
    <div class="item-foot">
        <p class="text-small">{metin}</p>
    </div>
</div>
"""


def cenaze_sayfasi(*kartlar: str) -> str:
    return '<html><body><div class="vefat-list">' + "".join(kartlar) + "</div></body></html>"


# --------------------------------------------------------------------- testler


class EczaneAyristirma(unittest.TestCase):
    def test_aylik_tablo_ayristirilir(self):
        html = eczane_sayfasi(11, 30)
        rows = sp.parse_eczane(html)
        self.assertEqual(len(rows), 30)
        self.assertEqual(rows[0][0], "01.11.2026")
        self.assertEqual(rows[-1][0], "30.11.2026")
        self.assertEqual(rows[0][1], "Eczane 1")
        self.assertIn("Mahalle 1", rows[0][2])

    def test_tarihler_sirali_ve_tekil(self):
        rows = sp.parse_eczane(eczane_sayfasi(2, 28))
        tarihler = [datetime.strptime(r[0], "%d.%m.%Y") for r in rows]
        self.assertEqual(tarihler, sorted(tarihler))
        self.assertEqual(len(set(tarihler)), len(tarihler))

    def test_harita_baglantilari_satirlarla_eslesir(self):
        rows = sp.parse_eczane(eczane_sayfasi(11, 30))
        for i, (_, _, _, harita) in enumerate(rows, start=1):
            self.assertTrue(harita.startswith("https://maps.app.goo.gl/"), harita)
            self.assertEqual(harita, f"https://maps.app.goo.gl/test{i:02d}11")

    def test_harita_yoksa_kirilmiyor(self):
        html = '<html><body><tr><td>05.11.2026</td><td>X Eczanesi</td><td>Adres</td></tr></body></html>'
        rows = sp.parse_eczane(html)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][3], "#")


class AyDevri(unittest.TestCase):
    def test_eski_ay_satirlari_karismaz(self):
        """Sayfada Ekim ve Kasım birlikte gelse bile yalnızca en yeni ay alınır."""
        html = eczane_sayfasi(10, 31) + eczane_sayfasi(11, 30)
        rows = sp.parse_eczane(html)
        self.assertEqual(len(rows), 30)
        self.assertTrue(all(r[0].endswith(".11.2026") for r in rows))

    def test_yil_devri_de_dogru(self):
        """Aralık 2026 → Ocak 2027 geçişinde tarih değil, takvim sırası belirleyici."""
        html = eczane_sayfasi(12, 31, 2026) + eczane_sayfasi(1, 31, 2027)
        rows = sp.parse_eczane(html)
        self.assertEqual(len(rows), 31)
        self.assertTrue(all(r[0].endswith(".01.2027") for r in rows))
        sp.validate_eczane(rows, datetime(2027, 1, 1))

    def test_ay_adi_basligi_ayristirmayi_bozmuyor(self):
        html = eczane_sayfasi(11, 30, ay_adi="Kasım 2026")
        self.assertEqual(len(sp.parse_eczane(html)), 30)


class GunVurgusu(unittest.TestCase):
    def setUp(self):
        self.rows = sp.parse_eczane(eczane_sayfasi(11, 30))

    def test_vurgu_tam_olarak_bir_satirda(self):
        tablo = sp.eczane_table_html(self.rows, "05.11.2026")
        self.assertEqual(tablo.count('class="today"'), 1)

    def test_vurgu_dogru_tarihte(self):
        tablo = sp.eczane_table_html(self.rows, "05.11.2026")
        parcalar = tablo.split("<tr")
        vurgulu = [p for p in parcalar if 'class="today"' in p]
        self.assertEqual(len(vurgulu), 1)
        self.assertIn("05.11.2026", vurgulu[0])
        self.assertNotIn("04.11.2026", vurgulu[0])

    def test_gun_degisince_vurgu_tasinir(self):
        """Yeni günde üretilen tablo farklı olmalı; yoksa commit çıkmaz, vurgu donar."""
        bugun = sp.eczane_table_html(self.rows, "05.11.2026")
        yarin = sp.eczane_table_html(self.rows, "06.11.2026")
        self.assertNotEqual(bugun, yarin)
        self.assertIn("06.11.2026", [p for p in yarin.split("<tr") if 'class="today"' in p][0])

    def test_ay_sonu_ertesi_ay_bulunamaz(self):
        """Ay sonunda ertesi günün satırı yoksa vurgu hiçbir satıra konmaz (crash yok)."""
        tablo = sp.eczane_table_html(self.rows, "01.12.2026")
        self.assertEqual(tablo.count('class="today"'), 0)


class EczaneDogrulama(unittest.TestCase):
    def setUp(self):
        self.bugun = datetime(2026, 11, 10, 9, 0)

    def test_bos_sayfa_hata_verir(self):
        with self.assertRaises(RuntimeError):
            sp.validate_eczane(sp.parse_eczane("<html><body>boş</body></html>"), self.bugun)

    def test_bugunu_kapsamayan_liste_hata_verir(self):
        rows = sp.parse_eczane(eczane_sayfasi(10, 31))  # Ekim listesi, bugün 10 Kasım
        with self.assertRaises(RuntimeError):
            sp.validate_eczane(rows, self.bugun)

    def test_gelecek_ay_listesi_hata_verir(self):
        rows = sp.parse_eczane(eczane_sayfasi(12, 31))  # Aralık listesi, bugün 10 Kasım
        with self.assertRaises(RuntimeError):
            sp.validate_eczane(rows, self.bugun)

    def test_bugunu_kapsayan_liste_gecer(self):
        rows = sp.parse_eczane(eczane_sayfasi(11, 30))
        sp.validate_eczane(rows, self.bugun)  # istisna yok


class VefatAyristirma(unittest.TestCase):
    def setUp(self):
        self.bugun = datetime(2026, 11, 1, 9, 0)

    def test_kartlar_ayristirilir(self):
        html = cenaze_sayfasi(
            vefat_karti("Ayşe Yılmaz", "01.11.2026"),
            vefat_karti("Mehmet Demir", "31.10.2026", yas="72"),
        )
        items = sp.parse_cenaze(html)
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["name"], "AYŞE YILMAZ")
        self.assertEqual(items[0]["tarih"], "01.11.2026")
        self.assertEqual(items[1]["yas"], "72")
        self.assertEqual(items[0]["definS"], "Öğle Namazından Sonra")
        self.assertIn("vefat etmiştir", items[0]["metin"])

    def test_html_kacislari_cozulur(self):
        html = cenaze_sayfasi(vefat_karti(metin="Hüseyin Sayın&#039;ın eşi vefat etmiştir."))
        items = sp.parse_cenaze(html)
        self.assertIn("Sayın'ın", items[0]["metin"])

    def test_yapi_degisirse_hata_verir(self):
        """Kart var ama hiçbiri ayrıştırılamıyorsa sessiz geçmemeli."""
        html = '<html><body><div class="dead-item"><p class="yeni-sinif">X</p></div></body></html>'
        items = sp.parse_cenaze(html)
        self.assertEqual(items, [])
        with self.assertRaises(RuntimeError):
            sp.validate_cenaze(items, html, self.bugun)

    def test_kaynakta_ilan_yoksa_hata_vermez(self):
        html = '<html><body><p>Şu anda ilan bulunmamaktadır.</p></body></html>'
        sp.validate_cenaze(sp.parse_cenaze(html), html, self.bugun)

    def test_kart_uretimi(self):
        items = sp.parse_cenaze(cenaze_sayfasi(vefat_karti(), vefat_karti("Mehmet Demir")))
        kartlar = sp.cenaze_cards_html(items)
        self.assertEqual(kartlar.count('class="vefat-card"'), 2)
        self.assertIn("AYŞE YILMAZ", kartlar)


class SayfaYazma(unittest.TestCase):
    """Sayfa içine yazma mantığı — ağ yok, dosya sistemi geçici dizin."""

    # Depodaki iki gerçek yazım: damga bazen </strong> sonrasında, bazen
    # doğrudan iki nokta üst üste sonrasında geliyor.
    ŞABLON = (
        "<html><body>\n"
        "<!-- SYNC:ECZANE:START -->\n"
        "eski içerik\n"
        "<!-- SYNC:ECZANE:END -->\n"
        "· <strong>Portal senkron:</strong> 2026-10-01\n"
        "</body></html>\n"
    )
    ŞABLON_SPAN = (
        "<html><body>\n"
        '<span style="color:var(--mute)">Portal Senkron: 2026-10-01</span>\n'
        "</body></html>\n"
    )

    def test_blok_degistirilir_ve_damga_guncellenir(self):
        yeni = sp.replace_between(self.ŞABLON, "<!-- SYNC:ECZANE:START -->", "<!-- SYNC:ECZANE:END -->", "yeni içerik")
        self.assertIn("yeni içerik", yeni)
        self.assertNotIn("eski içerik", yeni)
        self.assertEqual(sp.between(yeni, "<!-- SYNC:ECZANE:START -->", "<!-- SYNC:ECZANE:END -->"), "yeni içerik")
        damgali = sp.stamp_replace(yeni, "2026-11-01")
        self.assertIn("2026-11-01", damgali)
        self.assertNotIn("2026-10-01", damgali)

    def test_damga_iki_yazimda_da_guncellenir(self):
        for sablon in (self.ŞABLON, self.ŞABLON_SPAN):
            with self.subTest(sablon=sablon[:40]):
                yeni = sp.stamp_replace(sablon, "2026-12-31")
                self.assertIn("2026-12-31", yeni)
                self.assertNotIn("2026-10-01", yeni)
                # biçim korunur: etiketler bozulmaz
                self.assertEqual(yeni.count("</strong>"), sablon.count("</strong>"))
                self.assertEqual(yeni.count("</span>"), sablon.count("</span>"))

    def test_isaret_yoksa_istisna(self):
        with self.assertRaises(RuntimeError):
            sp.replace_between("<html></html>", "<!-- SYNC:ECZANE:START -->", "<!-- SYNC:ECZANE:END -->", "x")

    def test_ayni_icerik_yeniden_yazilmaz(self):
        import tempfile

        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "sayfa.html"
            p.write_text(self.ŞABLON, encoding="utf-8")
            self.assertTrue(sp.write_if_changed(p, "farklı içerik"))
            self.assertFalse(sp.write_if_changed(p, "farklı içerik"))
            self.assertEqual(p.read_text(encoding="utf-8"), "farklı içerik")

    def test_turkce_buyuk_harf(self):
        self.assertEqual(sp.upper_tr("ışık istanbul"), "IŞIK İSTANBUL")


if __name__ == "__main__":
    unittest.main(verbosity=2)
