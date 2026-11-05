import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { applyNodeChanges, Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Panel, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps } from '@xyflow/react';
import { Activity, Box, Check, CircleStop, Clock3, Flag, Maximize2, Radio, Send, Square, TrendingUp, Triangle, Waves, Workflow, Zap } from 'lucide-react';
import { comparatorLabels, formatValue, stepLabels, type ModelBranch, type ModelCatalog, type Project, type RunSnapshot, type SignalDefinition, type Step, type StepKind } from '../core/types';
import { findBranch } from '../adapters/live';
import { getSignalDropAction } from '../core/references';
import PortReferenceCard from './PortReferenceCard';
import { useSignalSnapshot } from '../live/SignalStore';
import { useEventCallback } from '../live/useEventCallback';
import { synchronizeGraphNodes } from '../core/graph';
import { generatorDuration, isGeneratorKind } from '../core/generators';
import { isLibraryStepKind } from '../core/blocks';

export const kindIcons = { start: Flag, set: Send, wait: Radio, delay: Clock3, end: CircleStop, pulse: Activity, square: Square, ramp: TrendingUp, sine: Waves, triangle: Triangle, sawtooth: Zap };
type StepNode = Node<{ step: Step; signalName: string; index: number; active: boolean; done: boolean; failed: boolean }, 'signal'>;
type ModelNode = Node<{ branch?: ModelBranch; signals: SignalDefinition[]; onSignal: (id: string) => void }, 'modelBlock'>;
type PortReferenceNode = Node<{ signalId: string; signal?: SignalDefinition; locked: boolean; onSignal: (id: string) => void; onDelete: (ids: string[]) => void }, 'portReference'>;
type DiagramNode = StepNode | ModelNode | PortReferenceNode;

function PortReference({ id, data, selected }: NodeProps<PortReferenceNode>) {
  const live = useSignalSnapshot(data.signalId);
  const inspect = useCallback(() => data.onSignal(data.signalId), [data.onSignal, data.signalId]);
  const remove = useCallback(() => data.onDelete([id]), [data.onDelete, id]);
  return <PortReferenceCard signal={data.signal} {...live} locked={data.locked} selected={selected} onInspect={inspect} onRemove={remove} />;
}

const ModelPort = memo(function ModelPort({ signal, onSignal }: { signal: SignalDefinition; onSignal: (id: string) => void }) {
  const live = useSignalSnapshot(signal.id);
  return <button className={`model-port ${live.error || live.stale ? 'stale-value' : ''}`} onClick={e => { e.stopPropagation(); onSignal(signal.id); }} title={`${signal.path}\n${signal.nativeType ?? signal.type}`}>
    <span className={`port-pin ${signal.direction?.includes('IN') ? 'input' : 'output'}`} /><span className="port-direction">{signal.direction}</span><span className="port-name">{signal.name}</span><code>{live.error ? '—' : formatValue(live.value)}</code>
  </button>;
});

function ModelBlockNode({ data, selected }: NodeProps<ModelNode>) {
  return <div className={`model-block-node ${selected ? 'selected' : ''}`}>
    <div className="model-block-heading"><Box size={16} /><div><strong>{data.branch?.name ?? 'Baustein nicht geladen'}</strong><small>{data.branch?.modelType ?? 'Get Model Structure ausführen'}</small></div><span>OVA</span></div>
    {data.branch?.path && <code className="model-block-path">{data.branch.path}</code>}
    <div className="model-block-ports nodrag nowheel">{data.signals.map(signal => <ModelPort key={signal.id} signal={signal} onSignal={data.onSignal} />)}{data.signals.length === 0 && <p>Keine direkten Ports. Unterbausteine im Modellbaum auswählen.</p>}</div>
    <div className="model-block-footer">Modellreferenz · {data.signals.length} Ports</div>
  </div>;
}

function SignalNode({ data, selected }: NodeProps<StepNode>) {
  const Icon = kindIcons[data.step.kind];
  const { step } = data;
  const detail = isGeneratorKind(step.kind) ? `${data.signalName} · ${generatorDuration(step) / 1000} s`
    : step.kind === 'delay' ? `${(step.durationMs ?? 0) / 1000} Sekunden`
    : step.kind === 'set' ? `${data.signalName} := ${formatValue(step.value)}`
      : step.kind === 'wait' ? `${data.signalName} ${step.waitMode === 'rising' ? '↑' : step.waitMode === 'falling' ? '↓' : `${comparatorLabels[step.comparator ?? 'eq']} ${formatValue(step.value)}`}`
        : step.kind === 'start' ? 'Einstiegspunkt' : 'Ablauf abgeschlossen';
  return <div className={`step-node kind-${step.kind} ${selected ? 'selected' : ''} ${data.active ? 'active' : ''} ${data.done ? 'done' : ''} ${data.failed ? 'failed' : ''}`}>
    {step.kind !== 'start' && <Handle type="target" position={Position.Top} />}
    <div className="node-top"><span className="node-kind"><Icon size={12} />{stepLabels[step.kind]}</span><span className="node-index">{data.done ? <Check size={12} /> : String(data.index + 1).padStart(2, '0')}</span></div>
    <strong>{step.label}</strong>
    <div className="node-detail" title={detail}>{detail}</div>
    {data.active && <span className="node-running">{data.failed ? 'Fehler' : 'Aktiv'}</span>}
    {step.kind !== 'end' && <Handle type="source" position={Position.Bottom} />}
  </div>;
}

const nodeTypes = { signal: memo(SignalNode), modelBlock: memo(ModelBlockNode), portReference: memo(PortReference) };
const fitOptions = { padding: 0.12, maxZoom: 1 };
const proOptions = { hideAttribution: false };
const deleteKeys = ['Backspace', 'Delete'];
const edgeMarker = { type: MarkerType.ArrowClosed, width: 16, height: 16 };
const pendingEdgeStyle = { stroke: '#94A3B8', strokeWidth: 1.5 };
const completedEdgeStyle = { stroke: '#10B981', strokeWidth: 1.5 };
const emptySignals: SignalDefinition[] = [];
const miniMapColor = (node: Node) => node.data.active ? '#009FE3' : node.data.done ? '#10B981' : '#CBD5E1';
interface Props {
  project: Project;
  catalog: ModelCatalog;
  snapshot: RunSnapshot;
  selectedId: string | null;
  locked: boolean;
  onSelect: (id: string | null) => void;
  onPositions: (positions: { id: string; x: number; y: number }[]) => void;
  onDelete: (ids: string[]) => void;
  onEdgesDelete: (ids: string[]) => void;
  onConnect: (connection: Connection) => void;
  onAdd: (kind: StepKind, signalId?: string, position?: { x: number; y: number }) => void;
  onAddBlock: (id: string, position: { x: number; y: number }) => void;
  onAddPortReference: (id: string, position: { x: number; y: number }) => void;
  onSelectSignal: (id: string) => void;
}

function Canvas(props: Props) {
  const { project, snapshot, selectedId, catalog, locked } = props;
  const { fitView, screenToFlowPosition } = useReactFlow();
  const blockSignals = useMemo(() => {
    const signals = new Map(catalog.signals.map(signal => [signal.id, signal]));
    const result = new Map<string, SignalDefinition[]>();
    const pending = [catalog.root];
    while (pending.length) {
      const branch = pending.pop()!;
      result.set(branch.id, branch.signalIds.flatMap(id => signals.has(id) ? [signals.get(id)!] : []));
      pending.push(...branch.children);
    }
    return result;
  }, [catalog]);
  const desiredNodes: DiagramNode[] = useMemo(() => [...project.steps.map((step, index): StepNode => ({
    id: step.id, type: 'signal', position: step.position, selected: step.id === selectedId,
    data: { step, index, signalName: catalog.signals.find(s => s.id === step.signalId)?.name ?? 'Signal auswählen', active: snapshot.activeId === step.id, done: snapshot.completedIds.includes(step.id), failed: snapshot.activeId === step.id && snapshot.status === 'error' },
  })), ...(project.blocks ?? []).map((placement): ModelNode => {
    const branch = findBranch(catalog, placement.blockId);
    return { id: placement.id, type: 'modelBlock', position: placement.position, selected: selectedId === placement.id, connectable: false, dragHandle: '.model-block-heading',
      data: { branch, signals: blockSignals.get(placement.blockId) ?? emptySignals, onSignal: props.onSelectSignal } };
  }), ...(project.portReferences ?? []).map((placement): PortReferenceNode => ({
    id: placement.id, type: 'portReference', position: placement.position, selected: selectedId === placement.id, connectable: false, dragHandle: '.port-reference-heading',
    data: { signalId: placement.signalId, signal: catalog.signals.find(signal => signal.id === placement.signalId), locked, onSignal: props.onSelectSignal, onDelete: props.onDelete },
  }))], [project.steps, project.blocks, project.portReferences, selectedId, catalog, blockSignals, snapshot.activeId, snapshot.completedIds, snapshot.status, props.onSelectSignal, props.onDelete, locked]);
  const [nodes, setNodes] = useState(desiredNodes);
  useLayoutEffect(() => { setNodes(current => synchronizeGraphNodes(current, desiredNodes)); }, [desiredNodes]);
  const edges: Edge[] = useMemo(() => project.links.map(link => ({
    ...link, type: 'smoothstep', animated: snapshot.status === 'running' && snapshot.activeId === link.target,
    markerEnd: edgeMarker,
    style: snapshot.completedIds.includes(link.source) ? completedEdgeStyle : pendingEdgeStyle,
  })), [project.links, snapshot.completedIds, snapshot.activeId, snapshot.status]);

  const fitAll = useEventCallback(() => void fitView({ ...fitOptions, duration: 250 }));
  useEffect(() => { const timer = setTimeout(fitAll, 60); return () => clearTimeout(timer); }, [project.steps.length, project.blocks?.length, project.portReferences?.length, fitAll]);

  const onNodesChange = useEventCallback((changes: NodeChange<DiagramNode>[]) => {
    const allowed = locked ? changes.filter(change => change.type === 'dimensions' || change.type === 'select') : changes;
    // Acknowledge measurements and keep pointer-move positions locally in React Flow.
    if (allowed.length) setNodes(current => applyNodeChanges(allowed, current));
    if (locked) return;
    // Commit only the finished drag (or keyboard move) to the project/autosave.
    const positions = changes.flatMap(c => c.type === 'position' && c.dragging !== true && c.position ? [{ id: c.id, ...c.position }] : []);
    if (positions.length) props.onPositions(positions);
    const removed = changes.filter(c => c.type === 'remove').map(c => c.id);
    if (removed.length) props.onDelete(removed);
  });
  const onEdgesChange = useEventCallback((changes: EdgeChange[]) => {
    if (!locked) props.onEdgesDelete(changes.filter(c => c.type === 'remove').map(c => c.id));
  });
  const onNodeClick = useEventCallback((_: unknown, node: DiagramNode) => {
    props.onSelect(node.id);
    if (node.type === 'portReference' && node.data.signal) props.onSelectSignal(node.data.signal.id);
  });
  const onPaneClick = useEventCallback(() => props.onSelect(null));

  return <div className="flow-wrap" onDragOver={e => { if (!locked) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }} onDrop={e => {
    e.preventDefault();
    if (locked) return;
    const stepKind = e.dataTransfer.getData('application/signal-studio-step');
    if (isLibraryStepKind(stepKind)) { props.onAdd(stepKind, undefined, screenToFlowPosition({ x: e.clientX, y: e.clientY })); return; }
    const id = e.dataTransfer.getData('application/signal-studio');
    const blockId = e.dataTransfer.getData('application/virtuos-block');
    if (blockId && findBranch(catalog, blockId)) { props.onAddBlock(blockId, screenToFlowPosition({ x: e.clientX, y: e.clientY })); return; }
    const signal = catalog.signals.find(s => s.id === id);
    if (signal) {
      const action = getSignalDropAction(signal);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (action === 'reference') props.onAddPortReference(id, position);
      else props.onAdd(action, id, position);
    }
  }}>
    <ReactFlow<DiagramNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={locked ? undefined : props.onConnect}
      onNodeClick={onNodeClick} onPaneClick={onPaneClick}
      nodesDraggable={!locked} nodesConnectable={!locked} deleteKeyCode={locked ? null : deleteKeys}
      minZoom={0.3} maxZoom={1.5} fitView fitViewOptions={fitOptions}
      connectionRadius={24} proOptions={proOptions}>
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#CCD7E2" />
      <Panel position="top-left" className="canvas-caption"><span className="canvas-label"><Workflow size={13} /> SIGNALABLAUF & MODELLREFERENZEN</span><span>{project.steps.length} Schritte · {project.blocks?.length ?? 0} Modellbausteine · {project.portReferences?.length ?? 0} Portreferenzen</span></Panel>
      <Panel position="top-right"><button className="icon-button canvas-fit" title="Gesamten Ablauf anzeigen" aria-label="Gesamten Ablauf anzeigen" onClick={fitAll}><Maximize2 size={16} /></button></Panel>
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={miniMapColor} maskColor="rgba(248,250,252,.75)" />
      {!catalog.id && <Panel position="top-center"><div className="empty-canvas"><Box size={28} /><h3>Dein virtuos-Modell verbinden</h3><p>Links „Get Model Structure“ klicken.<br />Danach Bausteine und Signale hierher ziehen.</p></div></Panel>}
    </ReactFlow>
  </div>;
}

function FlowEditor(props: Props) { return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>; }

export default memo(FlowEditor, (previous, next) => {
  for (const key of Object.keys(previous) as (keyof Props)[]) {
    if (key !== 'snapshot' && previous[key] !== next[key]) return false;
  }
  const left = previous.snapshot;
  const right = next.snapshot;
  return left.activeId === right.activeId && left.status === right.status
    && left.completedIds.length === right.completedIds.length
    && left.completedIds.every((id, index) => id === right.completedIds[index]);
});
