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

// Instagram Reels hedef süresi: 50-60 saniye (VİDEO TASARIMI şartnamesi).
// Gerçek seslendirme uzunluğu bilinmiyorsa (örn. Remotion Studio önizlemesi,
// veya generate-audio.js henüz çalışmadıysa) bu varsayılan kullanılır.
export const DEFAULT_DURATION_SECONDS = 55;
export const MIN_DURATION_SECONDS = 50;
export const MAX_DURATION_SECONDS = 60;

export function clampDurationSeconds(seconds: number): number {
  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, seconds));
}
