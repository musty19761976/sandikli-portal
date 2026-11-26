#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sandıklı Portal — meteorolojik uyarı senkronu (GitHub Actions uyumlu).

Kaynak: Meteoroloji Genel Müdürlüğü'nün kendi sitesinin kullandığı servis
(servis.mgm.gov.tr). Uyarı seviyeleri MeteoUYARI renk kodlarıdır; bu betik
yalnızca sarı ÜSTÜ (turuncu/kırmızı) seviyeleri bant için toplar.

Davranış:
- Servis yalnızca `Origin: https://www.mgm.gov.tr` başlığıyla yanıt verir.
- Uyarı yoksa servis boş liste döner; bu hata değildir.
- Ağ/ayrıştırma hatasında çıkış kodu 1 döner (iş kırmızı yanar, sessiz bozulma yok).
- `assets/hava-uyari.json` yalnızca uyarılar değiştiğinde ya da damga 45 dakikadan
  eskiyse yeniden yazılır; boş commit üretilmez.

Yalnızca stdlib kullanır.
"""
from __future__ import annotations

import json
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo("Europe/Istanbul")

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
# MGM, kendi sitesi dışından gelen istekleri reddediyor; tarayıcının gönderdiği
# başlıkların aynısı gerekiyor.
HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "Origin": "https://www.mgm.gov.tr",
    "Referer": "https://www.mgm.gov.tr/meteouyari/turkiye.aspx",
}

SEVIYE_URL = "https://servis.mgm.gov.tr/web/meteoalarm/{gun}"
UYARI_LISTE_URL = "https://servis.mgm.gov.tr/web/alarmlar"
UYARI_DETAY_URL = "https://servis.mgm.gov.tr/web/alarmlar/detay?alarmno={no}"

KAYNAK_URL = "https://www.mgm.gov.tr/meteouyari/turkiye.aspx"

# MGM merkez kodları: 9 + il plakası (2) + ilçe sırası (2).
IL = "Afyonkarahisar"
ILCE = "Sandıklı"
MERKEZ_KODU = "90302"
IL_ONEK = "903"

SEVIYE_ADI = {"turuncu": "Turuncu", "kirmizi": "Kırmızı"}
SEVIYE_SIRA = {"turuncu": 1, "kirmizi": 2}

# Servis anahtarları İngilizce ("orange"/"red") geliyor; Türkçe yazımlar da
# ileride eklenebilir diye ikisi de eşleniyor.
ANAHTAR_SEVIYE = {
    "yellow": "sari",
    "orange": "turuncu",
    "red": "kirmizi",
    "sari": "sari",
    "turuncu": "turuncu",
    "kirmizi": "kirmizi",
    "kırmızı": "kirmizi",
}

METIN_ANAHTARLARI = ("baslik", "hadise", "aciklama", "olay", "metin", "description", "event")


# --------------------------------------------------------------------- HTTP


def _get(url: str, timeout: int = 30) -> bytes:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}: {url}")
        return resp.read()


def cevir(url: str):
    """JSON yanıtı döndürür; boş gövde None sayılır."""
    raw = _get(url)
    if not raw or not raw.strip():
        return None
    return json.loads(raw.decode("utf-8", errors="replace"))


# ---------------------------------------------------------------- ayrıştırma


def kod_normal(kod) -> str:
    """90302 / "90302" / "90302.0" → "90302"."""
    if isinstance(kod, bool) or kod is None:
        return ""
    if isinstance(kod, float):
        kod = int(kod)
    metin = str(kod).strip()
    if not metin:
        return ""
    if metin.endswith(".0"):
        metin = metin[:-2]
    rakam = "".join(ch for ch in metin if ch.isdigit())
    return rakam


def _seviye_anahtari(anahtar: str) -> str | None:
    return ANAHTAR_SEVIYE.get(str(anahtar).strip().lower())


def _seviye_degeri(deger) -> str | None:
    """Serbest metin/sayı seviye alanını turuncu/kirmizi'ye çevirir."""
    if isinstance(deger, (int, float)) and not isinstance(deger, bool):
        # MeteoAlarm ölçeği: 2 sarı, 3 turuncu, 4 kırmızı.
        return {3: "turuncu", 4: "kirmizi"}.get(int(deger))
    metin = str(deger).strip().lower()
    if not metin:
        return None
    if "kırmızı" in metin or "kirmizi" in metin or metin == "red":
        return "kirmizi"
    if "turuncu" in metin or metin == "orange":
        return "turuncu"
    return None


def _topla(dugum, seviyeler: dict[str, set[str]], derinlik: int = 0) -> None:
    """Uyarı yanıtındaki tüm yerleşim kodlarını seviyelerine göre toplar.

    Yanıtın kesin şeması yayımlanmadığı için savunmacı davranıyor: seviye
    adını taşıyan listeler (orange/red/turuncu/kirmizi) nerede olursa olsun
    toplanır, ayrıca doğrudan seviye alanı taşıyan kayıtlar da okunur.
    """
    if derinlik > 6:
        return

    if isinstance(dugum, list):
        for oge in dugum:
            _topla(oge, seviyeler, derinlik + 1)
        return

    if not isinstance(dugum, dict):
        return

    # Doğrudan kayıt: {"merkezId"/"ilce"/..., "seviye": "turuncu"}
    kayit_seviye = None
    for anahtar in ("seviye", "level", "renk", "color", "awareness_level"):
        if anahtar in dugum:
            kayit_seviye = _seviye_degeri(dugum[anahtar])
            if kayit_seviye:
                break
    if kayit_seviye:
        for anahtar in ("merkezId", "merkezKodu", "kod", "town", "towns"):
            if anahtar in dugum and not isinstance(dugum[anahtar], (dict, list)):
                kod = kod_normal(dugum[anahtar])
                if len(kod) == 5:
                    seviyeler[kayit_seviye].add(kod)

    for anahtar, deger in dugum.items():
        seviye = _seviye_anahtari(anahtar)
        if seviye and isinstance(deger, list):
            for oge in deger:
                kod = kod_normal(oge)
                if len(kod) == 5:
                    seviyeler[seviye].add(kod)
            continue
        if isinstance(deger, (dict, list)):
            _topla(deger, seviyeler, derinlik + 1)


def seviyeleri_bul(ham) -> dict[str, set[str]]:
    seviyeler: dict[str, set[str]] = {"sari": set(), "turuncu": set(), "kirmizi": set()}
    _topla(ham, seviyeler)
    return seviyeler


def kapsam_ve_seviye(seviyeler: dict[str, set[str]]) -> tuple[str | None, str | None]:
    """(seviye, kapsam) — Sandıklı kendi koduna, il ise 903 önekinden bakılır."""
    for seviye in ("kirmizi", "turuncu"):
        kodlar = seviyeler.get(seviye, set())
        if MERKEZ_KODU in kodlar:
            return seviye, "sandikli"
        if any(k.startswith(IL_ONEK) for k in kodlar):
            return seviye, "il"
    return None, None


def _metin_bul(kayit: dict) -> str:
    for anahtar in METIN_ANAHTARLARI:
        deger = kayit.get(anahtar)
        if isinstance(deger, str) and deger.strip():
            return " ".join(deger.split())
    return ""


def ilgili_uyarilar(ham_liste, detaylar: list[dict]) -> list[dict]:
    """Afyonkarahisar/Sandıklı'yı anan uyarı metinlerini sadeleştirir.

    Liste ucu yalnızca seri numarası ve başlık veriyor; tam metin detayda.
    Metin bizim ilçemize değmiyorsa bantta uydurma cümle olmasın diye atlanır.
    """
    sonuc: list[dict] = []
    for kayit in detaylar:
        if not isinstance(kayit, dict):
            continue
        tam_metin = " ".join(
            str(kayit.get(anahtar) or "") for anahtar in ("baslik", "hadiseYer", "riskler")
        )
        kucuk = tam_metin.lower()
        if "sandıklı" not in kucuk and "sandikli" not in kucuk and "afyonkarahisar" not in kucuk:
            continue
        sonuc.append(
            {
                "seriNo": str(kayit.get("seriNo") or ""),
                "baslik": _metin_bul({"baslik": kayit.get("baslik")}),
                "hadise": _metin_bul({"hadise": kayit.get("hadiseCinsi")}),
                "zaman": _metin_bul({"zaman": kayit.get("hadiseZaman")}),
                "bitis": _metin_bul({"bitis": kayit.get("bitis")}),
                "riskler": _metin_bul({"riskler": kayit.get("riskler")}),
            }
        )
    return sonuc


def detaylari_cek(ham_liste, en_fazla: int = 8) -> list[dict]:
    if not isinstance(ham_liste, list):
        return []
    detaylar: list[dict] = []
    for kayit in ham_liste[:en_fazla]:
        if not isinstance(kayit, dict):
            continue
        seri = kayit.get("seriNo")
        if not seri:
            continue
        try:
            detay = cevir(UYARI_DETAY_URL.format(no=seri))
        except (urllib.error.URLError, RuntimeError, json.JSONDecodeError, OSError) as e:
            print(f"  · uyarı detayı alınamadı ({seri}): {e}")
            continue
        if isinstance(detay, dict):
            detaylar.append(detay)
    return detaylar


def veri_olustur(seviyeler: dict[str, set[str]], uyarilar: list[dict], zaman: datetime) -> dict:
    seviye, kapsam = kapsam_ve_seviye(seviyeler)
    return {
        "kaynak": "Meteoroloji Genel Müdürlüğü · MeteoUyarı",
        "kaynak_url": KAYNAK_URL,
        "cekildi": zaman.isoformat(timespec="seconds"),
        "il": IL,
        "ilce": ILCE,
        "merkez_kodu": MERKEZ_KODU,
        "seviye": seviye,
        "kapsam": kapsam,
        "uyarilar": uyarilar if seviye else [],
    }


# --------------------------------------------------------------------- yazma


def yaz(path: Path, veri: dict, onceki: dict | None, zorla: bool) -> bool:
    """Değişiklik yoksa ve damga tazeyse dosyayı yeniden yazmaz."""
    yeni = json.dumps(veri, ensure_ascii=False, indent=2) + "\n"
    if path.exists() and not zorla and isinstance(onceki, dict):
        eski = json.dumps(onceki, ensure_ascii=False, indent=2) + "\n"
        uyari_ayni = onceki.get("uyarilar") == veri.get("uyarilar") and onceki.get("seviye") == veri.get("seviye")
        try:
            eski_zaman = datetime.fromisoformat(str(onceki.get("cekildi")))
            taze = datetime.now(TZ) - eski_zaman < timedelta(minutes=45)
        except (TypeError, ValueError):
            taze = False
        if uyari_ayni and taze and eski != yeni:
            # Yalnızca damga değişecekti; boş commit atmayalım.
            return False
        if eski == yeni:
            return False
    if path.exists() and not zorla and path.read_text(encoding="utf-8") == yeni:
        return False
    path.write_text(yeni, encoding="utf-8")
    return True


def main(argv: list[str]) -> int:
    zorla = "--zorla" in argv
    simdi = datetime.now(TZ)
    print(f"uyarı senkronu {simdi:%d.%m.%Y %H:%M} Europe/Istanbul")

    hatalar: list[str] = []
    seviyeler: dict[str, set[str]] = {"sari": set(), "turuncu": set(), "kirmizi": set()}
    for gun in ("today", "tomorrow"):
        try:
            ham = cevir(SEVIYE_URL.format(gun=gun))
            bulunan = seviyeleri_bul(ham)
            for anahtar, kodlar in bulunan.items():
                seviyeler[anahtar] |= kodlar
            print(f"  {gun}: {len(ham) if isinstance(ham, list) else 0} uyarı kaydı")
        except (urllib.error.URLError, RuntimeError, json.JSONDecodeError, OSError) as e:
            hatalar.append(f"{gun}: {e}")
            print(f"  HATA — {gun}: {e}")

    uyarilar: list[dict] = []
    if not hatalar:
        try:
            liste = cevir(UYARI_LISTE_URL)
            detaylar = detaylari_cek(liste)
            uyarilar = ilgili_uyarilar(liste, detaylar)
            print(f"  uyarı listesi: {len(detaylar)} kayıt, ilçeye değen {len(uyarilar)} metin")
        except (urllib.error.URLError, RuntimeError, json.JSONDecodeError, OSError) as e:
            # Metin süslemesi zorunlu değil; seviye bilgisi yeterli.
            print(f"  · uyarı metinleri alınamadı: {e}")

    if hatalar:
        print("uyarı senkronu FAILED: " + " | ".join(hatalar))
        return 1

    seviye, kapsam = kapsam_ve_seviye(seviyeler)
    print(
        "  sonuç: "
        + ("uyarı yok" if not seviye else f"{SEVIYE_ADI[seviye]} · {kapsam}")
        + f" · turuncu {len(seviyeler['turuncu'])} / kırmızı {len(seviyeler['kirmizi'])} yerleşim"
    )

    path = ROOT / "assets" / "hava-uyari.json"
    onceki = None
    if path.exists():
        try:
            onceki = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            onceki = None

    veri = veri_olustur(seviyeler, uyarilar, simdi)
    if yaz(path, veri, onceki, zorla):
        print("  · assets/hava-uyari.json güncellendi")
    else:
        print("  · assets/hava-uyari.json: değişiklik yok")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
