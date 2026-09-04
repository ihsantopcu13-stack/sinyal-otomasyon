import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../theme';
import { Logo } from './Logo';

interface SlideBaseProps {
  children: React.ReactNode;
}

// Ortak arka plan (#0B132B lacivert) + sağ üst logo — her slide bunun içinde render edilir.
export const SlideBase: React.FC<SlideBaseProps> = ({ children }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      <Logo />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
