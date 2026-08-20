# Mühürhane

[![Repo](https://img.shields.io/badge/GitHub-muhurhane__AI-111?logo=github)](https://github.com/HsynSrky/muhurhane_AI)

Anadolu Selçuklu motiflerinden kişiye özel dijital mühür üreten web uygulaması.

Katılımcı bir kuşak, bir arma ve bir damga seçer, adını yazar; mühür tarayıcıda anında kurulur ve **3000×3000 HD PNG** sertifika olarak indirilir. Üretken yapay zekâ modeli yoktur; sunucu da gerekmez.

| Katman | Teknoloji |
|---|---|
| Ön uç | React + Vite + TypeScript + Tailwind + Framer Motion |
| Veri | Derleme zamanında gömülen motif kataloğu ve Orhun tablosu |
| Render | Tarayıcıda SVG kompozisyon; PNG aynı SVG’den canvas ile |

PRD sapmaları ve motif tarihçeleri: [`docs/PRD-tamamlayici.md`](docs/PRD-tamamlayici.md).

---

## Hızlı başlangıç

Gereksinim: **Node 20+**. Python yalnızca motif SVG’si eklerken gerekir.

```bash
cd frontend
npm install
npm run dev
```

Uygulama: http://localhost:5173

Yeni motif eklediyseniz önce `python backend/scripts/normalize_motifs.py` çalıştırın; geliştirme sunucusu katalog dosyasını kendiliğinden tazeler.

---

## Kullanım akışı

| Rota | Ekran | Ne yapar |
|---|---|---|
| `/` | Giriş | “Mühürhane” başlığı, örnek mühür, “Atölyeye Gir” |
| `/atolye` | Stüdyo | Üç motif şeridi, isim girişi, stil seçici, filigranlı canlı önizleme |
| `/sertifika` | Sertifika | Filigransız mühür, kişisel anı metni, HD PNG indirme, paylaşım linki |

Paylaşım linki seçimleri URL’de taşır (`/atolye?f=3.1&s=1.1&t=2.1&n=Eren+Bey`). Arka uç yok.

Stüdyoda indirme bilerek kapalıdır (AC-05): filigranlı hâl simülasyondur; indirilebilir çıktı yalnızca onaydan sonra verilir.

---

## Yayına alma

`npm run build` çıktısı (`frontend/dist`) tek başına statik sitedir. `/api` gerekmez.

```bash
cd frontend
npm ci
npm run build
```

`frontend/dist` klasörünü Netlify, Vercel, GitHub Pages, Caddy veya nginx’e koyun. SPA yönlendirmesi hazır:

- Vercel: kökteki `vercel.json` — **Kök Dizin boş (repo kökü)**, ön ayar **Vite / Other**. `backend` ve FastAPI seçilmez; katalog `backend/data` altından derlemeye girer.
- Netlify: `netlify.toml`
- nginx: `deploy/nginx.conf`

Docker:

```bash
docker build -t muhurhane .
docker run --rm -p 8080:80 muhurhane
```

GitHub Pages alt yolda yayınlıyorsanız:

```bash
VITE_BASE=/muhurhane_AI/ npm run build --prefix frontend
```

---

## Doğrulama

```bash
cd frontend
npm test
npm run typecheck
npm run verify      # T1–T9, AC-01..AC-06 (ön uç ayakta olmalı)
npm run verify:t10  # yeni SVG arayüzde belirir mi
npm run build && npm run preview
npm run perf
```

Python tarafı (isteğe bağlı arka uç):

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
```

---

## İsteğe bağlı arka uç

Canlı site FastAPI kullanmaz. Yerel katalog API’si, paylaşım kodu ve ölçüm için duruyor; ölçüm özeti `MUHURHANE_METRICS_TOKEN` olmadan kapalıdır.

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
```

Ortam değişkenleri `.env.example` dosyasındadır.

---

## Dizin yapısı

```
assets/selcuklu/        15 ham SVG motif
backend/
  app/domain/           model, stiller, anı metni
  app/application/      servisler (isteğe bağlı API)
  app/infrastructure/   JSON katalog, SQLite
  scripts/              normalize_motifs.py
  data/                 motif_content.json, motifs.generated.json, orkhon_map.json
frontend/
  src/data/             katalog yükleyici, sertifika metni, paylaşım URL
  src/seal/             geometry, compose, styles, orkhon, raster
  src/routes/           Landing, Studio, Certificate
deploy/nginx.conf
Dockerfile
```

---

## Yeni motif ekleme

1. SVG’yi `assets/selcuklu/` içine `<kimlik>_<Ad>.svg` olarak koyun (`1.x` arma, `2.x` damga, `3.x` kuşak).
2. `backend/data/motif_content.json` içine `name`, `slot` (`symbol` / `tribe` / `frame`), `blurb`, `history` ekleyin.
3. `python backend/scripts/normalize_motifs.py` çalıştırın.

Kart arayüzde kendiliğinden belirir. Canlıya almadan `npm run build` gerekir.

---

## Lisans ve kaynaklar

Motif SVG’leri projeye aittir. Yazı tipleri: **Noto Sans Old Turkic** ve **Cormorant Garamond** (SIL OFL-1.1). Orhun yazısının PNG’de de doğru görünmesi için font SVG’ye base64 gömülür.
