export const COLORS = {
  background: '#0B132B',
  gold: '#FFD700',
  white: '#FFFFFF',
  green: '#38D9A9',
  red: '#FF5A5F',
} as const;

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Instagram Reels hedef süresi: ~50-60 saniye (VİDEO TASARIMI şartnamesi),
// ama bu sadece bir alt sınır — üst sınır YOKTUR. Önceden 60sn'de üst sınır
// uygulanıyordu; bu, metin 60sn'den uzun seslendirme gerektirdiğinde
// `durationInFrames`'i sesin gerçek süresinin altına düşürüyor, Remotion'ın
// <Audio> bileşeni de kompozisyon bittiği an sesi kesiyordu (narrasyon
// ortasında ses kesilmesi ve slide/ses senkron kayması bu yüzdendi — bkz.
// commit geçmişi). Gerçek süre her zaman baz alınır, sadece çok kısa
// seslendirmelerde (Studio önizlemesi/varsayılan) alt sınır uygulanır.
// Instagram Reels resmi olarak 90 saniyeye kadar destekliyor, bu yüzden
// biraz uzun metinlerde bile üst sınır sorun yaratmaz.
export const DEFAULT_DURATION_SECONDS = 55;
export const MIN_DURATION_SECONDS = 50;

export function clampDurationSeconds(seconds: number): number {
  return Math.max(MIN_DURATION_SECONDS, seconds);
}
