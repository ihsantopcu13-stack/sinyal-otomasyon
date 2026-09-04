// Render edilmiş videoyu Instagram'a Buffer üzerinden paylaşır.
//
// Buffer'ın klasik API'si (api.bufferapp.com/1) medya için genel-erişimli
// bir URL bekler, dosya upload'ı desteklemez. Bu yüzden video önce bu
// repodaki bir GitHub Release'e asset olarak yüklenir (GITHUB_TOKEN GitHub
// Actions içinde otomatik sağlanır), oradan alınan public download URL'i
// Buffer'a "media.video" olarak verilir.
//
// Gerekli env: BUFFER_ACCESS_TOKEN, BUFFER_CHANNEL_ID
// GitHub Actions içinde otomatik gelir: GITHUB_TOKEN, GITHUB_REPOSITORY

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTodaysTopic, loadTopic } from './lib/topics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'out');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // "owner/repo"
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN;
const BUFFER_CHANNEL_ID = process.env.BUFFER_CHANNEL_ID;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function ghApi(pathSuffix, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${pathSuffix}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  return res;
}

async function getOrCreateRelease(tag) {
  const existing = await ghApi(`/releases/tags/${tag}`);
  if (existing.ok) {
    return existing.json();
  }
  const created = await ghApi('/releases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      name: `Video ${tag}`,
      body: 'Sinyal Avcısı günlük Reels videosu — otomatik yayın için barındırılan dosya.',
      draft: false,
      prerelease: false,
    }),
  });
  if (!created.ok) {
    throw new Error(`GitHub Release oluşturulamadı: ${created.status} ${await created.text()}`);
  }
  return created.json();
}

async function uploadReleaseAsset(release, filePath, assetName) {
  // release.upload_url örn: "https://uploads.github.com/repos/OWNER/REPO/releases/123/assets{?name,label}"
  const uploadBase = release.upload_url.replace(/\{.*\}$/, '');
  const fileBuffer = await readFile(filePath);

  // Aynı isimde eski bir asset varsa (aynı gün tekrar çalıştırılırsa) önce sil.
  const existingAsset = (release.assets || []).find((a) => a.name === assetName);
  if (existingAsset) {
    await ghApi(`/releases/assets/${existingAsset.id}`, { method: 'DELETE' });
  }

  const res = await fetch(`${uploadBase}?name=${encodeURIComponent(assetName)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'video/mp4',
    },
    body: fileBuffer,
  });
  if (!res.ok) {
    throw new Error(`Asset yüklenemedi: ${res.status} ${await res.text()}`);
  }
  const asset = await res.json();
  return asset.browser_download_url;
}

function buildCaption(topic) {
  if (topic.type === 'intro') {
    return [
      'Sinyal Avcısı 🎯 YDS/YÖKDİL için tamamen ücretsiz sinyal sistemi.',
      '',
      'sinyal-avcisi.com',
      '',
      '#YDS #YÖKDİL #İngilizce #SinyalAvcısı #DilSınavı #ÜcretsizEğitim',
    ].join('\n');
  }
  return [
    `${topic.title} — 3 saniyede çöz. 🎯`,
    '',
    'Daha fazlası: sinyal-avcisi.com',
    '',
    '#YDS #YÖKDİL #İngilizce #SinyalAvcısı #GrammarTips',
  ].join('\n');
}

// Bugün Türkiye saatiyle (UTC+3) 08:00 için Unix saniye zaman damgası.
// O saat geçtiyse (workflow gecikmişse) hemen paylaşılır (Buffer "now").
function scheduledAtUnix() {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0), // 08:00 Europe/Istanbul = 05:00 UTC
  );
  if (target.getTime() <= now.getTime()) {
    return null; // artık "now" olarak paylaşılacak
  }
  return Math.floor(target.getTime() / 1000);
}

async function publishToBuffer(videoUrl, caption) {
  if (!BUFFER_ACCESS_TOKEN || !BUFFER_CHANNEL_ID) {
    throw new Error('BUFFER_ACCESS_TOKEN veya BUFFER_CHANNEL_ID tanımlı değil.');
  }

  const scheduledAt = scheduledAtUnix();
  const body = new URLSearchParams();
  body.set('access_token', BUFFER_ACCESS_TOKEN);
  body.append('profile_ids[]', BUFFER_CHANNEL_ID);
  body.set('text', caption);
  body.set('media[video]', videoUrl);
  if (scheduledAt) {
    body.set('scheduled_at', String(scheduledAt));
  } else {
    body.set('now', 'true');
  }

  const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(`Buffer API hatası: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const overrideIndex = process.env.TOPIC_INDEX ? Number(process.env.TOPIC_INDEX) : undefined;
  const { dayNumber, topicIndex: todaysIndex, topic: todaysTopic } = await loadTodaysTopic();
  const topicIndex = overrideIndex ?? todaysIndex;
  const topic = overrideIndex !== undefined ? await loadTopic(overrideIndex) : todaysTopic;

  console.log(`[publish-buffer] gün=${dayNumber} konu=${topicIndex} (${topic.title})`);

  const videoPath = path.join(OUT_DIR, `video-${topicIndex}.mp4`);
  const dateTag = `video-${todayIsoDate()}`;

  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.warn(
      '[publish-buffer] GITHUB_TOKEN/GITHUB_REPOSITORY yok (yerel ortam) — GitHub Release yükleme ve Buffer paylaşımı atlanıyor. ' +
        `Render edilen dosya: ${videoPath}`,
    );
    return;
  }

  console.log(`[publish-buffer] GitHub Release hazırlanıyor: ${dateTag}`);
  const release = await getOrCreateRelease(dateTag);
  const assetName = `video-${topicIndex}.mp4`;
  const videoUrl = await uploadReleaseAsset(release, videoPath, assetName);
  console.log(`[publish-buffer] Video herkese açık URL: ${videoUrl}`);

  const caption = buildCaption(topic);
  const result = await publishToBuffer(videoUrl, caption);
  console.log('[publish-buffer] Buffer\'a gönderildi:', JSON.stringify(result.updates?.map((u) => u.id) ?? result));
}

main().catch((err) => {
  console.error('[publish-buffer] HATA:', err);
  process.exit(1);
});
