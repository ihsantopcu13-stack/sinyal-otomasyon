// Düz JavaScript (TypeScript değil) — hem Remotion bileşenleri (.tsx) hem
// de scripts/run-tests.js (plain Node ESM, TS derleme adımı yok) bu
// dosyayı doğrudan import edebilsin diye.

// Toplam frame sayısını N slide arasında olabildiğince eşit dağıtır.
// Bölünemeyen kalan frame'ler baştaki slide'lara birer birer eklenir,
// böylece toplam süre her zaman tam olarak durationInFrames'e eşit kalır.
export function distributeFrames(totalFrames, count) {
  const base = Math.floor(totalFrames / count);
  const remainder = totalFrames - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

// [10, 12, 8] -> [0, 10, 22] gibi her slide'ın başlangıç frame'ini üretir.
export function cumulativeStarts(durations) {
  const starts = [];
  let acc = 0;
  for (const d of durations) {
    starts.push(acc);
    acc += d;
  }
  return starts;
}
