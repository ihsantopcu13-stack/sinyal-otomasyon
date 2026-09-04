export interface IntroSlide {
  text: string;
}

export interface IntroTopic {
  id: 0;
  type: 'intro';
  title: string;
  voiceover: string;
  slides: IntroSlide[];
}

export interface LessonSlides {
  title: string;
  formula: string;
  example: string;
  exampleHighlight: string;
  tip: string;
  outro: string;
}

export interface LessonTopic {
  id: number;
  type: 'lesson';
  title: string;
  voiceover: string;
  slides: LessonSlides;
}

export type Topic = IntroTopic | LessonTopic;

// Remotion'ın <Composition> ve CalculateMetadataFunction generic'leri prop
// tipinin Record<string, unknown> ile yapısal olarak uyumlu olmasını
// (index signature) ister — bu yüzden her video prop tipi bunu extend eder.
export interface VideoProps {
  // Gerçek seslendirme süresi (saniye) — render-video.js tarafından
  // generate-audio.js çıktısından okunup geçirilir. Verilmezse (örn. Studio
  // önizlemesi) theme.ts'teki DEFAULT_DURATION_SECONDS kullanılır.
  audioDurationInSeconds?: number;
  audioSrc?: string;
  [key: string]: unknown;
}

export interface IntroVideoProps extends VideoProps {
  topic: IntroTopic;
}

export interface LessonVideoProps extends VideoProps {
  topic: LessonTopic;
}
