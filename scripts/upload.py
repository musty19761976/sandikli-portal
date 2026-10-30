#!/usr/bin/env python3
"""Sandıklı resim yükle — Cloudinary'e gönder, URL'yi al.

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
API_KEY = "369881526152257"
API_SECRET = "WU6HrHOzyOZormiYzsCei7bq-d0"
BASE = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"


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
    files = sys.argv[1:]
    if not files:
        print("Kullanım: python scripts/upload.py resim.jpg [resim2.png ...]")
        print("Çıktıdaki URL'yi HTML'e kopyala.")
        return

    for f in files:
        upload(f)


if __name__ == "__main__":
    main()
