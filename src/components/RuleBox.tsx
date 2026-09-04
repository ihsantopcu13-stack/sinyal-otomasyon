import React from 'react';
import { COLORS } from '../theme';

interface RuleBoxProps {
  children: React.ReactNode;
  accentColor?: string;
}

// "Kural kutuları: beyaz metin, altın border" — VİDEO TASARIMI şartnamesi.
// accentColor formül kutularında altın, örnek/tüyo kutularında yeşil/kırmızı
// vurgu ile değiştirilebilir (border her zaman altın kalır, iç metin rengi
// context'e göre değişir).
export const RuleBox: React.FC<RuleBoxProps> = ({ children, accentColor = COLORS.white }) => {
  return (
    <div
      style={{
        border: `4px solid ${COLORS.gold}`,
        borderRadius: 24,
        padding: '48px 56px',
        background: 'rgba(255,255,255,0.04)',
        color: accentColor,
        fontFamily: "'Courier New', monospace",
        fontSize: 46,
        fontWeight: 700,
        lineHeight: 1.5,
        whiteSpace: 'pre-line',
        textAlign: 'center',
        maxWidth: 900,
        boxShadow: '0 0 40px rgba(255,215,0,0.15)',
      }}
    >
      {children}
    </div>
  );
};
