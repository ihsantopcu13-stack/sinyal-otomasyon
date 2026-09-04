import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { SlideBase } from './SlideBase';
import { AnimatedText } from './AnimatedText';
import { COLORS } from '../theme';
import { distributeFrames, cumulativeStarts } from '../lib/timing';
import type { IntroVideoProps } from '../types';

// VIDEO 0 — Tanıtım videosu. 10 slide, her biri büyük altın başlık metni.
export const IntroVideo: React.FC<IntroVideoProps> = ({ topic, audioSrc }) => {
  const { durationInFrames } = useVideoConfig();
  const slideCount = topic.slides.length;
  const slideDurations = distributeFrames(durationInFrames, slideCount);
  const starts = cumulativeStarts(slideDurations);

  return (
    <SlideBase>
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      {topic.slides.map((slide, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={slideDurations[i]} layout="none">
          <SlideBase>
            <AnimatedText
              style={{
                fontFamily: "'Arial Black', 'Arial', sans-serif",
                fontSize: 74,
                fontWeight: 900,
                color: COLORS.gold,
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.25,
                whiteSpace: 'pre-line',
                maxWidth: 920,
                textShadow: '0 4px 24px rgba(0,0,0,0.55)',
              }}
            >
              {slide.text}
            </AnimatedText>
          </SlideBase>
        </Sequence>
      ))}
    </SlideBase>
  );
};
