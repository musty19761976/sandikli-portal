"""`scripts/sync_uyari.py` ayrıştırma kuralları — ağ erişimi olmadan test edilir."""

import sys
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import sync_uyari as su  # noqa: E402

TZ = ZoneInfo("Europe/Istanbul")


def seviyeler(ham):
    return su.seviyeleri_bul(ham)


class KodNormalTest(unittest.TestCase):
    def test_sayi_ve_metin_ayni_koda_indirgenir(self):
        self.assertEqual(su.kod_normal(90302), "90302")
        self.assertEqual(su.kod_normal("90302"), "90302")
        self.assertEqual(su.kod_normal(90302.0), "90302")
        self.assertEqual(su.kod_normal(" 90302 "), "90302")

    def test_bos_ve_anlamsiz_degerler(self):
        self.assertEqual(su.kod_normal(None), "")
        self.assertEqual(su.kod_normal(""), "")
        self.assertEqual(su.kod_normal(True), "")


class ToplamaTest(unittest.TestCase):
    def test_meteoalarm_yerlesim_listeleri(self):
        ham = [
            {
                "day": "today",
                "towns": {
                    "yellow": ["90301", "90303"],
                    "orange": [90302, "90311"],
                    "red": [],
                },
            }
        ]
        s = seviyeler(ham)
        self.assertEqual(s["turuncu"], {"90302", "90311"})
        self.assertEqual(s["sari"], {"90301", "90303"})
        self.assertEqual(s["kirmizi"], set())

    def test_dogrudan_kayit_seviye_alani(self):
        ham = [{"merkezId": 90302, "seviye": "Turuncu", "olay": "Kuvvetli kar"}]
        s = seviyeler(ham)
        self.assertEqual(s["turuncu"], {"90302"})

    def test_turkce_anahtarlar_ve_sayisal_seviye(self):
        self.assertEqual(seviyeler({"turuncu": ["90302"]})["turuncu"], {"90302"})
        self.assertEqual(seviyeler({"kırmızı": ["90302"]})["kirmizi"], {"90302"})
        self.assertEqual(seviyeler([{"kod": "90302", "level": 4}])["kirmizi"], {"90302"})

    def test_bos_ve_bozuk_yanit_hata_vermez(self):
        self.assertEqual(seviyeler([])["turuncu"], set())
        self.assertEqual(seviyeler(None)["kirmizi"], set())
        self.assertEqual(seviyeler({"towns": "beklenmeyen"})["turuncu"], set())
        self.assertEqual(seviyeler([{"towns": {"orange": ["kısa", None, ""]}}])["turuncu"], set())


class KapsamTest(unittest.TestCase):
    def test_ilce_kendi_kodu(self):
        self.assertEqual(su.kapsam_ve_seviye({"turuncu": {"90302"}, "kirmizi": set()}), ("turuncu", "sandikli"))

    def test_il_kapsami(self):
        self.assertEqual(su.kapsam_ve_seviye({"turuncu": {"90311"}, "kirmizi": set()}), ("turuncu", "il"))

    def test_kirmizi_turuncudan_ustundur(self):
        self.assertEqual(
            su.kapsam_ve_seviye({"turuncu": {"90302"}, "kirmizi": {"90311"}}), ("kirmizi", "il")
        )
        self.assertEqual(
            su.kapsam_ve_seviye({"turuncu": {"90301"}, "kirmizi": {"90302"}}), ("kirmizi", "sandikli")
        )

    def test_baska_il_uyarisi_bizi_ilgilendirmez(self):
        self.assertEqual(su.kapsam_ve_seviye({"turuncu": {"34101"}, "kirmizi": set()}), (None, None))
        self.assertEqual(su.kapsam_ve_seviye({"turuncu": set(), "kirmizi": set()}), (None, None))

    def test_sari_tek_basina_bant_uretmez(self):
        self.assertEqual(su.kapsam_ve_seviye({"turuncu": set(), "kirmizi": set(), "sari": {"90302"}}), (None, None))


class VeriTest(unittest.TestCase):
    def test_uyari_yoksa_liste_bos_ve_seviye_null(self):
        veri = su.veri_olustur({"turuncu": set(), "kirmizi": set()}, [], datetime(2026, 11, 26, 21, 55, tzinfo=TZ))
        self.assertIsNone(veri["seviye"])
        self.assertIsNone(veri["kapsam"])
        self.assertEqual(veri["uyarilar"], [])
        self.assertEqual(veri["merkez_kodu"], "90302")
        self.assertEqual(veri["cekildi"], "2026-11-26T21:55:00+03:00")

    def test_uyari_varken_metinler_korunur(self):
        uyarilar = [{"seriNo": "26010459", "hadise": "Kuvvetli Kar Yağışı", "zaman": "27.11.2026 06:00-18:00"}]
        veri = su.veri_olustur({"turuncu": {"90302"}, "kirmizi": set()}, uyarilar, datetime(2026, 11, 26, 22, 0, tzinfo=TZ))
        self.assertEqual(veri["seviye"], "turuncu")
        self.assertEqual(veri["kapsam"], "sandikli")
        self.assertEqual(veri["uyarilar"][0]["seriNo"], "26010459")

    def test_baska_ilin_metni_bantta_gorunmez(self):
        detaylar = [
            {"seriNo": "1", "baslik": "İstanbul'da kuvvetli yağış", "hadiseYer": "İstanbul çevreleri"},
            {"seriNo": "2", "baslik": "Ege'de kar", "hadiseYer": "Afyonkarahisar ve Uşak çevreleri"},
        ]
        sonuc = su.ilgili_uyarilar([], detaylar)
        self.assertEqual([u["seriNo"] for u in sonuc], ["2"])


if __name__ == "__main__":
    unittest.main()
