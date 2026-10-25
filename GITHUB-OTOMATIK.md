# GitHub ile otomatik güncelleme

Portal **statik HTML** olduğu için canlı sitede haberler kendiliğinden değişmez.  
GitHub Actions her gün belediyeden veri çeker, dosyaları günceller ve commit eder.  
Hosting (Pages / Netlify / Cloudflare) bu commit’i görünce siteyi yeniden yayınlar.

```
Belediye web  →  scripts/sync_portal.py  →  HTML güncelle  →  git push  →  site yayını
     (sabah)           (Actions)                                    (otomatik deploy)
```

## 1) Repoyu GitHub’a at

Bilgisayarında (PowerShell):

```powershell
cd C:\Users\musty\sandikli-portal
git init
git add .
git commit -m "Sandıklı portal ilk yükleme"
```

GitHub’da **New repository** oluştur (ör. `sandikli-portal`), sonra:

```powershell
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/sandikli-portal.git
git push -u origin main
```

## 2) Actions’ı aç

1. GitHub → repo → **Settings** → **Actions** → **General**  
2. **Allow all actions** (veya en azından bu workflow)  
3. **Workflow permissions** → **Read and write permissions** → Save  

Dosya zaten repoda:  
`.github/workflows/daily-sync.yml`

## 3) Elle bir kez dene

1. Repo → **Actions**  
2. **Daily portal sync**  
3. **Run workflow** → **Run workflow**  

Yeşil tik = başarılı. Commit geçmişinde `chore(sync): ...` görünür.

## 4) Siteyi yayınla (deploy)

### Seçenek A — GitHub Pages (ücretsiz)
- **Settings** → **Pages** → Source: **Deploy from a branch**  
- Branch: `main` / folder: `/ (root)`  
- Adres: `https://KULLANICI.github.io/sandikli-portal/`

### Seçenek B — Netlify / Cloudflare Pages (ücretsiz)
- GitHub hesabını bağla  
- Repo’yu seç → build komutu **boş** (statik site)  
- Publish directory: `/` veya `.`  
- Her `git push` (Actions dahil) otomatik yeniden yayın

## 5) Yerelde scripti denemek

```powershell
cd C:\Users\musty\sandikli-portal
python scripts/sync_portal.py
```

## Ne güncellenir?

| Dosya | Kaynak |
|--------|--------|
| `haberler.html` | sandikli.bel.tr/haberler (+ duyurular) |
| `index.html` teaser | İlk 6 haber |
| `nobetci-eczaneler.html` | nobetci-eczaneler listesi + bugün vurgusu |
| `cenaze-ilanlari.html` | cenaze-ilanlari sayfa 1 (tam metin) |

**Güncellenmez:** SANVAK uzun arşiv, sosyal medya fotoğrafları, tasarım CSS.

## Saat

Workflow: **her gün 05:00 UTC** ≈ **08:00 İstanbul**.  
Değiştirmek için `.github/workflows/daily-sync.yml` içindeki `cron` satırını düzenle.

## Sorun giderme

| Sorun | Çözüm |
|--------|--------|
| Actions kırmızı | Log’a bak; belediye sitesi erişim hatası olabilir |
| Commit yok | İçerik değişmemiş olabilir — normal |
| Push reddedildi | Workflow permissions → Read and write |
| Site eski | Deploy bağlı mı? Pages/Netlify log’una bak |
| Türkçe bozuk | Script UTF-8 kullanır; dosyaları bozma |

## Grok `/sandikliportal` ile farkı

| | Grok skill | GitHub Actions |
|--|------------|----------------|
| Ne zaman | Sen yazınca / Grok scheduler | Her gün sunucuda |
| Sosyal medya derin tarama | Var (X/IG/FB araçları) | Sadece belediye web |
| Canlı site | Dosyayı sen yüklemezsen güncellenmez | Push + deploy ile güncellenir |

**Öneri:** Canlı site için Actions; ekstra zengin içerik için ara sıra `/sandikliportal`.
