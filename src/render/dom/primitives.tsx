import type {CSSProperties, ReactNode} from 'react';
import {carnivalNightTokens as tokens} from '../../theme/carnival-night/tokens';

export const PanelShell: React.FC<{children: ReactNode; accent?: string; style?: CSSProperties; quiet?: boolean}> = ({children, accent = tokens.color.gold, style, quiet}) => (
  <div style={{
    position: 'relative',
    borderRadius: 28,
    border: `2px solid ${accent}`,
    background: 'linear-gradient(180deg, rgba(39,34,46,.96) 0%, rgba(14,13,18,.98) 34%, rgba(8,7,11,.99) 100%)',
    boxShadow: quiet ? 'inset 0 1px rgba(255,255,255,.1)' : `inset 0 2px rgba(255,255,255,.13), inset 0 -12px 24px rgba(0,0,0,.42), 0 16px 36px rgba(0,0,0,.42), 0 0 22px ${accent}22`,
    overflow: 'hidden',
    ...style,
  }}>
    <div style={{position: 'absolute', inset: '0 0 auto', height: '42%', background: 'linear-gradient(180deg, rgba(255,255,255,.08), transparent)', pointerEvents: 'none'}} />
    {children}
  </div>
);

export const MetricLabel: React.FC<{children: ReactNode}> = ({children}) => <div style={{fontFamily: tokens.typography.condensed, fontSize: 27, lineHeight: 1, letterSpacing: 2.7, color: tokens.color.textSecondary, textTransform: 'uppercase'}}>{children}</div>;

export const MetricValue: React.FC<{children: ReactNode; color?: string; size?: number}> = ({children, color = tokens.color.textPrimary, size = 64}) => <div style={{fontFamily: tokens.typography.ui, fontSize: size, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color, fontVariantNumeric: 'tabular-nums', textShadow: '0 5px 14px rgba(0,0,0,.6)'}}>{children}</div>;

export function toneColor(tone: 'positive' | 'danger' | 'neutral' | 'warning'): string {
  if (tone === 'positive') return tokens.color.positive;
  if (tone === 'danger') return tokens.color.danger;
  if (tone === 'warning') return tokens.color.warning;
  return tokens.color.champagne;
}
