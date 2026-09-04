// ElevenLabs API ile günün konusunun seslendirmesini üretir.
// Çıktı: public/audio/topic-{N}.mp3 + public/audio/topic-{N}.meta.json
// (render-video.js bu meta dosyasından gerçek ses süresini okuyup video
// süresini 50-60 saniye aralığında buna göre ayarlar.)
//
// Gerekli env: ELEVENLABS_API_KEY
// Opsiyonel env: ELEVENLABS_VOICE_ID (varsayılan: Türkçe destekleyen
// multilingual bir ElevenLabs sesi — kendi hesabınızdaki bir Türkçe sesin
// ID'siyle değiştirin), ELEVENLABS_MODEL_ID (varsayılan: eleven_multilingual_v2)

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBuffer } from 'music-metadata';
import { loadTodaysTopic } from './lib/topics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel — hesabınızda Türkçe için tercih ettiğiniz sesle değiştirin
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

async function synthesize(text) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY tanımlı değil. .env dosyasına veya GitHub Secrets\'a ekleyin.');
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`ElevenLabs API hatası: ${res.status} ${res.statusText} ${errBody}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  const { dayNumber, topicIndex, topic } = await loadTodaysTopic();
  console.log(`[generate-audio] gün=${dayNumber} konu=${topicIndex} (${topic.title})`);

  const audioBuffer = await synthesize(topic.voiceover);

  await mkdir(PUBLIC_AUDIO_DIR, { recursive: true });
  const audioFileName = `topic-${topicIndex}.mp3`;
  const audioPath = path.join(PUBLIC_AUDIO_DIR, audioFileName);
  await writeFile(audioPath, audioBuffer);

  const metadata = await parseBuffer(audioBuffer, 'audio/mpeg');
  const durationInSeconds = metadata.format.duration ?? 0;

  const meta = {
    dayNumber,
    topicIndex,
    audioFile: audioFileName,
    durationInSeconds,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(path.join(PUBLIC_AUDIO_DIR, `topic-${topicIndex}.meta.json`), JSON.stringify(meta, null, 2));

  console.log(`[generate-audio] tamamlandı: ${audioFileName} (${durationInSeconds.toFixed(1)}s)`);
}

main().catch((err) => {
  console.error('[generate-audio] HATA:', err);
  process.exit(1);
});
