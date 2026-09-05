# Sinyal Avcısı — Instagram Video Otomasyonu

[sinyal-avcisi.com](https://sinyal-avcisi.com) için günlük Instagram Reels videosu üreten ve
otomatik yayınlayan pipeline. Her gün: ElevenLabs ile Türkçe seslendirme üretilir,
Remotion ile 1080x1920 dikey video render edilir, Buffer üzerinden Instagram'a
paylaşılır.

## Stack

- **Node.js** (ESM) + **Remotion** — video render
- **ElevenLabs API** — Türkçe seslendirme
- **Buffer GraphQL API** (`api.buffer.com`) — Instagram paylaşımı. Buffer'ın
  klasik REST API'si (`api.bufferapp.com/1`) 1 Şubat 2027'de kapanıyor ve yeni
  anahtarlarla çalışmıyor; video, GitHub Release üzerinden barındırılan bir
  URL ile `assets[].video.url` alanına verilir (GraphQL API dosya upload'ı
  desteklemiyor)
- **GitHub Actions** — günlük otomasyon (07:00 TR saatiyle çalışır, 08:00'de paylaşılacak
  şekilde zamanlanır)

## Klasör yapısı

```
sinyal-otomasyon/
├── src/
│   ├── topics/          topic-0.json (tanıtım) .. topic-10.json (10 ders konusu)
│   ├── components/      Remotion slide bileşenleri
│   ├── lib/timing.js    frame dağıtım yardımcıları
│   ├── theme.ts         renkler, süre sabitleri
│   ├── types.ts
│   ├── Root.tsx          Composition kayıtları (video-0 .. video-10)
│   └── index.ts          Remotion entry point
├── scripts/
│   ├── lib/topics.js     gün->konu eşlemesi (gün sayısı mod 11)
│   ├── generate-audio.js ElevenLabs TTS
│   ├── render-video.js   Remotion render
│   ├── publish-buffer.js GitHub Release + Buffer paylaşımı
│   └── run-tests.js      API anahtarı gerektirmeyen şema/mantık testleri
└── .github/workflows/daily-video.yml
```

## Konu seçimi

`scripts/lib/topics.js` içindeki `EPOCH_DATE_UTC` (bu reponun kurulduğu tarih) ile
bugün arasındaki gün farkı `mod 11` alınır: **gün 0 → tanıtım videosu (topic-0)**,
gün 1..10 → sırasıyla 10 ders konusu, gün 11'de tekrar tanıtıma dönülür. Harici bir
durum dosyasına ihtiyaç yoktur; hesaplama tarihe göre deterministiktir.

Belirli bir konuyu elle test etmek için `TOPIC_INDEX=3` ortam değişkenini set edin
(workflow'da `workflow_dispatch` girdisi olarak da verilebilir).

## Video tasarımı

- 1080x1920 dikey, 30 fps
- Arka plan `#0B132B`, başlıklar `#FFD700`, kural kutuları beyaz metin + altın border
- Her slide'ın metni soldan kayarak (spring animasyonu) içeri girer
- Sağ üstte sabit "Sinyal Avcısı" logosu
- Toplam süre gerçek seslendirme uzunluğuna göre **50-60 saniye** aralığında otomatik
  hesaplanır (`Root.tsx` → `calculateMetadata`); slide süreleri bu toplam süreye eşit
  olacak şekilde slide sayısına bölünür (tanıtımda 10, derslerde 5 slide).

## Kurulum

```bash
npm install
cp .env.example .env   # değerleri doldurun (yerel testte kabuğa export edin, dotenv kullanılmıyor)
```

### Yerel önizleme (Remotion Studio)

```bash
npm start
```

### Uçtan uca yerel test (API anahtarları olmadan)

Render pipeline'ı ElevenLabs/Buffer anahtarı olmadan da test edilebilir — ses
üretimi atlanır, video varsayılan 55 saniyelik süreyle sessiz render edilir:

```bash
TOPIC_INDEX=1 node scripts/render-video.js
# çıktı: out/video-1.mp4
```

### Şema/mantık testleri

```bash
npm test
```

### Gerçek seslendirmeyle test (ELEVENLABS_API_KEY gerekir)

```bash
export ELEVENLABS_API_KEY=...
TOPIC_INDEX=1 node scripts/generate-audio.js
TOPIC_INDEX=1 node scripts/render-video.js
```

`publish-buffer.js` yalnızca GitHub Actions içinde (GITHUB_TOKEN + GITHUB_REPOSITORY
otomatik sağlanır) tam çalışır; yerel ortamda GitHub Release adımı atlanıp sadece
render edilen dosyanın yolu loglanır.

## GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Açıklama |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs API anahtarı (Profile → API Keys'te oluşturulan, `sk_` ile başlayan değer — panelde görünen kısa "key ID" değil) |
| `BUFFER_ACCESS_TOKEN` | Buffer **GraphQL** API anahtarı (Buffer → Settings → API'den oluşturulur; eski REST API'nin "access token"ından farklıdır) |
| `BUFFER_CHANNEL_ID` | Opsiyonel — verilmezse bağlı Instagram kanalı otomatik bulunur (`findInstagramChannel()`). Verilecekse GraphQL `channels()` sorgusundan dönen `id` olmalı, eski REST `profile_id` değil |

`GITHUB_TOKEN` GitHub Actions tarafından otomatik sağlanır, ek bir şey yapmanıza
gerek yok — sadece workflow'daki `permissions: contents: write` release oluşturup
asset yükleyebilmesi için gerekli.

## Bilinen sınırlamalar / sonraki adımlar

- ElevenLabs sesi varsayılan olarak George'dur (`JBFqnCBsd6RMkjVDRZzb`) —
  ücretsiz ElevenLabs planında API'den kullanılabilen bir premade ses.
  Voice Library'deki sesler ücretsiz planda API'ye kapalı (`payment_required`
  hatası verir); kendi klonladığınız/"My Voices"a eklediğiniz bir ses
  kullanmak isterseniz `ELEVENLABS_VOICE_ID` ile değiştirin.
- Slide zamanlaması toplam ses süresine göre eşit dağıtılır; seslendirmenin
  cümle sınırlarıyla birebir senkronize edilmesi (kelime-seviyesi zaman damgası)
  kapsam dışıdır — istenirse ElevenLabs'ın "timestamps" özelliğiyle eklenebilir.
- Video barındırma için GitHub Releases kullanılıyor (ek bir bulut depolama
  servisine ihtiyaç duymamak için); repo büyüklüğü zamanla artabilir, gerekirse
  eski release'leri temizleyen bir adım eklenebilir.
