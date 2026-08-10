# Mühürhane AI

[![Repo](https://img.shields.io/badge/GitHub-muhurhane__AI-111?logo=github)](https://github.com/merenaydin23/muhurhane_AI)

TDT 13. Buluşma için Anadolu Selçuklu motiflerinden kişiye özel dijital mühür üreten web uygulaması.

Katılımcı bir kuşak, bir arma ve bir damga seçer, adını yazar; mühür tarayıcıda anında kurulur ve **3000×3000 HD PNG** sertifika olarak indirilir.

| Katman | Teknoloji |
|---|---|
| Arka uç | FastAPI (katalog, Orhun çevirisi, anı metni, paylaşım, metrik) |
| Ön uç | React + Vite + TypeScript + Tailwind + Framer Motion |
| Render | Tarayıcıda SVG kompozisyon; PNG aynı SVG’den canvas ile |

PRD sapmaları, motif tarihçeleri, Orhun harf tablosu ve mühür geometrisi: [`docs/PRD-tamamlayici.md`](docs/PRD-tamamlayici.md).

---

## Hızlı başlangıç

Gereksinim: **Python 3.12+** ve **Node 20+**.

### 1. Arka uç

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux / macOS
# source .venv/bin/activate

pip install -r backend/requirements.txt
python backend/scripts/normalize_motifs.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
```

### 2. Ön uç (ayrı terminal)

```bash
cd frontend
npm install
npm run dev
```

- Uygulama: http://localhost:5173  
- API dokümanı: http://127.0.0.1:8000/docs  

`normalize_motifs.py`, `assets/selcuklu/*.svg` dosyalarını okuyup `backend/data/motifs.generated.json` üretir. Bu adım atlanırsa arka uç hata verir. Katalog dosyası değişince sunucu kendini tazeler; yeni motif için yeniden başlatmak gerekmez.

---

## Kullanım akışı

| Rota | Ekran | Ne yapar |
|---|---|---|
| `/` | Giriş | TDT logosu, “Mühürhane AI” başlığı, örnek mühür, “Atölyeye Gir” |
| `/atolye` | Stüdyo | Üç motif şeridi, isim girişi, stil seçici, filigranlı canlı önizleme |
| `/sertifika` | Sertifika | Filigransız mühür, kişisel anı metni, HD PNG indirme, paylaşım linki |

Stüdyoda indirme bilerek kapalıdır (AC-05): filigranlı hâl simülasyondur; indirilebilir çıktı yalnızca onaydan sonra verilir.

---

## Mimari

```
assets/selcuklu/*.svg
        │  normalize_motifs.py
        ▼
backend/data/motifs.generated.json
        │  /api/catalog
        ▼
frontend/src/seal/  geometry → compose → SVG
                              ├─ canlı önizleme (DOM)
                              └─ raster.ts → 3000×3000 PNG
```

Arka uç Clean Architecture: `domain` → `application` → `infrastructure` → `api`.

Mühür kompozisyonu sunucuda değil tarayıcıda kurulur; önizleme ile indirilen dosya tek kaynaktan üretilir.

### API uç noktaları

| Metot | Yol | İşlev |
|---|---|---|
| GET | `/api/health` | Sağlık kontrolü |
| GET | `/api/catalog` | 15 motif + bölge etiketleri + stiller |
| GET | `/api/orkhon/map` | Latin–Orhun harf tablosu |
| POST | `/api/transliterate` | Metni Orhun alfabesine çevirir |
| POST | `/api/certificate-text` | Kişisel anı metni üretir |
| POST | `/api/share` · GET `/api/share/{code}` | Kısa kodla paylaşım |
| POST | `/api/metrics/events` · GET `/api/metrics/summary` | Kullanım ölçümü (SQLite) |

---

## Doğrulama

Her iki sunucu ayaktayken:

```bash
cd frontend
npm run verify      # T1–T9, AC-01..AC-06 ve erişilebilirlik
npm run verify:t10  # yeni SVG arayüzde belirir mi
npm run build && npm run preview
npm run perf
```

```bash
python backend/scripts/bench_api.py
```

### Son ölçüm sonuçları

| Bütçe | Hedef | Ölçülen |
|---|---|---|
| Giriş LCP | &lt; 1.5 s | 188 ms |
| Stüdyo LCP | &lt; 1.5 s | 232 ms |
| API p95 | &lt; 20 ms | 0.9–1.2 ms |
| İlk yük aktarımı | — | ~240 kB |

---

## Yayına alma

`npm run build` çıktısı (`frontend/dist`) statik sunulur; `/api/*` FastAPI’ye yönlendirilir. Geliştirmede Vite vekilliği, üretimde nginx/Caddy vb. kullanılır.

Paylaşım ve metrikler `backend/data/muhurhane.sqlite3` içinde tutulur; kalıcı birim olarak bağlanmalıdır.

**Ortam değişkenleri**

| Değişken | Açıklama |
|---|---|
| `MUHURHANE_CATALOG_FILE` | Motif katalog yolu |
| `MUHURHANE_DB_FILE` | SQLite dosya yolu |
| `MUHURHANE_CORS_ORIGINS` | Virgülle ayrılmış izinli origin listesi |

---

## Dizin yapısı

```
assets/selcuklu/        15 ham SVG motif
backend/
  app/domain/           model, stiller, anı metni
  app/application/      servisler
  app/infrastructure/   JSON katalog, SQLite
  app/api/              rotalar, şemalar
  scripts/              normalize_motifs.py, bench_api.py
  data/                 motif_content.json, motifs.generated.json
frontend/
  src/seal/             geometry, compose, styles, orkhon, raster
  src/routes/           Landing, Studio, Certificate
  src/components/       motif kartları, önizleme, stil seçici
  scripts/              verify.mjs, check-t10.mjs, perf.mjs
docs/PRD-tamamlayici.md
```

---

## Yeni motif ekleme

1. SVG’yi `assets/selcuklu/` içine `<kimlik>_<Ad>.svg` olarak koyun (`1.x` arma, `2.x` damga, `3.x` kuşak).
2. `backend/data/motif_content.json` içine `name`, `slot` (`symbol` / `tribe` / `frame`), `blurb`, `history` ekleyin.
3. `python backend/scripts/normalize_motifs.py` çalıştırın.

Kart arayüzde kendiliğinden belirir.

---

## Lisans ve kaynaklar

Motif SVG’leri projeye aittir. Yazı tipleri: **Noto Sans Old Turkic** ve **Cormorant Garamond** (SIL OFL-1.1). Orhun yazısının PNG’de de doğru görünmesi için font SVG’ye base64 gömülür.
