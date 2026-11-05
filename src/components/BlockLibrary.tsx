import { memo, useState } from 'react';
import { BookOpen, Clock3, GripVertical, Plus, Radio, Search, X } from 'lucide-react';
import { blockDefinitions } from '../core/blocks';
import type { StepKind } from '../core/types';

const glyphs: Partial<Record<StepKind, string>> = {
  set: 'M2 18H38', pulse: 'M2 27H12V9H24V27H38', square: 'M2 27H7V9H18V27H28V9H38',
  ramp: 'M2 28L32 8H38', sine: 'M2 18C8 -2 14 -2 20 18S32 38 38 18', triangle: 'M2 27L11 9L20 27L29 9L38 27', sawtooth: 'M2 27L14 9V27L26 9V27L38 9',
};

export default memo(function BlockLibrary({ locked, onAdd, onClose }: { locked: boolean; onAdd: (kind: StepKind) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const matches = blockDefinitions.filter(block => `${block.title} ${block.kind} ${block.description}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
  return <aside id="block-library-panel" className="block-library" aria-label="Bausteinbibliothek">
    <div className="panel-heading"><h2><BookOpen size={15} /> Bausteinbibliothek</h2><button className="icon-button" onClick={onClose} title="Bibliothek schließen" aria-label="Bibliothek schließen"><X size={15} /></button></div>
    <div className="signal-search"><Search size={14} /><input aria-label="Bausteine suchen" placeholder="Puls, Rampe, Signal …" value={query} onChange={e => setQuery(e.target.value)} /></div>
    <div className="library-scroll">{(['source', 'flow'] as const).map(group => {
      const blocks = matches.filter(block => block.group === group);
      if (!blocks.length) return null;
      return <section key={group} className="library-group"><div className="library-group-heading"><span>{group === 'source' ? 'SIGNALQUELLEN' : 'ABLAUFSTEUERUNG'}</span><small>{blocks.length}</small></div>{blocks.map(block => <button key={block.kind} className={`library-block kind-${block.kind}`} disabled={locked} draggable={!locked} onClick={() => onAdd(block.kind)} onDragStart={e => { e.dataTransfer.setData('application/signal-studio-step', block.kind); e.dataTransfer.effectAllowed = 'copy'; }}>
        <span className="library-wave-icon">{glyphs[block.kind] ? <svg viewBox="0 0 40 36" aria-hidden="true"><path d={glyphs[block.kind]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg> : block.kind === 'wait' ? <Radio size={19} /> : <Clock3 size={19} />}</span>
        <span className="library-block-text"><strong>{block.title}</strong><small>{block.description}</small></span><Plus size={13} />
      </button>)}</section>;
    })}{matches.length === 0 && <p className="empty-text">Keine passenden Bausteine.</p>}</div>
    <div className="library-footer"><GripVertical size={15} /><p>Auf die Fläche ziehen oder per Klick nach dem gewählten Schritt einfügen. Das Zielsignal stellst du in den Eigenschaften ein.</p></div>
  </aside>;
});
