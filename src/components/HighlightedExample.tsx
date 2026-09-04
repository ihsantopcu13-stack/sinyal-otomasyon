import React from 'react';
import { COLORS } from '../theme';

interface HighlightedExampleProps {
  text: string;
  highlight: string;
}

// "Örnek cümle — yeşil vurgu": highlight ile eşleşen parça(lar) yeşil ve
// kalın, geri kalanı beyaz basılır. highlight birden fazla varyant
// içerebilir ("since / for" gibi) — "/" ile ayrılmış her parça ayrı ayrı
// aranır.
export const HighlightedExample: React.FC<HighlightedExampleProps> = ({ text, highlight }) => {
  const needles = highlight
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (needles.length === 0) {
    return <>{text}</>;
  }

  const pattern = new RegExp(`(${needles.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = needles.some((n) => n.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <span key={i} style={{ color: COLORS.green, fontWeight: 900 }}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </>
  );
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
