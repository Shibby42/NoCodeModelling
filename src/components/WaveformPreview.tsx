import { memo } from 'react';
import { sampleGenerator } from '../core/generators';
import type { GeneratorConfig } from '../core/types';

function WaveformPreview({ config, durationMs }: { config: GeneratorConfig; durationMs: number }) {
  const duration = Math.max(1, Number.isFinite(durationMs) ? durationMs : 1000);
  const points = Array.from({ length: 101 }, (_, index) => {
    const raw = sampleGenerator(config, index * duration / 100, duration).value;
    return { x: 10 + index * 2.1, value: typeof raw === 'boolean' ? Number(raw) : Number.isFinite(raw) ? raw : 0 };
  });
  const min = Math.min(...points.map(point => point.value));
  const max = Math.max(...points.map(point => point.value));
  const range = max - min || 1;
  const y = (value: number) => 62 - (value - min) / range * 44;
  const discrete = config.kind === 'pulse' || config.kind === 'square';
  const path = points.map((point, i) => `${i === 0 ? 'M' : discrete ? 'H' : 'L'}${point.x}${i > 0 && discrete ? 'V' : ','}${y(point.value)}`).join(' ');
  return <div className="waveform-preview"><svg viewBox="0 0 230 88" role="img" aria-label="Vorschau des konfigurierten Signalverlaufs"><path d="M10 18H220M10 40H220M10 62H220" stroke="#E2E8F0" strokeDasharray="3 4" fill="none" /><path d={path} stroke="#009FE3" strokeWidth="2" fill="none" strokeLinejoin="round" /><text x="10" y="80">0 s</text><text x="220" y="80" textAnchor="end">{(duration / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} s</text></svg></div>;
}

export default memo(WaveformPreview);
