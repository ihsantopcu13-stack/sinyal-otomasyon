// Remotion ile günün konusunun videosunu render eder.
// Girdi: src/topics/topic-{N}.json + (varsa) public/audio/topic-{N}.mp3
// Çıktı: out/video-{N}.mp4
//
// generate-audio.js henüz çalıştırılmadıysa (örn. yerel test), ses olmadan
// ve theme.ts'teki varsayılan süreyle (55sn) render eder — bu sayede video
// pipeline'ı ElevenLabs anahtarı olmadan da uçtan uca test edilebilir.

import { existsSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { loadTodaysTopic } from './lib/topics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const ENTRY_POINT = path.join(ROOT_DIR, 'src', 'index.ts');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUT_DIR = path.join(ROOT_DIR, 'out');

async function readAudioMeta(topicIndex) {
  const metaPath = path.join(PUBLIC_DIR, 'audio', `topic-${topicIndex}.meta.json`);
  if (!existsSync(metaPath)) {
    return null;
  }
  const raw = await readFile(metaPath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  // Test/CI ortamlarında hangi konunun render edileceğini elle geçmek için
  // (örn. `TOPIC_INDEX=3 node scripts/render-video.js`).
  const overrideIndex = process.env.TOPIC_INDEX ? Number(process.env.TOPIC_INDEX) : undefined;
  const { dayNumber, topicIndex: todaysIndex, topic: todaysTopic } = await loadTodaysTopic();
  const topicIndex = overrideIndex ?? todaysIndex;
  const { loadTopic } = await import('./lib/topics.js');
  const topic = overrideIndex !== undefined ? await loadTopic(overrideIndex) : todaysTopic;

  console.log(`[render-video] gün=${dayNumber} konu=${topicIndex} (${topic.title})`);

  const audioMeta = await readAudioMeta(topicIndex);
  const audioSrc = audioMeta ? audioMeta.audioFile : undefined;
  const audioDurationInSeconds = audioMeta ? audioMeta.durationInSeconds : undefined;

  if (!audioSrc) {
    console.warn('[render-video] Ses dosyası bulunamadı — önce `npm run generate-audio` çalıştırın. Varsayılan süreyle sessiz render ediliyor (test amaçlı).');
  }

  console.log('[render-video] bundle oluşturuluyor...');
  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: () => {},
  });

  const compositionId = `video-${topicIndex}`;
  const inputProps = { topic, audioSrc, audioDurationInSeconds };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  await mkdir(OUT_DIR, { recursive: true });
  const outputLocation = path.join(OUT_DIR, `video-${topicIndex}.mp4`);

  console.log(`[render-video] render başlıyor: ${compositionId} -> ${outputLocation} (${(composition.durationInFrames / composition.fps).toFixed(1)}sn)`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps,
  });

  console.log(`[render-video] tamamlandı: ${outputLocation}`);
  console.log(`RENDER_OUTPUT_PATH=${outputLocation}`);
  console.log(`RENDER_TOPIC_INDEX=${topicIndex}`);
}

main().catch((err) => {
  console.error('[render-video] HATA:', err);
  process.exit(1);
});
