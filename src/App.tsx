import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { BookOpen, Check, CheckCircle2, ChevronRight, Clock3, Download, FolderOpen, GitBranch, HelpCircle, Layers3, LayoutGrid, LayoutTemplate, LoaderCircle, Pause, Play, Plus, Radio, RotateCcw, ShieldCheck, Square, Table2, Unplug, Workflow, X } from 'lucide-react';
import type { Connection } from '@xyflow/react';
import { LiveRemoteAdapter, createEmptyProject, defaultConfig, disconnectedState, emptyCatalog, findBranch, type ConnectionConfig, type LiveState } from './adapters/live';
import { SequenceEngine } from './core/engine';
import { autoLayout, parseProject, validateProject } from './core/project';
import { insertPortReference } from './core/references';
import { editorModules, type ModelCatalog, type Project, type RunStatus, type SignalValue, type Step, type StepKind } from './core/types';
import FlowEditor from './components/FlowEditor';
import SignalTree from './components/SignalTree';
import Inspector from './components/Inspector';
import Monitor from './components/Monitor';
import ConnectionDialog from './components/ConnectionDialog';
import { SignalStore, SignalStoreContext } from './live/SignalStore';
import { useEventCallback } from './live/useEventCallback';
import { acceptsGeneratorSignal, isGeneratorKind } from './core/generators';
import { createStep } from './core/blocks';
import BlockLibrary from './components/BlockLibrary';
import isgLogo from '../ISG_Logo_klein.png';

const STORAGE_KEY = 'virtuos-signal-studio.live-project.v1';
const statusLabels: Record<RunStatus, string> = { idle: 'Bereit', running: 'Wird ausgeführt', paused: 'Pausiert', completed: 'Abgeschlossen', stopped: 'Gestoppt', error: 'Fehler' };
const tabIcons = [GitBranch, Layers3, Table2, Clock3];

function readInitialProject() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return parseProject(saved);
  } catch { /* A corrupt or unavailable browser store must not prevent startup. */ }
  return createEmptyProject();
}

export default function App() {
  const [project, setProject] = useState<Project>(readInitialProject);
  const [catalog, setCatalog] = useState<ModelCatalog>(emptyCatalog);
  const [remote] = useState(() => new LiveRemoteAdapter());
  const engine = useMemo(() => new SequenceEngine(remote, catalog), [remote, catalog]);
  const [snapshot, setSnapshot] = useState(() => engine.snapshot());
  const [session, setSessionState] = useState(disconnectedState);
  const [signalStore] = useState(() => new SignalStore());
  const setSession = useCallback((state: LiveState) => { signalStore.publish(state); setSessionState(state); }, [signalStore]);
  const values = session.values;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [inspectorMode, setInspectorMode] = useState<'step' | 'signal'>('step');
  const [watched, setWatched] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [validation, setValidation] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [config, setConfig] = useState<ConnectionConfig>(defaultConfig);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1280);
  const importInput = useRef<HTMLInputElement>(null);
  const locked = snapshot.status === 'running' || snapshot.status === 'paused';
  const editingLocked = locked || loadingStructure || connectionBusy;
  const selectedStep = project.steps.find(s => s.id === selectedId);

  const showNotice = useCallback((text: string, error = false) => setNotice({ text, error }), []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 6500); return () => clearTimeout(timer); }, [notice]);

  useEffect(() => {
    setSaved(false);
    setValidation(null);
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); setSaved(true); setStorageError(false); }
      catch { setStorageError(true); }
    }, 400);
    return () => clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    let disposed = false;
    let busy = false;
    let previousTime = performance.now();
    setSnapshot(engine.snapshot());
    const timer = window.setInterval(() => {
      if (busy) return;
      busy = true;
      void (async () => {
        try {
          const state = await remote.refresh();
          if (disposed) return;
          const now = performance.now();
          if (engine.snapshot().status === 'running') await engine.tick(now - previousTime);
          previousTime = now;
          if (!disposed) { setSession(state); setSnapshot(engine.snapshot()); }
        } catch (error) {
          if (disposed) return;
          remote.state = disconnectedState(error instanceof Error ? error.message : 'Bridge nicht erreichbar');
          if (engine.snapshot().status === 'running') await engine.tick(0);
          setSession(remote.state); setSnapshot(engine.snapshot()); previousTime = performance.now();
        } finally { busy = false; }
      })();
    }, 100);
    return () => { disposed = true; clearInterval(timer); };
  }, [remote, engine, setSession]);

  const selectStep = useCallback((id: string | null) => { setSelectedId(id); setInspectorMode('step'); }, []);
  const selectSignal = useCallback((id: string) => { setSelectedSignalId(id); setInspectorMode('signal'); }, []);
  const refreshRun = () => { setSnapshot(engine.snapshot()); setSession(remote.state); };
  const reset = () => { engine.reset(); refreshRun(); };

  const loadStructure = async () => {
    if (editingLocked) return;
    setLoadingStructure(true);
    try {
      const result = await remote.getModelStructure(config);
      engine.reset();
      setCatalog(result.catalog); setSession(result.state);
      setProject(old => ({ ...old, modelId: old.modelId || result.catalog.id }));
      setWatched(result.catalog.signals.filter(s => s.readable !== false).slice(0, 8).map(s => s.id));
      setSelectedSignalId(null);
      showNotice(result.connectionError ? `Modellstruktur geladen. RemoteAPI: ${result.connectionError}` : `${result.catalog.name}: Modellstruktur mit ${result.catalog.signals.length} Ports geladen.`, Boolean(result.connectionError));
    } catch (error) { showNotice(error instanceof Error ? error.message : 'Strukturabruf fehlgeschlagen.', true); }
    finally { setLoadingStructure(false); }
  };

  const connectionAction = async (action: 'connect' | 'disconnect' | 'release') => {
    if (editingLocked) return;
    setConnectionBusy(true);
    try {
      setSession(await (action === 'connect' ? remote.connect(config) : action === 'disconnect' ? remote.disconnect() : remote.release()));
      showNotice(action === 'connect' ? 'RemoteAPI verbunden.' : action === 'disconnect' ? 'Verbindung getrennt.' : 'Eigene Forces freigegeben.');
    } catch (error) { showNotice(error instanceof Error ? error.message : 'Verbindungsfehler.', true); }
    finally { setConnectionBusy(false); }
  };

  const start = () => {
    if (snapshot.status === 'paused') { engine.resume(); refreshRun(); return; }
    const errors = validateProject(project, catalog);
    setValidation(errors);
    if (errors.length) { showNotice('Der Ablauf enthält noch Fehler. Bitte die Prüfung öffnen.', true); return; }
    try {
      engine.start(project); refreshRun();
    } catch (error) { showNotice(error instanceof Error ? error.message : 'Start fehlgeschlagen.', true); }
  };

  const updateStep = (patch: Partial<Step>) => {
    if (!editingLocked && selectedId) setProject(old => ({ ...old, steps: old.steps.map(s => s.id === selectedId ? { ...s, ...patch } : s) }));
  };

  const addStep = (kind: StepKind, signalId?: string, position?: { x: number; y: number }) => {
    if (editingLocked) return;
    const chosen = catalog.signals.find(signal => signal.id === (signalId ?? selectedSignalId));
    const signal = isGeneratorKind(kind) ? chosen && acceptsGeneratorSignal(kind, chosen) ? chosen : undefined
      : kind === 'set' || kind === 'wait'
        ? (signalId ? chosen : chosen?.type !== 'Unsupported' && chosen?.readable !== false && (kind !== 'set' || chosen?.writable) ? chosen : undefined)
          ?? catalog.signals.find(s => s.type !== 'Unsupported' && s.readable !== false && (kind !== 'set' || s.writable))
        : undefined;
    if (signal && (signal.type === 'Unsupported' || signal.readable === false)) { addPortReference(signal.id, position ?? { x: 320, y: 100 }); return; }
    const id = crypto.randomUUID();
    const step = createStep(kind, signal, position ?? { x: 0, y: 0 }, id);
    setProject(old => {
      const end = old.steps.find(s => s.kind === 'end');
      const chosen = old.steps.find(s => s.id === selectedId);
      const anchor = chosen && chosen.kind !== 'end' ? chosen : old.steps.find(s => s.id === old.links.find(l => l.target === end?.id)?.source);
      const outgoing = old.links.find(l => l.source === anchor?.id);
      const links = old.links.filter(l => l.id !== outgoing?.id);
      if (anchor) links.push({ id: crypto.randomUUID(), source: anchor.id, target: id });
      if (outgoing) links.push({ id: crypto.randomUUID(), source: id, target: outgoing.target });
      else if (!anchor && end) links.push({ id: crypto.randomUUID(), source: id, target: end.id });
      const index = old.steps.findIndex(s => s.id === anchor?.id);
      const steps = [...old.steps.slice(0, index + 1), step, ...old.steps.slice(index + 1)];
      return { ...old, steps: position ? steps : autoLayout(steps, links), links };
    });
    selectStep(id);
  };

  const deleteSteps = (ids: string[]) => {
    if (editingLocked || !ids.length) return;
    const removable = ids.filter(id => { const s = project.steps.find(s => s.id === id); return s && s.kind !== 'start' && s.kind !== 'end'; });
    if (ids.some(id => project.steps.some(s => s.id === id && (s.kind === 'start' || s.kind === 'end')))) showNotice('Start und Ende bleiben als feste Ablaufgrenzen erhalten.');
    setProject(old => {
      let links = [...old.links];
      for (const id of removable) {
        const before = links.find(l => l.target === id);
        const after = links.find(l => l.source === id);
        links = links.filter(l => l.source !== id && l.target !== id);
        if (before && after && before.source !== after.target) links.push({ id: crypto.randomUUID(), source: before.source, target: after.target });
      }
      return { ...old, steps: old.steps.filter(s => !removable.includes(s.id)), blocks: old.blocks?.filter(b => !ids.includes(b.id)), portReferences: old.portReferences?.filter(p => !ids.includes(p.id)), links };
    });
    if (selectedId && ids.includes(selectedId)) setSelectedId(null);
  };

  const connect = (connection: Connection) => {
    if (editingLocked) return;
    if (connection.source === connection.target || project.steps.find(s => s.id === connection.source)?.kind === 'end'
      || project.steps.find(s => s.id === connection.target)?.kind === 'start'
      || project.links.some(l => l.source === connection.source || l.target === connection.target)) {
      showNotice('Pro Schritt ist eine Ein- und Ausgangsverbindung möglich. Bestehende Verbindung zuerst entfernen.', true); return;
    }
    setProject(old => ({ ...old, links: [...old.links, { id: crypto.randomUUID(), source: connection.source, target: connection.target }] }));
  };

  const saveFile = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${project.name.replace(/[^\p{L}\p{N}_-]/gu, '_') || 'Ablauf'}.signal.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotice('Projekt als JSON exportiert.');
  };

  const importFile = async (file: File) => {
    try {
      if (editingLocked) return;
      if (file.size > 1_000_000) throw new Error('Die Projektdatei ist zu groß (max. 1 MB).');
      const next = parseProject(await file.text());
      if (catalog.id && next.modelId !== catalog.id) throw new Error('Die Projektdatei gehört zu einem anderen Modell.');
      reset(); setProject(next); selectStep(next.steps[0]?.id ?? null); showNotice('Projekt geladen.');
    } catch (error) { showNotice(error instanceof Error ? error.message : 'Datei konnte nicht geladen werden.', true); }
  };

  const newProject = () => { if (editingLocked) return; reset(); setProject(createEmptyProject(catalog.id)); selectStep(null); showNotice('Neuer Signalablauf angelegt.'); };
  const force = async (id: string, value: SignalValue) => {
    if (editingLocked) return;
    setConnectionBusy(true);
    try { await remote.writeSignal(id, value); setSession(remote.state); showNotice('Signal geschrieben · Force aktiv. Freigabe unter Schnittstellen.'); }
    catch (error) { showNotice(error instanceof Error ? error.message : 'Schreiben fehlgeschlagen.', true); }
    finally { setConnectionBusy(false); }
  };
  const addBlock = (blockId: string, position: { x: number; y: number }) => {
    if (editingLocked || !findBranch(catalog, blockId)) return;
    const id = crypto.randomUUID();
    setProject(old => ({ ...old, blocks: [...(old.blocks ?? []), { id, blockId, position }] })); selectStep(id);
  };
  const addPortReference = (signalId: string, position: { x: number; y: number }) => {
    if (editingLocked || !catalog.signals.some(signal => signal.id === signalId)) return;
    const id = crypto.randomUUID();
    setProject(old => insertPortReference(old, catalog, signalId, position, id));
    setSelectedId(id); selectSignal(signalId);
  };
  const toggleWatch = useCallback((id: string) => setWatched(old => old.includes(id) ? old.filter(s => s !== id) : [...old, id]), []);
  const validate = () => { const errors = validateProject(project, catalog); setValidation(errors); showNotice(errors.length ? `${errors.length} Fehler im Ablauf gefunden.` : 'Ablauf geprüft. Alle Schritte sind gültig.', errors.length > 0); };

  const onGraphDelete = useEventCallback(deleteSteps);
  const onGraphConnect = useEventCallback(connect);
  const onGraphAdd = useEventCallback(addStep);
  const onGraphAddBlock = useEventCallback(addBlock);
  const onGraphAddPortReference = useEventCallback(addPortReference);
  const onLoadStructure = useEventCallback(() => void loadStructure());
  const closeLibrary = useCallback(() => setLibraryOpen(false), []);
  const onGraphEdgesDelete = useEventCallback((ids: string[]) => {
    if (!editingLocked && ids.length) setProject(old => ({ ...old, links: old.links.filter(link => !ids.includes(link.id)) }));
  });
  const onGraphPositions = useEventCallback((positions: { id: string; x: number; y: number }[]) => {
    if (editingLocked || positions.length === 0) return;
    setProject(old => {
      let changed = false;
      function move<T extends { id: string; position: { x: number; y: number } }>(entry: T): T {
        const position = positions.find(position => position.id === entry.id);
        if (!position || (entry.position.x === position.x && entry.position.y === position.y)) return entry;
        changed = true;
        return { ...entry, position: { x: position.x, y: position.y } };
      }
      const steps = old.steps.map(move);
      const blocks = old.blocks?.map(move);
      const portReferences = old.portReferences?.map(move);
      return changed ? { ...old, steps, blocks, portReferences } : old;
    });
  });

  return <SignalStoreContext.Provider value={signalStore}><div className="app-shell">
    <header className="app-header">
      <div className="brand"><img className="brand-logo" src={isgLogo} alt="ISG" /><div className="brand-divider" /><div><span className="eyebrow">NOCODE / LOWCODE LAB</span><h1>Signal Studio<span className="version-tag">PROTOTYP</span></h1></div></div>
      <div className="header-actions"><button className={`button library-toggle ${libraryOpen ? 'is-active' : ''}`} onClick={() => setLibraryOpen(open => !open)} aria-label="Bausteinbibliothek ein- oder ausblenden" aria-expanded={libraryOpen} aria-controls="block-library-panel"><BookOpen size={15} /><span>Bibliothek</span></button><span className={`environment-badge ${session.connected ? 'is-connected' : ''}`}><span className="demo-dot" />{session.connected ? session.ready && !session.stale ? 'LIVE · VERBUNDEN' : 'VERBUNDEN · WARTET' : 'NICHT VERBUNDEN'}</span><button className="button" onClick={() => setDialogOpen(true)}><Unplug size={15} /><span>Schnittstellen</span></button><button className="icon-button help-button" title="Verbindung konfigurieren" aria-label="Verbindung konfigurieren" onClick={() => setDialogOpen(true)}><HelpCircle size={19} /></button></div>
    </header>
    <div className="project-bar">
      <div className="project-identity"><span className="project-file-icon"><Workflow size={21} /></span><div><div className="project-name-row"><input aria-label="Projektname" value={project.name} disabled={editingLocked} onChange={e => setProject(old => ({ ...old, name: e.target.value }))} /><span className="project-extension">.signal</span></div><div className="project-meta">Arbeitsbereich <ChevronRight size={11} />{catalog.name}<span className="meta-divider">/</span><span className={`save-indicator ${storageError ? 'save-error' : ''}`}>{storageError ? 'Lokale Speicherung nicht verfügbar' : saved ? <><Check size={10} /> Lokal gespeichert</> : 'Wird gespeichert …'}</span></div></div></div>
      <div className="project-actions"><button className="button subtle" disabled={editingLocked} onClick={newProject}><Plus size={14} /><span>Neuer Ablauf</span></button><span className="action-divider" /><button className="button" disabled={editingLocked} onClick={() => importInput.current?.click()}><FolderOpen size={14} /><span>Öffnen</span></button><button className="button" onClick={saveFile}><Download size={14} /><span>Exportieren</span></button><input ref={importInput} type="file" accept=".json,.signal.json" className="sr-only" aria-label="Projektdatei öffnen" onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file); e.target.value = ''; }} /></div>
    </div>
    <Tabs.Root defaultValue="flow" className="editor-tabs-root">
      <div className="approach-bar"><Tabs.List className="approach-tabs" aria-label="Modellierungsansatz">{editorModules.map((module, index) => { const Icon = tabIcons[index]; return <Tabs.Trigger key={module.id} value={module.id} disabled={!module.available} className="approach-tab" title={module.description}><Icon size={16} />{module.label}{!module.available && <span>GEPLANT</span>}</Tabs.Trigger>; })}</Tabs.List><span className="approach-note"><LayoutTemplate size={13} /> Ein Modell. Verschiedene Ansätze.</span></div>
      <Tabs.Content value="flow" className={`workspace ${libraryOpen ? 'library-open' : ''}`}>
        {libraryOpen && <><button className="library-backdrop" aria-label="Bausteinbibliothek ausblenden" onClick={closeLibrary} /><BlockLibrary locked={editingLocked} onAdd={onGraphAdd} onClose={closeLibrary} /></>}
        <aside className="left-sidebar">
          <SignalTree catalog={catalog} stale={session.stale || !session.connected} selectedId={selectedSignalId} watched={watched} locked={editingLocked} loading={loadingStructure} onSelect={selectSignal} onWatch={toggleWatch} onReload={onLoadStructure} />
          <div className="sidebar-bottom"><ShieldCheck size={15} /><div><strong>OVA-Struktur · RemoteAPI-Werte</strong><p>Das Verhalten bleibt im virtuos-Modell.</p></div></div>
        </aside>
        <main className="main-workspace">
          <div className="execution-toolbar"><div className="run-actions">
            <button className="button primary run-button" disabled={snapshot.status === 'running' || !catalog.id || !session.connected || !session.ready || session.stale || loadingStructure || connectionBusy} onClick={start}>{snapshot.status === 'running' ? <LoaderCircle size={14} className="spin" /> : <Play size={14} fill="currentColor" />}{snapshot.status === 'paused' ? 'Fortsetzen' : 'Starten'}</button>
            <button className="icon-button" aria-label="Ablauf pausieren" title="Nur Ablauf pausieren · virtuos läuft weiter" disabled={snapshot.status !== 'running'} onClick={() => { engine.pause(); refreshRun(); }}><Pause size={16} /></button><button className="icon-button stop-button" aria-label="Ablauf stoppen" title="Ablauf stoppen · gesetzte Werte bleiben erhalten" disabled={!locked} onClick={() => { engine.stop(); refreshRun(); }}><Square size={14} /></button><button className="icon-button" aria-label="Ablauf zurücksetzen" title="Nur Ablaufzustand zurücksetzen · kein Reset in virtuos" onClick={reset}><RotateCcw size={15} /></button><span className="toolbar-divider" /><button className="button subtle validate-button" disabled={!catalog.id} onClick={validate}><CheckCircle2 size={15} /><span>Prüfen</span></button>
          </div><div className="canvas-tools"><span className={`run-status status-${snapshot.status}`}><span />{statusLabels[snapshot.status]}</span><button className="icon-button" disabled={editingLocked} title="Schritte automatisch anordnen" aria-label="Schritte automatisch anordnen" onClick={() => setProject(old => ({ ...old, steps: autoLayout(old.steps, old.links) }))}><LayoutGrid size={15} /></button></div></div>
          {validation && validation.length > 0 && <div className="validation-panel" role="alert"><div><strong>Ablauf prüfen</strong><button className="icon-button" onClick={() => setValidation(null)} aria-label="Prüfung schließen"><X size={14} /></button></div><ul>{validation.map(error => <li key={error}>{error}</li>)}</ul></div>}
          {snapshot.error && <div className="runtime-error" role="alert"><Radio size={15} /><span>{snapshot.error}</span><button className="icon-button" aria-label="Fehler zurücksetzen" onClick={reset}><X size={14} /></button></div>}
          {session.modelChanged && <div className="runtime-error" role="alert"><span>Das virtuos-Modell wurde gewechselt. „Get Model Structure“ erneut ausführen.</span></div>}
          <FlowEditor project={project} catalog={catalog} snapshot={snapshot} selectedId={selectedId} locked={editingLocked} onSelect={selectStep} onSelectSignal={selectSignal}
            onPositions={onGraphPositions} onDelete={onGraphDelete} onEdgesDelete={onGraphEdgesDelete} onConnect={onGraphConnect} onAdd={onGraphAdd} onAddBlock={onGraphAddBlock} onAddPortReference={onGraphAddPortReference} />
          <Monitor catalog={catalog} values={values} errors={session.errors} stale={session.stale || !session.connected} updatedAt={session.updatedAt} watched={watched} snapshot={snapshot} onUnwatch={toggleWatch} onSelectSignal={selectSignal} />
        </main>
        <Inspector step={selectedStep} index={project.steps.findIndex(s => s.id === selectedId)} catalog={catalog} values={values} session={session} selectedSignalId={selectedSignalId} mode={inspectorMode} onMode={setInspectorMode} locked={editingLocked} active={snapshot.activeId === selectedId} stepElapsedMs={snapshot.stepElapsedMs} onChange={updateStep} onDelete={() => selectedId && deleteSteps([selectedId])} onForce={(id, value) => void force(id, value)} />
      </Tabs.Content>
    </Tabs.Root>
    <footer className="status-bar"><div><span className={`demo-dot ${session.connected ? 'connected-dot' : ''}`} /><strong>RemoteAPI</strong><span className="connection-message" title={session.message}>{loadingStructure ? 'OVA · Modellstruktur wird ausgelesen …' : session.message}</span>{session.forcedIds.length > 0 && <button className="footer-force-button" onClick={() => setDialogOpen(true)}>{session.forcedIds.length} Force aktiv</button>}</div><div><span>{Object.keys(values).length} / {catalog.signals.length} Portwerte</span><span className="footer-divider" /><code>{(snapshot.elapsedMs / 1000).toFixed(1)} s Ablaufzeit</code><span className="footer-version">v0.2</span></div></footer>
    {notice && <div className={`toast ${notice.error ? 'toast-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.error ? <Radio size={17} /> : <CheckCircle2 size={17} />}<span>{notice.text}</span><button className="icon-button" onClick={() => setNotice(null)} aria-label="Meldung schließen"><X size={14} /></button></div>}
    <ConnectionDialog open={dialogOpen} config={config} session={session} busy={connectionBusy || loadingStructure} locked={locked} onClose={() => setDialogOpen(false)} onConfig={setConfig} onConnect={() => void connectionAction('connect')} onDisconnect={() => void connectionAction('disconnect')} onRelease={() => void connectionAction('release')} />
  </div></SignalStoreContext.Provider>;
}
