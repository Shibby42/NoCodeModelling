import { Link2, Radio, Trash2 } from 'lucide-react';
import { formatValue, type SignalDefinition, type SignalValue } from '../core/types';

export interface PortReferenceData extends Record<string, unknown> {
  signal?: SignalDefinition;
  value?: SignalValue;
  error?: string;
  stale: boolean;
  locked: boolean;
  onInspect: () => void;
  onRemove: () => void;
}

export default function PortReferenceCard({ signal, value, error, stale, locked, selected, onInspect, onRemove }: PortReferenceData & { selected: boolean }) {
  const referenceType = signal?.type === 'Unsupported' || signal?.readable === false;
  const status = !signal ? 'Port nicht geladen · Get Model Structure ausführen'
    : referenceType ? 'Referenzport · kein skalarer Signalwert'
      : error ?? (stale ? 'Letzter bekannter Wert' : 'Live-Signalwert');
  return <div className={`port-reference-node ${selected ? 'selected' : ''}`}>
    <div className="port-reference-heading"><Link2 size={15} /><span>PORTREFERENZ</span><button className="icon-button nodrag" disabled={locked} aria-label="Portreferenz entfernen" onClick={e => { e.stopPropagation(); onRemove(); }}><Trash2 size={13} /></button></div>
    <strong className="port-reference-title">{signal?.name ?? 'Unbekannter Port'}</strong>
    <div className="port-reference-meta"><span>{signal?.nativeType ?? signal?.type ?? '—'}</span><span>{signal?.direction}</span></div>
    {signal && <code className="model-block-path">{signal.path}</code>}
    <div className={`port-reference-status ${stale && !referenceType ? 'stale-value' : ''}`}><Radio size={13} /><span>{status}</span></div>
    {!referenceType && signal && !error && <div className="port-reference-value"><code>{formatValue(value)}</code><small>{signal.unit}</small></div>}
    <button className="port-reference-inspect nodrag" disabled={!signal} onClick={e => { e.stopPropagation(); onInspect(); }}>Porteigenschaften anzeigen</button>
  </div>;
}
