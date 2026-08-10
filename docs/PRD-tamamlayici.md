# Mühürhane AI — PRD Tamamlayıcı Doküman

**Sürüm:** 1.1-T · **Tarih:** 2026-08-09
**Kapsam:** Elimizdeki `prd.text.txt` dosyası 10. bölümün ortasında başlıyor. Bu doküman eksik olan **1–9. bölümleri** tamamlar ve uygulama sırasında PRD'den sapılan her noktayı kayıt altına alır.

> Bu doküman `prd.text.txt` ile birlikte okunmalıdır. Çakışma olursa **bu doküman** geçerlidir (sebepleri 0. bölümde).

---

## 0. Sapma ve İyileştirme Kaydı

Aşağıdaki maddeler PRD'nin yazıldığı andaki varsayımların uygulanabilir olmadığı ya da ürün hedefiyle çeliştiği noktalardır.

### 0.1 Zorunlu sapmalar

| # | PRD ne diyor | Ne yapıldı | Gerekçe |
|---|---|---|---|
| S-1 | AC-07: "yalnızca Streamlit ve Pillow ile uygulama ayağa kalkar" | FastAPI (arka uç) + React/Vite (ön uç) | Streamlit her etkileşimde script'i baştan çalıştırır. "Akıcı ve dinamik arayüz" hedefi bu modelde teknik olarak karşılanamaz. |
| S-2 | Pillow tabanlı render motoru + mini SVG parser (Risk tablosu) | Kompozisyon tarayıcıda SVG olarak kurulur; HD PNG aynı SVG'den canvas ile üretilir | İki ayrı render motoru (sunucuda Pillow, tarayıcıda önizleme) kaçınılmaz olarak birbirinden ayrışır. Tek kaynak = önizleme ile çıktı bit düzeyinde aynı. Ek fayda: indirme anında, sunucu render yükü sıfır. |
| S-3 | `OrkhonFont.ttf` zorunlu | **Noto Sans Old Turkic** (SIL OFL-1.1) | Belirtilen font dosyası `assets/` içinde yok. Noto Sans Old Turkic, Old Turkic bloğunun (U+10C00–U+10C48) 77 karakterini kapsıyor ve ticari kullanıma açık. |
| S-4 | `python -m streamlit run app.py` (16. bölüm) | `uvicorn` + `vite` (bkz. README) | S-1'in sonucu. |

### 0.2 Assets kaynaklı zorunlu müdahaleler

| # | Tespit | Müdahale |
|---|---|---|
| A-1 | 13 SVG kendi `<circle r="190">` kılavuz çemberini taşıyor | Üç motif üst üste geldiğinde 3 ayrı çember çizilirdi. Normalizasyonda sökülüyor. |
| A-2 | Renkler gövdeye gömülü (`#2B2B2B`, `#8B5A2B`, `#1B4A6B`, `#7A2E2E` …) | T4 "stil değiştir → renkler güncellenir" testi için renkler `ink` / `mid` / `accent` katmanlarına haritalanıyor. |
| A-3 | `1.4_Selcuklu_Sfenksi` çember yerine 8 köşeli yıldız kaidesiyle geliyor | Yıldız kaidesi kılavuz sayılıp sökülüyor. |
| A-4 | `3.3_Hayat_Agaci` dairesel değil, `<rect>` çerçeveli | Dikdörtgen çerçeve sökülüyor. |
| A-5 | `3.x` dosyaları halka deseni değil, bağımsız amblem | PRD "frame = dış çerçeve motifi" diyor. Motif olduğu gibi kuşağa konsa mühür bozulurdu. Motiften türetilen öğe halka boyunca **radyal olarak tekrarlanıyor** (motife göre 8/12/16 adet). |
| A-6 | `3.3` grup düzeyinde `stroke` geçersiz kılması taşıyor (kartal `#5A3E1B`, bekçi hayvanlar `#7A2E2E`) | Nested stroke override'ları ayrı katman tonuna eşleniyor; motif 3 tonlu kalıyor. |
| A-7 | SVG spesifikasyonuna göre CSS sınıf kuralı sunum özniteliğini geçersiz kılar | **Bilinçli olarak tersi uygulandı.** Ham dosyalarda `.line { stroke-width: 4 }` sınıfı var ama öğelerde `stroke-width="2.5"` gibi öznitelikler de var. Spesifikasyon sırası uygulanırsa tüm çizgiler tek kalınlığa düşer ve sanatçının kurduğu detay hiyerarşisi (ana gövde kalın, tüy/göz ince) tamamen kaybolur; A-6'daki üç ton da tek renge iner. |

### 0.3 Eklenenler (PRD'de yoktu)

| # | Ekleme | Gerekçe |
|---|---|---|
| E-1 | Paylaşım linki (`/api/share`, SQLite) | Etkinlikte katılımcının mührünü tekrar açabilmesi / paylaşabilmesi. |
| E-2 | Metrik toplama (`/api/metrics`) | PRD 13. bölüm "ölçüm henüz bağlı değil" diyor; bağlandı. |
| E-3 | Klavye erişilebilirliği + `prefers-reduced-motion` | PRD'de erişilebilirlik başlığı yok. |
| E-4 | Motif normalizasyonu derleme zamanına alındı (`motifs.generated.json`) | Çalışma anında SVG parse edilmiyor; ilk boyama hızlanıyor. |
| E-5 | Katalog dosya damgasına göre sıcak yenileniyor (`JsonMotifRepository`) | T10 "yeni SVG bırak, arayüzde belirsin" diyor. Önbellek yalnızca açılışta kurulsaydı sunucuyu yeniden başlatmak gerekirdi. İstek başına tek `stat()` maliyeti var, p95 bütçesini bozmuyor. |
| E-6 | Otomatik doğrulama takımı (`npm run verify`, `verify:t10`, `perf`, `bench_api.py`) | T1-T10 ve AC-01..AC-06 elle değil, her değişiklikte tekrarlanabilir şekilde koşuluyor. |

---

## 1. Ürün Vizyonu

**Mühürhane AI**, Türk kültürel sembollerini anlaşılır ve bilinçli bir seçim akışıyla kişiye özel dijital damgaya dönüştüren tarayıcı tabanlı bir atölyedir.

Kullanıcı üç katman seçer — dış kuşak süslemesi, merkez arma, boy damgası — adını yazar, mührü canlı olarak oluşurken izler; onayladığında filigransız HD çıktısını ve "size özel üretilmiştir" anı metnini alır.

**Konumlandırma:** Bu bir *generative AI* ürünü değildir. "AI" marka adının parçasıdır; sistem kurallı bir kompozisyon motorudur. Bu ayrım PRD 14. bölümde risk olarak da işaretlenmiştir ve arayüzde açıkça belirtilir.

**Bağlam:** TDT 13. Buluşma · Türkiye anısına · Anadolu Selçuklu odaklı · jüri/etkinlik prototipi.

---

## 2. Hedef Kitle ve Personalar

| Persona | Bağlam | İhtiyaç | Tasarım karşılığı |
|---|---|---|---|
| **Etkinlik katılımcısı** | Standda 2–4 dakikası var, telaşlı | Hızlı, tıkanmadan biten bir akış | Tek ekran stüdyo, kaydırma gerektirmeyen ana akış, anlık önizleme |
| **Kültür meraklısı** | Motifin ne anlama geldiğini merak eder | Sembolün hikâyesi | Kartta kısa blurb, seçince uzun tarihçe (AC-02) |
| **Jüri / değerlendirici** | Teknik ve kültürel tutarlılık arar | Kaynaklı içerik, temiz mimari | Bu doküman + katmanlı mimari + kabul kriteri eşlemesi |

---

## 3. Kapsam

**Kapsam içi**
- Üç slotlu motif seçimi (frame / symbol / tribe)
- Latin isim girişi ve Orhun transliterasyonu
- Üç renk stili
- Filigranlı simülasyon → onay → filigransız sertifika akışı
- HD PNG indirme
- Anadolu Selçuklu dönemi motif seti (15 motif)

**Kapsam dışı (bu sürümde)**
- Kullanıcı hesabı / kimlik doğrulama (PRD 14: demo ortamında gerekmez)
- Generative model
- Diğer dönem klasörleri (Göktürk, Osmanlı) — "Yakında" rozetiyle gösterilir
- Mobil öncelikli düzen (PRD 14: masaüstü tarayıcı varsayımı); mobilde çalışır ama optimize edilmemiştir

---

## 4. Sistem Mimarisi

```
Derleme zamanı            Arka uç (FastAPI)              Ön uç (React/Vite)
─────────────────         ──────────────────             ──────────────────
assets/selcuklu/*.svg     domain/      saf modeller      seal/     kompozisyon
        │                 application/ servisler         routes/   sayfalar
        ▼                 infrastructure/ repo + SQLite  components/ UI
normalize_motifs.py       api/         HTTP uçları              │
        │                        │                              │
        ▼                        │                              ▼
motifs.generated.json ───────────┘──────────────────────► canlı SVG önizleme
                                                                 │
                                                                 ▼
                                                          canvas → HD PNG
```

Arka uç Clean Architecture ile katmanlıdır (PRD 0.1 sürüm notundaki iskeleti korur):

- **domain** — çerçeveden bağımsız veri modelleri ve iş kuralları (`Motif`, `SealSpec`, `MotifSlot`)
- **application** — kullanım senaryoları (`CatalogService`, `TransliterationService`, `CertificateService`, `ShareService`)
- **infrastructure** — kalıcılık ve dış kaynaklar (`JsonMotifRepository`, `SqliteShareRepository`)
- **api** — HTTP taşıma katmanı; iş kuralı içermez

---

## 5. Motif Kataloğu

Dosya adındaki numara slot'u belirler: `1.x` = symbol, `2.x` = tribe, `3.x` = frame.

### 5.1 Symbol — Merkez arma (`1.x`)

| Kod | Ad | Kısa blurb (kart) |
|---|---|---|
| 1.1 | Çift Başlı Kartal | Selçuklu'nun hükümdarlık ve iki yöne hâkimiyet arması |
| 1.2 | Şir-i Hurşid | Aslan ve güneş: kudretin göksel meşruiyeti |
| 1.3 | Çifte Ejderha | Zamanın ve kapıların bekçisi, iki düğümlü ejder |
| 1.4 | Selçuklu Sfenksi | İnsan başlı kanatlı koruyucu, saray çinilerinin bekçisi |
| 1.5 | Simurg / Anka | Küllerinden doğan devlet, ölümsüzlük kuşu |

**Uzun tarihçeler**

- **1.1 Çift Başlı Kartal** — Çift başlı kartal, Anadolu Selçuklu Devleti'nin en tanınan hükümdarlık amblemidir. İki başın doğuya ve batıya bakması, hükümdarın her iki yöne birden hâkim olduğu inancını taşır. Konya surlarında, Divriği Ulu Camii taş işçiliğinde ve Selçuklu sikkelerinde görülür; sonraki yüzyıllarda birçok Türk beyliğine ve devlet armasına geçmiştir. Açılmış kanatlar koruma, pençedeki küçük madalyon ise devletin mührünü simgeler.

- **1.2 Şir-i Hurşid** — "Aslan ve Güneş" anlamına gelen Şir-i Hurşid, İran-Türk ortak sembol dağarcığının en güçlü kompozisyonlarından biridir. Yürüyen aslan dünyevi gücü, sırtından yükselen güneş kursu ise bu gücün göksel kaynağını temsil eder. Anadolu Selçuklu sikkelerinde, özellikle II. Gıyaseddin Keyhüsrev döneminde basılmış paralarda görülür ve hükümdarın yeryüzündeki yetkisinin ilahi onaya dayandığını ilan eder.

- **1.3 Çifte Ejderha** — Karşılıklı duran ve kuyrukları merkezde düğümlenen iki ejderha, Selçuklu ikonografisinde eşiklerin ve geçişlerin koruyucusudur. Kapı tokmaklarında, kervansaray portallerinde ve Cizre Ulu Camii'nin ünlü tokmaklarında karşımıza çıkar. Düğümlenen kuyruklar zamanın döngüselliğini, açık çeneler ise kötülüğü yutan koruyuculuğu anlatır.

- **1.4 Selçuklu Sfenksi** — İnsan başlı, aslan gövdeli, kanatlı sfenks figürü Kubadabad Sarayı'nın sekiz köşeli yıldız çinilerinde en görkemli halini bulur. Selçuklu sarayında sfenks bir yabancı değil, tılsımlı bir koruyucudur: taçlı başı hükümdarın aklını, aslan gövdesi cesaretini, kanatları ise göksel korumayı temsil eder. Bu motif kaide olarak dairesel değil, sekiz köşeli yıldız formunda gelir.

- **1.5 Simurg / Anka** — Simurg, Türk ve İran mitolojisinin ortak kuşudur; Anadolu'da Anka adıyla anılır. Küllerinden yeniden doğması, devletin ve hanedanın sürekliliğine dair güçlü bir metafordur. Selçuklu taş kabartmalarında ve Kubadabad çinilerinde çoğunlukla cepheden, kanatları açık ve kuyruğu bitkisel kıvrımlarla stilize edilmiş biçimde işlenir.

### 5.2 Tribe — Boy damgası (`2.x`)

| Kod | Ad | Kısa blurb (kart) |
|---|---|---|
| 2.1 | Kayı Damgası | Bozok kolu · "sağlam, güçlü" · Osmanlı'nın çıktığı boy |
| 2.2 | Kınık Damgası | Üçok kolu · Büyük Selçuklu hanedanının boyu |
| 2.3 | Salur Damgası | Bozok kolu · "kılıç sallayan" · kaz ayağı formu |
| 2.4 | Afşar Damgası | Bozok kolu · "işini çabuk gören" · yay formu |
| 2.5 | Bayındır Damgası | Üçok kolu · "bolluk, refah" · Akkoyunlu'nun boyu |

**Uzun tarihçeler**

- **2.1 Kayı** — Oğuz Kağan Destanı'na göre Gün Han'ın oğlu Kayı'dan gelen boy, Bozok kolunun en kıdemlisidir. Adı "sağlam, güçlü, kudret sahibi" anlamındadır. Damgası iki dikey çizgi arasında karşılıklı iki oktan oluşur ve "IYI" biçiminde okunur. Kayı boyu, Anadolu'ya göçen Oğuz boyları arasında Söğüt çevresine yerleşmiş, Osmanlı hanedanı bu boydan çıkmıştır.

- **2.2 Kınık** — Üçok kolunun boylarından olan Kınık, adını "her yerde aziz, muteber" anlamından alır. Büyük Selçuklu hanedanı bu boydan çıkmış; Selçuk Bey ve ardından Tuğrul ile Çağrı Beyler önderliğinde Horasan'dan Anadolu'ya uzanan devlet bu boyun adıyla anılmıştır. Damgası yalın, açılı çizgilerden oluşur.

- **2.3 Salur** — Bozok kolunun güçlü boylarından Salur, "kılıç sallayan, hükmeden" anlamındadır. Dede Korkut anlatılarının merkezî kahramanlarının çoğu Salur boyundandır. Damgası "kaz ayağı" olarak bilinen üç çatallı biçimdir; geleneksel yorumda Merih (Mars) yıldızıyla ilişkilendirilir.

- **2.4 Afşar** — Adı "işini çabuk gören, çevik" anlamına gelen Afşar boyu, Bozok kolundandır. Anadolu'da Karamanoğulları'nın kuruluşunda etkili olmuş, sonraki yüzyıllarda İran'da Afşar hanedanını kurmuştur. Damgası dikey bir gövdeye yaslanmış yay biçimli kıvrımdan oluşur.

- **2.5 Bayındır** — Üçok kolundan Bayındır, "daima nimetle dolu, refah içinde" anlamındadır. Akkoyunlu Devleti'nin hanedan boyudur ve damgası Akkoyunlu sikkelerinde resmî arma olarak kullanılmıştır. Dikey gövde üzerinde bir daire ve enine çubuktan oluşan biçimi, geleneksel yorumda Büyük Ayı takımyıldızının izdüşümü sayılır.

### 5.3 Frame — Dış kuşak süslemesi (`3.x`)

| Kod | Ad | Tekrar | Kısa blurb (kart) |
|---|---|---|---|
| 3.1 | Selçuklu Yıldızı | 8 | Rub el-Hizb · iki kareden doğan sekiz köşeli yıldız |
| 3.2 | Koçboynuzu | 12 | Bereket, güç ve kahramanlık · çift sarmal |
| 3.3 | Hayat Ağacı | 8 | Gök ile yeri bağlayan kozmik eksen |
| 3.4 | Rumi Sonsuzluk Düğümü | 12 | Başı ve sonu olmayan örgü · süreklilik |
| 3.5 | Mühür-i Süleyman | 16 | Altı köşeli yıldız · hikmet ve tılsım |

**Uzun tarihçeler**

- **3.1 Selçuklu Yıldızı (Rub el-Hizb)** — Biri 45 derece döndürülmüş iki karenin üst üste binmesiyle oluşan sekiz köşeli yıldız, Selçuklu geometrik süslemesinin temel taşıdır. Sekiz köşe, geleneksel yorumda sabır, merhamet, doğruluk, sır tutma, sadakat, cömertlik, şükür ve ilim olmak üzere sekiz erdeme karşılık gelir. Kubadabad çinilerinden Karatay Medresesi kubbesine kadar geniş bir alanda karşımıza çıkar.

- **3.2 Koçboynuzu** — Anadolu halı ve kilimlerinin en yaygın motifi olan koçboynuzu, bereketi, gücü, kahramanlığı ve erkekliği simgeler. Çift sarmal biçimi, koçun boynuzlarının stilize edilmiş halidir. Orta Asya'dan Anadolu'ya kesintisiz taşınmış en eski Türk motiflerinden biridir; mezar taşlarından dokumalara kadar her yüzeyde görülür.

- **3.3 Hayat Ağacı** — Hayat ağacı, gökyüzü ile yeraltını birbirine bağlayan kozmik eksendir. Kökleri yeraltına, dalları göğe uzanır; tepesinde çoğu zaman bir kuş ya da çift başlı kartal, dibinde ise koruyucu hayvan çifti bulunur. Türk mitolojisinde "ulu kayın" olarak anılan bu motif, Selçuklu taş işçiliğinde ve mezar taşlarında sürekliliğin ve soyun devamının işareti olarak işlenmiştir.

- **3.4 Rumi Sonsuzluk Düğümü** — Başlangıcı ve sonu ayırt edilemeyen, kendi üzerine örülen sonsuz düğüm, Selçuklu geometrik bezemesinin felsefi karşılığıdır: sonsuzluk, süreklilik ve birlik. Dört katlı simetriyle örülen şerit, alttan-üstten geçişlerle dokunmuş izlenimi verir. Selçuklu kapı kanatlarında ve minber işçiliğinde yaygındır.

- **3.5 Mühür-i Süleyman** — İki eşkenar üçgenin iç içe geçmesiyle oluşan altı köşeli yıldız, Süleyman Peygamber'in mührü olarak bilinir ve İslam sanatında hikmet, tılsım ve koruma anlamı taşır. Selçuklu ahşap tavan göbeklerinde, çini panolarında ve mezar taşlarında merkeze konan sekiz loblu rozetle birlikte işlenir.

---

## 6. Mühür Geometrisi

Tuval **1000 × 1000**, merkez **(500, 500)**. AC-03'ün "üç motif görsel olarak ayrı bölgelerde okunabilir" şartı bu bölge planıyla sağlanır.

| Bölge | İçerik | Konum |
|---|---|---|
| Dış kenar | Kalın halka | `r = 486` ve `r = 474` çift çizgi |
| Kuşak (frame) | `3.x` türevi öğe, radyal tekrar | Yerleşim yarıçapı `r = 442`, öğe kutusu `62 px` |
| Kuşak iç sınırı | İnce halka | `r = 410` |
| Üst yay | Latin isim | Yarıçap `r = 362`, tepe merkezli, saat yönü |
| Alt yay | Orhun transliterasyonu | Yarıçap `r = 362`, taban merkezli, saat yönünün tersi |
| Ayraç | Küçük dört köşe rozet | `0°` ve `180°` (sol/sağ), `r = 362` |
| İç alan sınırı | İnce halka | `r = 318` |
| Merkez (symbol) | `1.x` motifi | Merkez `(500, 452)`, kutu yarıçapı `196` |
| Alt kartuş (tribe) | `2.x` tamgası | Merkez `(500, 726)`, kutu yarıçapı `62` |
| Kartuş çerçevesi | Mercek biçimli çerçeve | `(500, 726)` etrafında |

**Yay metni yerleşimi:** Karakterler sabit açısal adımla (`Δθ`) yerleştirilir; her karakter kendi `<text>` öğesidir ve merkeze bakacak şekilde döndürülür. Bu, font metriklerine bağımlılığı ortadan kaldırır, bidi yeniden sıralamasını devre dışı bırakır ve mühürlere özgü eşit aralıklı görünümü verir.

**Filigran (simülasyon):** Mühür üzerine `12°` eğimli, düşük opaklıkta "SİMÜLASYON" metin ızgarası bindirilir. Sertifika sayfasında bu katman hiç üretilmez (AC-06).

---

## 7. Orhun Transliterasyonu

**Yazı sistemi:** Unicode Old Turkic bloğu, `U+10C00 – U+10C48`. Orkhon varyantları kullanılır (Yenisey varyantları kullanılmaz). Yazı yönü sağdan sola.

### 7.1 Ünlüler

| Latin | Orhun | Kod |
|---|---|---|
| a, e | 𐰀 | U+10C00 ORKHON A |
| ı, i | 𐰃 | U+10C03 ORKHON I |
| o, u | 𐰆 | U+10C06 ORKHON O |
| ö, ü | 𐰇 | U+10C07 ORKHON OE |

### 7.2 Ünsüzler (kalın / ince çift biçimli)

| Latin | Kalın (arka) | Kod | İnce (ön) | Kod |
|---|---|---|---|---|
| b | 𐰉 | U+10C09 | 𐰋 | U+10C0B |
| g, ğ | 𐰍 | U+10C0D | 𐰏 | U+10C0F |
| d | 𐰑 | U+10C11 | 𐰓 | U+10C13 |
| y | 𐰖 | U+10C16 | 𐰘 | U+10C18 |
| l | 𐰞 | U+10C1E | 𐰠 | U+10C20 |
| n | 𐰣 | U+10C23 | 𐰤 | U+10C24 |
| r | 𐰺 | U+10C3A | 𐰼 | U+10C3C |
| s | 𐰽 | U+10C3D | 𐰾 | U+10C3E |
| ş, j | 𐰿 | U+10C3F | 𐱁 | U+10C41 |
| t | 𐱃 | U+10C43 | 𐱅 | U+10C45 |

### 7.3 Tek biçimli ünsüzler

| Latin | Orhun | Kod |
|---|---|---|
| m | 𐰢 | U+10C22 |
| p, f | 𐰯 | U+10C2F ORKHON EP |
| ç, c | 𐰲 | U+10C32 ORKHON EC |
| z | 𐰔 | U+10C14 ORKHON EZ |
| ñ / ng | 𐰭 | U+10C2D ORKHON ENG |

### 7.4 `k` ve `h` — dört biçimli

`k` Orhun'da komşu ünlüye göre dört ayrı harfle yazılır:

| Bağlam | Orhun | Kod |
|---|---|---|
| Kalın, düz ünlü (a, ı) | 𐰴 | U+10C34 ORKHON AQ |
| Kalın, `ı` komşuluğu | 𐰶 | U+10C36 ORKHON IQ |
| Kalın, yuvarlak ünlü (o, u) | 𐰸 | U+10C38 ORKHON OQ |
| İnce, düz ünlü (e, i) | 𐰚 | U+10C1A ORKHON AEK |
| İnce, yuvarlak ünlü (ö, ü) | 𐰜 | U+10C1C ORKHON OEK |

`h` sesi Orhun alfabesinde yoktur; en yakın karşılık olan `k` biçimlerine eşlenir. `v` sesi `b` biçimlerine eşlenir.

### 7.5 Ünlü uyumu kuralı

1. Kelime içindeki ünlüler taranır. `a, ı, o, u` → **kalın (arka)** sınıf; `e, i, ö, ü` → **ince (ön)** sınıf.
2. Karışık kelimede **son ünlü** belirleyicidir (Türkçe ekleşme mantığıyla uyumlu).
3. Hiç ünlü yoksa varsayılan **kalın** sınıftır.
4. Sınıf, o kelimedeki tüm çift biçimli ünsüzlere uygulanır.
5. `k` için ayrıca en yakın ünlünün yuvarlaklığı kontrol edilir (7.4).

### 7.6 Bilinçli tercihler

- **Ünlüler korunur.** Tarihî Orhun yazımında kelime içi ünlüler çoğu zaman yazılmaz. Bu uygulamada kullanıcının adını harf harf tanıyabilmesi için tüm ünlüler yazılır. Bu bir sadeleştirmedir, tarihî imla iddiası taşımaz.
- **Kelimeler ayrı işlenir.** Ünlü uyumu her kelime için bağımsız hesaplanır; kelimeler arasına Orhun kelime ayracı `U+205A` yerine ince boşluk konur.
- **Alfabede karşılığı olmayan harfler** (`c, f, h, j, v, ğ, q, w, x`) en yakın sese eşlenir; kayıp bilgi arayüzde dipnotla belirtilir.

---

## 8. Kullanıcı Akışı ve Arayüz

```
/  Landing ──► /atolye  Studio ──► (Onayla) ──► /sertifika  Certificate
                   ▲                                  │
                   └──────────  Düzenle  ◄─────────────┘
```

### 8.1 Landing (AC-01)
TDT logosu, "Mühürhane AI" başlığı, tek cümlelik tanım, "Atölyeye Gir" birincil CTA. "Bu bir generative model değildir" notu ayak bölümünde.

### 8.2 Studio (AC-02, AC-03, AC-05)
Tek ekran, iki sütun:
- **Sol:** üç yatay motif şeridi (her biri 5 kart) → isim girişi → stil seçici
- **Sağ:** sabit canlı önizleme (filigranlı) + seçili motifin uzun tarihçe kartı

Kurallar:
- Kart üzerinde kısa blurb ve dönem görünür; seçilince uzun tarihçe detay kartına düşer (AC-02).
- Hiç motif seçilmemişse önizleme yerine boş durum mesajı çıkar (T9).
- HD indirme burada **sunulmaz** (AC-05).
- Her seçim önizlemeyi anında günceller; isim girişi 120 ms debounce'ludur.

### 8.3 Certificate (AC-06)
Filigransız mühür, PRD 11. bölümdeki şablona göre üretilmiş anı metni, HD PNG indirme düğmesi, paylaşım linki, "Düzenle" dönüş bağlantısı. Doğrudan URL ile gelinip seçim yoksa uyarı gösterilir ve stüdyoya yönlendirilir (AC-05).

### 8.4 Etkileşim ilkeleri
- Ana akış kaydırma gerektirmez (1440×900 ve üzeri).
- Tüm motif kartları klavyeyle gezilebilir (`Tab` + `Enter`/`Space`), seçili kart `aria-pressed` taşır.
- Sayfa geçişleri ve mührün çizilerek belirmesi Framer Motion ile; `prefers-reduced-motion: reduce` etkinse animasyonlar kapanır.

---

## 9. Kalite Hedefleri

| Alan | Hedef | Ölçüm |
|---|---|---|
| İlk boyama | LCP < 1.5 s | Lighthouse, yerel derleme |
| Önizleme gecikmesi | < 16 ms (tek kare) | Seçim → DOM güncelleme |
| Arka uç yanıt | p95 < 20 ms | Bellekte cache'li uçlar |
| HD çıktı | 3000 × 3000 PNG | Sertifika indirmesi |
| Paket boyutu | İlk yük < 250 KB (gzip) | Rota bazlı code splitting |
| Erişilebilirlik | Klavye ile tam akış | Manuel tur |

---

*Bu doküman `prd.text.txt` sürüm 1.0'ı tamamlar. Kod değiştikçe birlikte güncellenmelidir.*
