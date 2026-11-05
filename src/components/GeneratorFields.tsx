import { generatorDuration } from '../core/generators';
import { formatValue, type GeneratorConfig, type ScalarLevel, type SignalDefinition, type Step } from '../core/types';
import WaveformPreview from './WaveformPreview';

function NumberField({ label, value, min, max, step = 'any', onChange }: { label: string; value: number; min?: number; max?: number; step?: number | 'any'; onChange: (value: number) => void }) {
  return <label className="field-label">{label}<input type="number" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} /></label>;
}

function LevelField({ label, value, boolean, onChange }: { label: string; value: ScalarLevel; boolean: boolean; onChange: (value: ScalarLevel) => void }) {
  return <label className="field-label">{label}{boolean ? <select value={String(value)} onChange={e => onChange(e.target.value === 'true')}><option value="false">false</option><option value="true">true</option></select> : <input type="number" step="any" value={Number(value)} onChange={e => onChange(Number(e.target.value))} />}</label>;
}

export default function GeneratorFields({ step, signal, locked, onChange }: { step: Step; signal?: SignalDefinition; locked: boolean; onChange: (patch: Partial<Step>) => void }) {
  const config = step.generator;
  if (!config) return null;
  const change = (patch: object) => onChange({ generator: { ...config, ...patch } as GeneratorConfig });
  const boolean = signal?.type === 'Bool' || (!signal && 'low' in config && typeof config.low === 'boolean');
  const finalValue = config.kind === 'ramp' ? config.end : config.kind === 'sine' ? config.offset : config.low;
  return <>
    <WaveformPreview config={config} durationMs={generatorDuration(step)} />
    <fieldset disabled={locked} className="generator-fields">
      {config.kind === 'pulse' || config.kind === 'square' ? <div className="generator-field-row"><LevelField label="Ruhewert" value={config.low} boolean={boolean} onChange={low => change({ low })} /><LevelField label="Aktivwert" value={config.high} boolean={boolean} onChange={high => change({ high })} /></div> : null}
      {config.kind === 'ramp' && <div className="generator-field-row"><NumberField label="Startwert" value={config.start} onChange={start => change({ start })} /><NumberField label="Endwert" value={config.end} onChange={end => change({ end })} /></div>}
      {config.kind === 'sine' && <><div className="generator-field-row"><NumberField label="Amplitude" value={config.amplitude} min={0} onChange={amplitude => change({ amplitude })} /><NumberField label="Offset" value={config.offset} onChange={offset => change({ offset })} /></div><NumberField label="Phase (Grad)" value={config.phaseDeg} onChange={phaseDeg => change({ phaseDeg })} /></>}
      {(config.kind === 'triangle' || config.kind === 'sawtooth') && <div className="generator-field-row"><NumberField label="Unterer Wert" value={config.low} onChange={low => change({ low })} /><NumberField label="Oberer Wert" value={config.high} onChange={high => change({ high })} /></div>}
      {config.kind === 'pulse' && <><NumberField label="Startverzögerung (s)" value={config.delayMs / 1000} min={0} step={0.1} onChange={delay => change({ delayMs: delay * 1000 })} /><NumberField label="Pulsbreite (s)" value={config.widthMs / 1000} min={0.1} step={0.1} onChange={width => change({ widthMs: width * 1000 })} /></>}
      {'periodMs' in config && <NumberField label="Frequenz (Hz)" value={config.periodMs > 0 ? 1000 / config.periodMs : 0} min={0} max={5} onChange={frequency => change({ periodMs: frequency > 0 ? 1000 / frequency : 0 })} />}
      {config.kind === 'square' && <NumberField label="Tastgrad (%)" value={config.dutyCycle * 100} min={1} max={99} onChange={duty => change({ dutyCycle: duty / 100 })} />}
      {config.kind !== 'pulse' && <NumberField label={config.kind === 'ramp' ? 'Rampenzeit (s)' : 'Laufzeit (s)'} value={(step.durationMs ?? 0) / 1000} min={0.1} step={0.1} onChange={duration => onChange({ durationMs: duration * 1000 })} />}
    </fieldset>
    <div className="generator-summary"><span>Wert nach Abschluss</span><code>{formatValue(finalValue)}</code></div>
    <p className="field-help generator-timing-hint">Zeitauflösung ungefähr 100 ms. Pause hält den Generator an; Stop belässt den zuletzt geschriebenen Wert.</p>
  </>;
}
