import { Activity, CheckCheck, Circle, List, Terminal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatValue, type ModelCatalog, type RunSnapshot, type SignalValue } from '../core/types';

interface Props {
  catalog: ModelCatalog;
  values: Record<string, SignalValue>;
  errors: Record<string, string>;
  stale: boolean;
  updatedAt: number | null;
  watched: string[];
  snapshot: RunSnapshot;
  onUnwatch: (id: string) => void;
  onSelectSignal: (id: string) => void;
}

export default function Monitor(props: Props) {
  const [tab, setTab] = useState<'signals' | 'logs'>('signals');
  const [history, setHistory] = useState<{ t: number; value: number }[]>([]);
  const lastTime = useRef(-1);
  const firstTime = useRef(0);
  const [chartSelection, setChartSelection] = useState('');
  const numericSignals = props.catalog.signals.filter(s => s.type === 'Double' && props.watched.includes(s.id));
  const chartSignal = numericSignals.find(s => s.id === chartSelection) ?? numericSignals[0];
  const chartId = chartSignal?.id;
  useEffect(() => { setHistory([]); lastTime.current = -1; firstTime.current = 0; }, [chartId, props.catalog.id]);
  useEffect(() => {
    const time = props.updatedAt;
    const value = chartId ? props.values[chartId] : undefined;
    if (!time || props.stale || typeof value !== 'number' || time === lastTime.current) return;
    if (!firstTime.current) firstTime.current = time;
    setHistory(old => [...old.slice(-119), { t: time - firstTime.current, value }]);
    lastTime.current = time;
  }, [props.updatedAt, props.values, chartId, props.stale]);
  useEffect(() => { if (props.snapshot.status === 'error') setTab('logs'); }, [props.snapshot.status]);
  const maxValue = Math.max(1, ...history.map(p => p.value));
  const minValue = Math.min(0, ...history.map(p => p.value));
  const minTime = history[0]?.t ?? 0;
  const maxTime = Math.max(minTime + 1000, history.at(-1)?.t ?? 0);
  const points = history.map(p => `${30 + (p.t - minTime) / (maxTime - minTime) * 310},${105 - (p.value - minValue) / (maxValue - minValue) * 82}`).join(' ');
  return <section className="monitor">
    <div className="monitor-heading"><div className="monitor-tabs" role="tablist" aria-label="Laufzeitansicht"><button role="tab" aria-selected={tab === 'signals'} onClick={() => setTab('signals')}><Activity size={14} /> Signalmonitor <span>{props.watched.length}</span></button><button role="tab" aria-selected={tab === 'logs'} onClick={() => setTab('logs')}><Terminal size={14} /> Ablaufprotokoll {props.snapshot.logs.some(l => l.level === 'error') && <i className="error-dot" />}</button></div><span className={`monitor-cycle ${props.stale ? 'stale-value' : ''}`}><span className="live-dot" />{props.stale ? 'KEIN AKTUELLER DATENSATZ' : 'REMOTEAPI · LIVE'}</span></div>
    {tab === 'signals' ? <div className="monitor-body"><div className="monitor-table-wrap"><table className="signal-table"><thead><tr><th>Signal</th><th>Typ</th><th>Wert</th><th>Richtung</th><th><span className="sr-only">Entfernen</span></th></tr></thead><tbody>{props.watched.map(id => {
      const signal = props.catalog.signals.find(s => s.id === id);
      if (!signal) return null;
      return <tr key={id} className={props.stale || props.errors[id] ? 'stale-value' : ''} title={props.errors[id] ?? signal.path}><td><button onClick={() => props.onSelectSignal(id)} title={signal.path}><span className={`table-dot ${props.values[id] === true ? 'true' : ''}`} />{signal.name}</button></td><td><span className="table-type">{signal.nativeType ?? signal.type}</span></td><td><code className={props.values[id] === true ? 'value-true' : ''}>{props.errors[id] ? '—' : formatValue(props.values[id])}</code><small>{signal.unit}</small></td><td><span className="access-label">{signal.direction ?? (signal.writable ? 'R / W' : 'R')}</span></td><td><button className="icon-button" aria-label={`${signal.name} aus Monitor entfernen`} onClick={() => props.onUnwatch(id)}><X size={12} /></button></td></tr>;
    })}</tbody></table>{props.watched.length === 0 && <p className="empty-text">Mit dem Augensymbol im Signalbaum Signale beobachten.</p>}</div><div className="chart-panel"><div className="chart-title"><select aria-label="Signal für Verlauf" value={chartId ?? ''} onChange={e => setChartSelection(e.target.value)}><option value="" disabled>Numerisches Signal auswählen</option>{numericSignals.map(signal => <option key={signal.id} value={signal.id}>{signal.name}</option>)}</select><strong>{chartId ? formatValue(props.values[chartId]) : '—'}<small>{chartSignal?.unit}</small></strong></div><svg viewBox="0 0 360 130" role="img" aria-label="Signalverlauf anhand der Remote-Empfangszeit"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#009FE3" stopOpacity=".15" /><stop offset="100%" stopColor="#009FE3" stopOpacity="0" /></linearGradient></defs>{[23, 64, 105].map((y, i) => <g key={y}><line x1="30" y1={y} x2="340" y2={y} stroke="#E2E8F0" strokeDasharray="3 4" /><text x="0" y={y + 3} fill="#94A3B8" fontSize="9">{Math.round(maxValue - i * (maxValue - minValue) / 2)}</text></g>)}{history.length > 1 && <><polygon points={`30,105 ${points} ${history.length ? points.split(' ').at(-1)?.split(',')[0] : 340},105`} fill="url(#chart-fill)" /><polyline points={points} fill="none" stroke="#009FE3" strokeWidth="2" strokeLinejoin="round" /></>}<text x="30" y="123" fill="#94A3B8" fontSize="9">{(minTime / 1000).toFixed(1)} s</text><text x="317" y="123" fill="#94A3B8" fontSize="9">{(maxTime / 1000).toFixed(1)} s</text>{history.length === 0 && <text x="185" y="70" textAnchor="middle" fill="#94A3B8" fontSize="11">Warte auf numerische Live-Werte</text>}</svg></div></div>
      : <div className="log-list" role="log" aria-label="Ablaufprotokoll">{props.snapshot.logs.length === 0 ? <div className="log-empty"><List size={19} /><span>Bereit für den ersten Durchlauf.</span></div> : [...props.snapshot.logs].reverse().map(log => <div key={log.id} className={`log-entry ${log.level}`}><code>{(log.timeMs / 1000).toFixed(1).padStart(5, '0')} s</code>{log.level === 'success' ? <CheckCheck size={13} /> : <Circle size={8} fill="currentColor" />}<span>{log.message}</span></div>)}</div>}
  </section>;
}
