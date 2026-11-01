#!/usr/bin/env python3
"""Sandıklı resim yükle — Cloudinary'e gönder, URL'yi al.

Kimlik bilgileri kodda tutulmaz. Sırayla şuradan okunur:
  1) ortam değişkenleri: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  2) proje kökündeki .env dosyası (git'e girmez)

Kullanım:
  python scripts/upload.py resim.jpg
  python scripts/upload.py *.jpg
"""
from __future__ import annotations
import hashlib
import json
import mimetypes
import os
import sys
import time
import urllib.request


CLOUD_NAME = "njivgbxn"
BASE = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_DOSYASI = os.path.join(KOK, ".env")


def env_yukle():
    """Proje kökündeki .env dosyasını (varsa) ortam değişkenlerine ekler."""
    if not os.path.isfile(ENV_DOSYASI):
        return
    with open(ENV_DOSYASI, encoding="utf-8") as f:
        for satir in f:
            satir = satir.strip()
            if not satir or satir.startswith("#") or "=" not in satir:
                continue
            anahtar, deger = satir.split("=", 1)
            os.environ.setdefault(anahtar.strip(), deger.strip().strip('"').strip("'"))


env_yukle()

# Boşsa hiçbir istek gönderilmez; anahtarlar sadece yerelde tanımlanır.
API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")


def sign(params):
    keys = sorted(params.keys())
    s = "&".join(f"{k}={params[k]}" for k in keys) + API_SECRET
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def encode_multipart(params, filepath):
    boundary = "----" + hashlib.md5(str(time.time()).encode()).hexdigest()
    body = []

    for k, v in params.items():
        body.append(f"--{boundary}\r\n".encode())
        body.append(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
        body.append(f"{v}\r\n".encode())

    filename = os.path.basename(filepath)
    mime, _ = mimetypes.guess_type(filepath)
    if not mime:
        mime = "application/octet-stream"

    body.append(f"--{boundary}\r\n".encode())
    body.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode())
    body.append(f"Content-Type: {mime}\r\n\r\n".encode())
    with open(filepath, "rb") as f:
        body.append(f.read())
    body.append(f"\r\n--{boundary}--\r\n".encode())

    return b"".join(body), boundary


def upload(filepath):
    if not os.path.isfile(filepath):
        print(f"ATLA: {filepath} bulunamadı")
        return None

    name = os.path.splitext(os.path.basename(filepath))[0]
    ts = int(time.time())

    params = {
        "timestamp": str(ts),
        "public_id": name,
        "folder": "sandikli_portal",
        "transformation": "w_1600,c_limit,q_auto,f_auto",
    }
    params["signature"] = sign(params)
    params["api_key"] = API_KEY

    data, boundary = encode_multipart(params, filepath)

    req = urllib.request.Request(
        BASE, data=data,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    try:
        resp = urllib.request.urlopen(req)
        info = json.loads(resp.read())
        url = f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/f_auto,q_auto/sandikli_portal/{name}"
        print(f"\nOK: {filepath}")
        print(f"URL: {url}")
        return url
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"\nHATA: {filepath}")
        print(body)
        return None


def main():
    if not API_KEY or not API_SECRET:
        print("HATA: Cloudinary anahtarları tanımlı değil.")
        print("  CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET ortam değişkenlerini ayarlayın,")
        print(f"  ya da {ENV_DOSYASI} dosyasına şu satırları ekleyin:")
        print("    CLOUDINARY_API_KEY=...")
        print("    CLOUDINARY_API_SECRET=...")
        return 1

    files = sys.argv[1:]
    if not files:
        print("Kullanım: python scripts/upload.py resim.jpg [resim2.png ...]")
        print("Çıktıdaki URL'yi HTML'e kopyala.")
        return 0

    for f in files:
        upload(f)
    return 0


if __name__ == "__main__":
    sys.exit(main())
