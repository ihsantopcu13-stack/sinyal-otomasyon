import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { SlideBase } from './SlideBase';
import { AnimatedText } from './AnimatedText';
import { RuleBox } from './RuleBox';
import { HighlightedExample } from './HighlightedExample';
import { COLORS } from '../theme';
import { distributeFrames, cumulativeStarts } from '../lib/timing';
import type { LessonVideoProps } from '../types';

const titleStyle: React.CSSProperties = {
  fontFamily: "'Arial Black', 'Arial', sans-serif",
  fontSize: 88,
  fontWeight: 900,
  color: COLORS.gold,
  textTransform: 'uppercase',
  textAlign: 'center',
  lineHeight: 1.2,
  whiteSpace: 'pre-line',
  maxWidth: 920,
  textShadow: '0 4px 24px rgba(0,0,0,0.55)',
};

const exampleStyle: React.CSSProperties = {
  fontFamily: "'Courier New', monospace",
  fontSize: 48,
  fontWeight: 700,
  color: COLORS.white,
  textAlign: 'center',
  lineHeight: 1.6,
  whiteSpace: 'pre-line',
  maxWidth: 900,
};

const tipBoxStyle: React.CSSProperties = {
  border: `4px solid ${COLORS.red}`,
  borderRadius: 24,
  padding: '48px 56px',
  background: 'rgba(255,90,95,0.08)',
  color: COLORS.white,
  fontFamily: "'Arial', sans-serif",
  fontSize: 42,
  fontWeight: 700,
  lineHeight: 1.5,
  whiteSpace: 'pre-line',
  textAlign: 'center',
  maxWidth: 900,
};

const outroTitleStyle: React.CSSProperties = {
  fontFamily: "'Arial Black', 'Arial', sans-serif",
  fontSize: 90,
  fontWeight: 900,
  color: COLORS.gold,
  textTransform: 'uppercase',
  textAlign: 'center',
  textShadow: '0 4px 24px rgba(0,0,0,0.55)',
};

const outroCtaStyle: React.CSSProperties = {
  fontFamily: "'Arial', sans-serif",
  fontSize: 44,
  fontWeight: 700,
  color: COLORS.white,
  textAlign: 'center',
  marginTop: 36,
};

// VIDEO 1-10 — Ders videoları. Sabit 5 slide: başlık / formül / örnek / tüyo / kapanış.
export const LessonVideo: React.FC<LessonVideoProps> = ({ topic, audioSrc }) => {
  const { durationInFrames } = useVideoConfig();
  const slideDurations = distributeFrames(durationInFrames, 5);
  const starts = cumulativeStarts(slideDurations);
  const s = topic.slides;

  return (
    <SlideBase>
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}

      <Sequence from={starts[0]} durationInFrames={slideDurations[0]} layout="none">
        <SlideBase>
          <AnimatedText style={titleStyle}>{s.title}</AnimatedText>
        </SlideBase>
      </Sequence>

      <Sequence from={starts[1]} durationInFrames={slideDurations[1]} layout="none">
        <SlideBase>
          <AnimatedText>
            <RuleBox>{s.formula}</RuleBox>
          </AnimatedText>
        </SlideBase>
      </Sequence>

      <Sequence from={starts[2]} durationInFrames={slideDurations[2]} layout="none">
        <SlideBase>
          <AnimatedText style={exampleStyle}>
            <HighlightedExample text={s.example} highlight={s.exampleHighlight} />
          </AnimatedText>
        </SlideBase>
      </Sequence>

      <Sequence from={starts[3]} durationInFrames={slideDurations[3]} layout="none">
        <SlideBase>
          <AnimatedText>
            <div style={tipBoxStyle}>⚠️ {s.tip}</div>
          </AnimatedText>
        </SlideBase>
      </Sequence>

      <Sequence from={starts[4]} durationInFrames={slideDurations[4]} layout="none">
        <SlideBase>
          <AnimatedText style={{ textAlign: 'center' }}>
            <div style={outroTitleStyle}>{s.outro}</div>
            <div style={outroCtaStyle}>sinyal-avcisi.com</div>
          </AnimatedText>
        </SlideBase>
      </Sequence>
    </SlideBase>
  );
};
