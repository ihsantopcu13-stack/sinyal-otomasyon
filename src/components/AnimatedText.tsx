import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface AnimatedTextProps {
  children: React.ReactNode;
  delayFrames?: number;
  style?: React.CSSProperties;
}

// "Yazılar soldan kayarak giriyor" animasyonu — VİDEO TASARIMI şartnamesi.
// useCurrentFrame() burada Sequence'e göre LOKAL frame döner, bu yüzden her
// slide kendi 0. frame'inden başlayarak animasyonunu tekrar oynatır.
export const AnimatedText: React.FC<AnimatedTextProps> = ({ children, delayFrames = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - delayFrames);

  const progress = spring({
    frame: local,
    fps,
    config: { damping: 18, mass: 0.6, stiffness: 120 },
  });

  const translateX = interpolate(progress, [0, 1], [-260, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        transform: `translateX(${translateX}px)`,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
