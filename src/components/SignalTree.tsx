import { memo, useMemo, useState, type ReactNode } from 'react';
import { Box, ChevronDown, ChevronRight, Database, Eye, FolderTree, GripVertical, LoaderCircle, Search } from 'lucide-react';
import { formatValue, type ModelBranch, type ModelCatalog, type SignalDefinition } from '../core/types';
import { useSignalSnapshot } from '../live/SignalStore';

interface Props {
  catalog: ModelCatalog;
  stale: boolean;
  selectedId: string | null;
  watched: string[];
  locked: boolean;
  loading: boolean;
  onSelect: (id: string) => void;
  onWatch: (id: string) => void;
  onReload: () => void;
}

function TreeSignalValue({ id }: { id: string }) {
  const live = useSignalSnapshot(id);
  return <span className={`signal-small-value ${live.value === true ? 'is-true' : ''} ${live.error || live.stale ? 'stale-value' : ''}`}>{live.error ? '—' : formatValue(live.value)}</span>;
}

const SignalRow = memo(function SignalRow({ signal, depth, selected, watched, locked, onSelect, onWatch }: {
  signal: SignalDefinition; depth: number; selected: boolean; watched: boolean; locked: boolean;
  onSelect: (id: string) => void; onWatch: (id: string) => void;
}) {
  return <div className={`signal-row ${selected ? 'selected' : ''}`} style={{ marginLeft: 20 + Math.min(depth, 8) * 12 }}>
    <button className="signal-item" draggable={!locked} onDragStart={e => { e.dataTransfer.setData('application/signal-studio', signal.id); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => onSelect(signal.id)} title={`${signal.path}\n${signal.direction ?? ''} · ${signal.nativeType ?? signal.type}`}>
      <GripVertical size={11} className="drag-grip" /><span className={`type-mark ${signal.type.toLowerCase()}`}>{signal.direction?.includes('IN') ? '→' : signal.direction?.includes('OUT') ? '←' : signal.type === 'Bool' ? 'B' : '#'}</span><span className="signal-name">{signal.name}</span><TreeSignalValue id={signal.id} />
    </button>
    <button className={`watch-button ${watched ? 'watching' : ''}`} onClick={() => onWatch(signal.id)} title={watched ? 'Aus Monitor entfernen' : 'Im Monitor beobachten'} aria-label={`${signal.name} ${watched ? 'nicht mehr beobachten' : 'beobachten'}`}><Eye size={12} /></button>
  </div>;
});

function SignalTree(props: Props) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const signalMap = useMemo(() => new Map(props.catalog.signals.map(s => [s.id, s])), [props.catalog]);
  const search = query.trim().toLocaleLowerCase('de');
  const contains = (text: string) => text.toLocaleLowerCase('de').includes(search);
  const matches = props.catalog.signals.filter(s => contains(`${s.name} ${s.path} ${s.nativeType ?? s.type}`));
  const matchingIds = new Set(matches.map(s => s.id));
  const renderBranch = (branch: ModelBranch, depth = 0, parentMatches = false): ReactNode => {
    const blockMatches = parentMatches || Boolean(search && contains(`${branch.name} ${branch.path ?? ''} ${branch.modelType ?? ''}`));
    const signals = branch.signalIds.map(id => signalMap.get(id)).filter(s => s && (!search || blockMatches || matchingIds.has(s.id)));
    const children = branch.children.map(child => renderBranch(child, depth + 1, blockMatches));
    if (search && !blockMatches && signals.length === 0 && children.every(child => child === null)) return null;
    const open = Boolean(search) || !collapsed.includes(branch.id);
    return <div key={branch.id} className="tree-branch">
      <div className="tree-folder-row" style={{ paddingLeft: 8 + Math.min(depth, 8) * 12 }}>
        <button className="tree-expander" onClick={() => setCollapsed(old => old.includes(branch.id) ? old.filter(id => id !== branch.id) : [...old, branch.id])} aria-label={`${branch.name} ${open ? 'einklappen' : 'ausklappen'}`} aria-expanded={open}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
        <button className={`tree-folder ${depth === 0 ? 'root-folder' : ''}`} draggable={!props.locked} title={`${branch.path ?? branch.name}\n${branch.modelType ?? ''}\nBaustein ins Diagramm ziehen`} onDragStart={e => { e.dataTransfer.setData('application/virtuos-block', branch.id); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => setCollapsed(old => old.includes(branch.id) ? old.filter(id => id !== branch.id) : [...old, branch.id])}>
          {depth === 0 ? <Box size={15} /> : <FolderTree size={14} />}<span>{branch.name}</span><small>{branch.signalIds.length}</small>
        </button>
      </div>
      {open && <>{signals.map(signal => signal && <SignalRow key={signal.id} signal={signal} depth={depth} selected={props.selectedId === signal.id} watched={props.watched.includes(signal.id)} locked={props.locked} onSelect={props.onSelect} onWatch={props.onWatch} />)}{children}</>}
    </div>;
  };
  return <section className="signal-browser">
    <div className="panel-heading"><h2><Database size={15} /> Modell & Signale</h2></div>
    <div className="structure-action"><button className="button primary full-width" onClick={props.onReload} disabled={props.locked || props.loading}>{props.loading ? <LoaderCircle size={14} className="spin" /> : <Database size={14} />}Get Model Structure</button></div>
    {props.catalog.id ? <>
      <div className="signal-search"><Search size={14} /><input aria-label="Signale oder Bausteine suchen" placeholder="Baustein, Signal oder Pfad …" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <div className="tree-meta"><span>{search ? matches.length : props.catalog.signals.length} Signale</span><span>OVA · {props.stale ? 'LETZTE WERTE' : 'LIVE'}</span></div>
      <div className="tree-scroll">{renderBranch(props.catalog.root)}</div>
      <div className="tree-hint"><GripVertical size={14} /><span>Baustein oder Signal ins Diagramm ziehen</span></div>
    </> : <div className="model-tree-empty"><FolderTree size={30} /><h3>{props.loading ? 'Modell wird ausgelesen …' : 'Modellstruktur laden'}</h3><p>{props.loading ? 'Die TerminalBridge liest Bausteine und Ports aus der geöffneten virtuos-Sitzung.' : 'Öffne dein Modell und das Python-Terminal in virtuos. „Get Model Structure“ liest alle Bausteine und Ports aus.'}</p><span>Es werden keine Demo-Signale geladen.</span></div>}
  </section>;
}

export default memo(SignalTree);
