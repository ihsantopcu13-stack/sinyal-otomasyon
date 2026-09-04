import React from 'react';
import { Composition, CalculateMetadataFunction } from 'remotion';
import { IntroVideo } from './components/IntroVideo';
import { LessonVideo } from './components/LessonVideo';
import { FPS, WIDTH, HEIGHT, DEFAULT_DURATION_SECONDS, clampDurationSeconds } from './theme';
import type { IntroTopic, IntroVideoProps, LessonTopic, LessonVideoProps, VideoProps } from './types';

import topic0 from './topics/topic-0.json';
import topic1 from './topics/topic-1.json';
import topic2 from './topics/topic-2.json';
import topic3 from './topics/topic-3.json';
import topic4 from './topics/topic-4.json';
import topic5 from './topics/topic-5.json';
import topic6 from './topics/topic-6.json';
import topic7 from './topics/topic-7.json';
import topic8 from './topics/topic-8.json';
import topic9 from './topics/topic-9.json';
import topic10 from './topics/topic-10.json';

const introTopic = topic0 as unknown as IntroTopic;
const lessonTopics = [topic1, topic2, topic3, topic4, topic5, topic6, topic7, topic8, topic9, topic10] as unknown as LessonTopic[];

function makeCalculateMetadata<T extends VideoProps>(): CalculateMetadataFunction<T> {
  // Ses üretilmeden önce (Studio önizlemesi, generate-audio.js çalışmadan)
  // varsayılan 55 saniyelik süre kullanılır. render-video.js gerçek
  // seslendirme süresini `audioDurationInSeconds` prop'u olarak geçirince
  // süre ona göre 50-60 saniye aralığında yeniden hesaplanır.
  return ({ props }) => {
    const seconds = clampDurationSeconds(props.audioDurationInSeconds ?? DEFAULT_DURATION_SECONDS);
    return {
      durationInFrames: Math.round(seconds * FPS),
    };
  };
}

const introMetadata = makeCalculateMetadata<IntroVideoProps>();
const lessonMetadata = makeCalculateMetadata<LessonVideoProps>();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="video-0"
        component={IntroVideo}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={Math.round(DEFAULT_DURATION_SECONDS * FPS)}
        calculateMetadata={introMetadata}
        defaultProps={{ topic: introTopic }}
      />
      {lessonTopics.map((topic) => (
        <Composition
          key={topic.id}
          id={`video-${topic.id}`}
          component={LessonVideo}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={Math.round(DEFAULT_DURATION_SECONDS * FPS)}
          calculateMetadata={lessonMetadata}
          defaultProps={{ topic }}
        />
      ))}
    </>
  );
};
