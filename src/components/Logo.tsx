import React from 'react';
import { COLORS } from '../theme';

// Sağ üst köşede sabit "Sinyal Avcısı" logosu — tüm slide'larda görünür.
export const Logo: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 56,
        right: 48,
        fontFamily: "'Arial', sans-serif",
        fontSize: 30,
        fontWeight: 800,
        color: COLORS.gold,
        letterSpacing: 1,
        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
      }}
    >
      Sinyal Avcısı
    </div>
  );
};
