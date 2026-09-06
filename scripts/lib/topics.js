import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOPICS_DIR = path.join(__dirname, '..', '..', 'src', 'topics');

export const TOPIC_COUNT = 24; // topic-0 (tanıtım) .. topic-23 (23 ders konusu)

// Otomasyonun "gün 0"ı — repo/iş akışı bu tarihte kuruldu. İlk çalıştırmada
// (gün 0) mod 24 = 0 olacağı için tanıtım videosu (topic-0) yayınlanır,
// tıpkı görev talimatındaki "0 tanıtım ilk gün" kuralı gibi. Sonraki her gün
// sırasıyla 1..23 konularını gezer, 24. günde tekrar tanıtıma döner.
export const EPOCH_DATE_UTC = '2026-09-04';

function toUtcMidnight(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Bugünün (UTC) epoch'tan kaç gün sonra olduğunu hesaplar. Harici bir durum
// dosyasına ihtiyaç duymaz — GitHub Actions her gün aynı hesaplamayı
// tekrarlar, bu yüzden idempotenttir (aynı gün içinde tekrar çalıştırılsa
// bile aynı konuyu seçer).
export function getDayNumber(now = new Date()) {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const epochUtc = toUtcMidnight(EPOCH_DATE_UTC);
  const diffDays = Math.round((todayUtc - epochUtc) / 86_400_000);
  return Math.max(0, diffDays);
}

export function getTopicIndexForDay(dayNumber) {
  return ((dayNumber % TOPIC_COUNT) + TOPIC_COUNT) % TOPIC_COUNT;
}

export async function loadTopic(topicIndex) {
  const filePath = path.join(TOPICS_DIR, `topic-${topicIndex}.json`);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

export async function loadTodaysTopic(now = new Date()) {
  const dayNumber = getDayNumber(now);
  const topicIndex = getTopicIndexForDay(dayNumber);
  const topic = await loadTopic(topicIndex);
  return { dayNumber, topicIndex, topic };
}
