// Render edilmiş videoyu Instagram'a Buffer üzerinden paylaşır.
//
// Buffer'ın klasik REST API'si (api.bufferapp.com/1) 1 Şubat 2027'de
// kapatılıyor ve canlı testte "invalid access token" hatası verdi — yeni
// oluşturulan API anahtarları artık sadece Buffer'ın GraphQL API'siyle
// (api.buffer.com) uyumlu. Bu script GraphQL API kullanır.
//
// GraphQL API dosya upload'ı DESTEKLEMEZ (developers.buffer.com/guides/
// hosting-media.html) — medya için herkese açık, kararlı bir URL ister.
// Bu yüzden video önce bu repodaki bir GitHub Release'e asset olarak
// yüklenir (GITHUB_TOKEN GitHub Actions içinde otomatik sağlanır), oradan
// alınan public download URL'i Buffer'a assets[].video.url olarak verilir.
//
// Gerekli env: BUFFER_ACCESS_TOKEN (Buffer Settings → API'den alınan API
// anahtarı — eski "access token" değil)
// Opsiyonel env: BUFFER_CHANNEL_ID (verilmezse bağlı Instagram kanalı
// otomatik bulunur — organizations() + channels() sorgularıyla)
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

const BUFFER_GRAPHQL_URL = 'https://api.buffer.com';

async function bufferGraphQL(query) {
  const res = await fetch(BUFFER_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BUFFER_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`Buffer GraphQL hatası: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

// Bağlı Instagram kanalını bulur. BUFFER_CHANNEL_ID verilmişse (GraphQL
// channel id'si olarak) o kanal aranır, bulunamazsa/verilmemişse hesaptaki
// ilk Instagram kanalına düşer. REST API'nin profile_id'si ile GraphQL'in
// channel id'si FARKLI ID formatlarıdır — eski bir profile_id burada
// eşleşmez, bu yüzden otomatik keşif varsayılan davranıştır.
async function findInstagramChannel() {
  const accountData = await bufferGraphQL('{ account { organizations { id name } } }');
  const organizations = accountData?.account?.organizations ?? [];
  if (organizations.length === 0) {
    throw new Error('Buffer hesabında hiç organizasyon bulunamadı.');
  }

  for (const org of organizations) {
    const channelsData = await bufferGraphQL(
      `{ channels(input: { organizationId: "${org.id}" }) { id name service } }`,
    );
    const channels = channelsData?.channels ?? [];
    if (BUFFER_CHANNEL_ID) {
      const match = channels.find((c) => c.id === BUFFER_CHANNEL_ID);
      if (match) return match;
    }
    const instagram = channels.find((c) => c.service === 'instagram');
    if (instagram) return instagram;
  }

  throw new Error(
    'Bağlı bir Instagram kanalı bulunamadı — Buffer hesabınıza Instagram kanalının eklendiğinden emin olun.',
  );
}

// Bugün Türkiye saatiyle (UTC+3) 08:00 için ISO 8601 (UTC) zaman damgası.
// O saat geçtiyse (workflow gecikmişse/elle tetiklenmişse) 1 dakika sonrası
// kullanılır — Buffer'ın customScheduled modu geçmiş bir dueAt'i reddeder.
function scheduledAtIso() {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0), // 08:00 Europe/Istanbul = 05:00 UTC
  );
  const effective = target.getTime() > now.getTime() ? target : new Date(now.getTime() + 60_000);
  return effective.toISOString();
}

async function publishToBuffer(channelId, videoUrl, caption) {
  const dueAt = scheduledAtIso();
  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(caption)}
        channelId: "${channelId}"
        schedulingType: automatic
        mode: customScheduled
        dueAt: "${dueAt}"
        assets: [{ video: { url: "${videoUrl}" } }]
      }) {
        ... on PostActionSuccess {
          post { id text dueAt status }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
  const data = await bufferGraphQL(mutation);
  const result = data?.createPost;
  if (!result || result.message) {
    throw new Error(`Buffer post oluşturulamadı: ${result?.message ?? 'boş yanıt'}`);
  }
  return result.post;
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
    // GitHub Actions'ın kendisi process.env.CI = 'true' set eder. CI
    // içindeyken token eksikse bu bir yapılandırma hatasıdır ve SESSİZCE
    // geçilmemeli — aksi halde iş akışı "başarılı" görünür ama hiçbir şey
    // yayınlanmaz (workflow'daki env.GITHUB_TOKEN satırı unutulursa tam
    // olarak bu olur — bkz. commit geçmişi). Yerel geliştirmede (CI yok)
    // nazikçe atlanır.
    if (process.env.CI) {
      throw new Error(
        'GITHUB_TOKEN tanımlı değil. Workflow dosyasındaki job env bloğuna ' +
          '`GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` eklendiğinden emin olun.',
      );
    }
    console.warn(
      '[publish-buffer] GITHUB_TOKEN/GITHUB_REPOSITORY yok (yerel ortam) — GitHub Release yükleme ve Buffer paylaşımı atlanıyor. ' +
        `Render edilen dosya: ${videoPath}`,
    );
    return;
  }

  if (!BUFFER_ACCESS_TOKEN) {
    throw new Error('BUFFER_ACCESS_TOKEN tanımlı değil.');
  }

  console.log(`[publish-buffer] GitHub Release hazırlanıyor: ${dateTag}`);
  const release = await getOrCreateRelease(dateTag);
  const assetName = `video-${topicIndex}.mp4`;
  const videoUrl = await uploadReleaseAsset(release, videoPath, assetName);
  console.log(`[publish-buffer] Video herkese açık URL: ${videoUrl}`);

  console.log('[publish-buffer] Bağlı Instagram kanalı aranıyor...');
  const channel = await findInstagramChannel();
  console.log(`[publish-buffer] Kanal bulundu: ${channel.name} (${channel.id}, ${channel.service})`);

  const caption = buildCaption(topic);
  const post = await publishToBuffer(channel.id, videoUrl, caption);
  console.log(`[publish-buffer] Buffer'a gönderildi: post id=${post.id} durum=${post.status} zamanlama=${post.dueAt}`);
}

main().catch((err) => {
  console.error('[publish-buffer] HATA:', err);
  process.exit(1);
});
