import { ArrowDownToLine, BookOpen, ChevronRight, Clock3, Info, LockKeyhole, Radio, Settings2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { comparatorLabels, formatValue, stepLabels, type Comparator, type ModelCatalog, type SignalDefinition, type SignalValue, type Step, type WaitMode } from '../core/types';
import { kindIcons } from './FlowEditor';
import type { LiveState } from '../adapters/live';

export function ValueInput({ signal, value, onChange, disabled, label = 'Wert' }: { signal: SignalDefinition; value: SignalValue | undefined; onChange: (v: SignalValue) => void; disabled?: boolean; label?: string }) {
  return signal.type === 'Bool' ? <select aria-label={label} value={String(value ?? false)} disabled={disabled} onChange={e => onChange(e.target.value === 'true')}><option value="true">true</option><option value="false">false</option></select>
    : <input aria-label={label} type={signal.type === 'Double' ? 'number' : 'text'} step={signal.type === 'Double' ? 'any' : undefined} value={String(value ?? '')} disabled={disabled} onChange={e => onChange(signal.type === 'Double' ? e.target.value === '' ? 0 : Number(e.target.value) : e.target.value)} />;
}

interface Props {
  step: Step | undefined;
  index: number;
  catalog: ModelCatalog;
  values: Record<string, SignalValue>;
  session: LiveState;
  selectedSignalId: string | null;
  mode: 'step' | 'signal';
  locked: boolean;
  active: boolean;
  stepElapsedMs: number;
  onMode: (mode: 'step' | 'signal') => void;
  onChange: (patch: Partial<Step>) => void;
  onDelete: () => void;
  onForce: (id: string, value: SignalValue) => void;
}

export default function Inspector(props: Props) {
  const { step, catalog, locked } = props;
  const signal = catalog.signals.find(s => s.id === (props.mode === 'signal' ? props.selectedSignalId : step?.signalId));
  const canWrite = signal && props.session.connected && props.session.ready && !props.session.stale && props.session.access[signal.id]?.writable && !locked;
  const signalError = signal ? props.session.errors[signal.id] : undefined;
  const [testValue, setTestValue] = useState<SignalValue>(false);
  useEffect(() => { if (signal) setTestValue(props.values[signal.id] ?? (signal.type === 'Bool' ? false : signal.type === 'Double' ? 0 : '')); }, [signal?.id]); // Keep a pending write stable during polling.
  const assign = (id: string) => {
    const next = catalog.signals.find(s => s.id === id);
    if (next) props.onChange({ signalId: id, value: next.type === 'Bool' ? true : next.type === 'Double' ? 0 : '', comparator: 'eq', waitMode: 'level' });
  };
  const Icon = step ? kindIcons[step.kind] : Settings2;
  return <aside className="inspector">
    <div className="panel-heading"><h2><Settings2 size={15} /> Eigenschaften</h2><span className="small-label">{props.mode === 'step' && step ? String(props.index + 1).padStart(2, '0') : 'SIGNAL'}</span></div>
    <div className="inspector-tabs" role="tablist" aria-label="Eigenschaftenansicht"><button role="tab" aria-selected={props.mode === 'step'} onClick={() => props.onMode('step')}>Schritt</button><button role="tab" aria-selected={props.mode === 'signal'} onClick={() => props.onMode('signal')}>Signal</button></div>
    <div className="inspector-content">
      {props.mode === 'step' && (step ? <>
        <div className={`inspector-kind kind-${step.kind}`}><span className="kind-icon"><Icon size={20} /></span><div><span className="small-label">BAUSTEIN</span><h3>{stepLabels[step.kind]}</h3></div></div>
        <label className="field-label">Bezeichnung<input value={step.label} disabled={locked} onChange={e => props.onChange({ label: e.target.value })} /></label>
        {(step.kind === 'set' || step.kind === 'wait') && <>
          <label className="field-label">Signal<select value={step.signalId ?? ''} disabled={locked} onChange={e => assign(e.target.value)}><option value="" disabled>Signal auswählen …</option>{catalog.signals.filter(s => s.type !== 'Unsupported' && (step.kind !== 'set' || s.writable)).map(s => <option key={s.id} value={s.id}>{s.path} · {s.nativeType ?? s.type}</option>)}</select></label>
          {signal && <div className="signal-path"><BookOpen size={13} /><code>{signal.path}</code></div>}
          {step.kind === 'wait' && <label className="field-label">Wartemodus<select value={step.waitMode ?? 'level'} disabled={locked} onChange={e => props.onChange({ waitMode: e.target.value as WaitMode })}><option value="level">Wertbedingung</option><option value="rising" disabled={signal?.type !== 'Bool'}>Steigende Flanke · false → true</option><option value="falling" disabled={signal?.type !== 'Bool'}>Fallende Flanke · true → false</option></select></label>}
          {signal && (step.kind === 'set' || step.waitMode === 'level') && <div className="condition-fields">
            {step.kind === 'wait' && <label className="field-label comparator-field">Vergleich<select aria-label="Vergleich" disabled={locked} value={step.comparator ?? 'eq'} onChange={e => props.onChange({ comparator: e.target.value as Comparator })}>{(Object.entries(comparatorLabels) as [Comparator, string][]).filter(([key]) => signal.type === 'Double' || key === 'eq' || key === 'neq').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
            <label className="field-label">{step.kind === 'set' ? 'Neuer Wert' : 'Erwarteter Wert'}{signal.unit ? ` (${signal.unit})` : ''}<ValueInput signal={signal} value={step.value} disabled={locked} onChange={v => props.onChange({ value: v })} label={step.kind === 'set' ? 'Neuer Wert' : 'Erwarteter Wert'} /></label>
          </div>}
          {step.kind === 'wait' && <><label className="field-label">Timeout (Sekunden)<div className="input-with-icon"><Clock3 size={14} /><input aria-label="Timeout in Sekunden" type="number" min="0" step="0.1" value={(step.timeoutMs ?? 0) / 1000} disabled={locked} onChange={e => props.onChange({ timeoutMs: Number(e.target.value) * 1000 })} /></div></label><p className="field-help">0 = unbegrenzt warten. Eine Flanke zählt erst nach Aktivierung dieses Schritts.</p></>}
        </>}
        {step.kind === 'delay' && <label className="field-label">Wartezeit (Sekunden)<input type="number" min="0" step="0.1" value={(step.durationMs ?? 1000) / 1000} disabled={locked} onChange={e => props.onChange({ durationMs: Number(e.target.value) * 1000 })} /></label>}
        {signal && <div className={`live-value ${props.session.stale || signalError ? 'stale-value' : ''}`}><div><span className="live-dot" />{props.session.stale ? 'LETZTER SIGNALWERT' : 'AKTUELLER SIGNALWERT'}</div><strong>{signalError ? '—' : formatValue(props.values[signal.id])}<small>{signal.unit}</small></strong><span>{signal.nativeType ?? signal.type} · {signalError ?? (props.session.access[signal.id]?.writable ? 'Lesen / Schreiben' : 'Schreibzugriff nicht bestätigt')}</span></div>}
        {props.active && <div className="active-step-info"><Radio size={14} /><span>Schritt aktiv · {(props.stepElapsedMs / 1000).toFixed(1)} s</span></div>}
        <div className="inspector-note"><Info size={15} /><p>{step.kind === 'set' ? 'Schreibt über die RemoteAPI mit Force. Eine Fertigmeldung kann im nächsten Warteschritt geprüft werden. Freigabe unter Schnittstellen.' : step.kind === 'wait' ? 'Liest das Signal zyklisch und wartet auf die konfigurierte Bedingung.' : step.kind === 'delay' ? 'Wartet anhand der gemessenen Ablaufzeit. Pause hält nur den Ablauf an; virtuos läuft weiter.' : step.kind === 'start' ? 'Hier beginnt die Ausführung. Jeder Ablauf benötigt genau einen Start.' : 'Beendet den Ablauf. Gesetzte Werte und Forces bleiben bis zur Freigabe erhalten.'}</p></div>
        <button className="button danger subtle delete-step" disabled={locked} onClick={props.onDelete}><Trash2 size={14} /> Schritt entfernen</button>
      </> : <div className="inspector-empty"><Settings2 size={26} /><h3>Schritt auswählen</h3><p>Wähle einen Baustein im Ablauf, um seine Signale und Bedingungen einzustellen.</p></div>)}
      {props.mode === 'signal' && (signal ? <>
        <div className="inspector-kind"><span className="kind-icon"><Radio size={20} /></span><div><span className="small-label">MODELLSIGNAL</span><h3>{signal.name}</h3></div></div>
        <div className="signal-path"><code>{signal.path}</code></div><p className="signal-description">{signal.description}</p>
        <dl className="signal-properties"><div><dt>Datentyp</dt><dd>{signal.nativeType ?? signal.type}</dd></div><div><dt>Richtung</dt><dd>{signal.direction ?? '—'}</dd></div><div><dt>Zugriff</dt><dd>{props.session.access[signal.id]?.writable ? 'Lesen / Schreiben' : <><LockKeyhole size={12} /> Nicht bestätigt</>}</dd></div>{signal.unit && <div><dt>Einheit</dt><dd>{signal.unit}</dd></div>}</dl>
        <div className={`live-value ${props.session.stale || signalError ? 'stale-value' : ''}`}><div><span className="live-dot" />{props.session.stale ? 'LETZTER SIGNALWERT' : 'AKTUELLER SIGNALWERT'}</div><strong>{signalError ? '—' : formatValue(props.values[signal.id])}<small>{signal.unit}</small></strong>{signalError && <span>{signalError}</span>}</div>
        {step && (step.kind === 'wait' || step.kind === 'set') && <button className="button full-width" disabled={locked || (step.kind === 'set' && !signal.writable)} onClick={() => { assign(signal.id); props.onMode('step'); }}><ArrowDownToLine size={14} /> In ausgewählten Schritt übernehmen</button>}
        {signal.type !== 'Unsupported' && <div className="test-signal"><span className="small-label">SIGNAL SCHREIBEN</span><p>Schreibt den Wert im laufenden virtuos-Modell und aktiviert einen eigenen Force. Freigabe unter „Schnittstellen“.</p><ValueInput signal={signal} value={testValue} onChange={setTestValue} disabled={!canWrite} label="Signalwert schreiben" /><button className="button full-width" disabled={!canWrite} onClick={() => props.onForce(signal.id, testValue)}>Signal schreiben (Force) <ChevronRight size={14} /></button>{props.session.forcedIds.includes(signal.id) && <p className="force-info">Eigener Force aktiv.</p>}</div>}
      </> : <div className="inspector-empty"><Radio size={26} /><h3>Signal auswählen</h3><p>Wähle links ein Modellsignal aus.</p></div>)}
    </div>
    <div className="inspector-footer"><span className="live-dot" /> Änderungen werden lokal gespeichert</div>
  </aside>;
}
