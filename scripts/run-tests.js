// Hafif, API anahtarı gerektirmeyen doğrulama testleri:
// - TOPIC_COUNT kadar konu dosyasının (topic-0..topic-N) şemasının doğru olduğunu
// - gün->konu eşlemesinin (mod TOPIC_COUNT) beklendiği gibi çalıştığını
// - frame dağıtım yardımcı fonksiyonunun toplamı koruduğunu
// doğrular. Gerçek render/API testleri için README'deki manuel adımlara bakın.

import assert from 'node:assert/strict';
import { loadTopic, getTopicIndexForDay, TOPIC_COUNT } from './lib/topics.js';
import { distributeFrames, cumulativeStarts } from '../src/lib/timing.js';

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('gün->konu eşlemesi: gün 0 -> tanıtım (0)', () => {
  assert.equal(getTopicIndexForDay(0), 0);
});

test(`gün->konu eşlemesi: gün ${TOPIC_COUNT} -> tekrar tanıtım (0)`, () => {
  assert.equal(getTopicIndexForDay(TOPIC_COUNT), 0);
});

test('gün->konu eşlemesi: gün 1..10 -> konu 1..10', () => {
  for (let d = 1; d <= 10; d++) {
    assert.equal(getTopicIndexForDay(d), d);
  }
});

test('distributeFrames toplamı korur (10 slide)', () => {
  const durations = distributeFrames(1650, 10); // 55sn * 30fps
  assert.equal(durations.reduce((a, b) => a + b, 0), 1650);
  assert.equal(durations.length, 10);
});

test('distributeFrames toplamı korur (5 slide, bölünmeyen sayı)', () => {
  const durations = distributeFrames(1651, 5);
  assert.equal(durations.reduce((a, b) => a + b, 0), 1651);
});

test('cumulativeStarts ilk eleman 0 ile başlar', () => {
  const starts = cumulativeStarts([10, 12, 8]);
  assert.deepEqual(starts, [0, 10, 22]);
});

for (let i = 0; i < TOPIC_COUNT; i++) {
  await asyncTest(`topic-${i}.json şeması geçerli`, async () => {
    const topic = await loadTopic(i);
    assert.equal(typeof topic.id, 'number');
    assert.ok(topic.title && topic.title.length > 0, 'title eksik');
    assert.ok(topic.voiceover && topic.voiceover.length > 20, 'voiceover eksik/çok kısa');

    if (i === 0) {
      assert.equal(topic.type, 'intro');
      assert.equal(topic.slides.length, 10, 'tanıtım videosunda 10 slide olmalı');
      for (const slide of topic.slides) {
        assert.ok(slide.text && slide.text.length > 0, 'slide metni boş');
      }
    } else {
      assert.equal(topic.type, 'lesson');
      const required = ['title', 'formula', 'example', 'exampleHighlight', 'tip', 'outro'];
      for (const key of required) {
        assert.ok(topic.slides[key] && String(topic.slides[key]).length > 0, `slides.${key} eksik`);
      }
    }
  });
}

console.log(`\n${passed} test geçti.`);
if (process.exitCode) {
  console.error('Bazı testler BAŞARISIZ.');
  process.exit(1);
}
