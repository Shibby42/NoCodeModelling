import { useCallback, useEffect, useMemo } from 'react';
import { Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, Panel, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps } from '@xyflow/react';
import { Box, Check, CircleStop, Clock3, Flag, Maximize2, Radio, Send, Workflow } from 'lucide-react';
import { comparatorLabels, formatValue, stepLabels, type ModelBranch, type ModelCatalog, type Project, type RunSnapshot, type SignalDefinition, type SignalValue, type Step, type StepKind } from '../core/types';
import { findBranch } from '../adapters/live';
import { getSignalDropAction } from '../core/references';
import PortReferenceCard, { type PortReferenceData } from './PortReferenceCard';

export const kindIcons = { start: Flag, set: Send, wait: Radio, delay: Clock3, end: CircleStop };
type StepNode = Node<{ step: Step; signalName: string; index: number; active: boolean; done: boolean; failed: boolean }, 'signal'>;
type ModelNode = Node<{ branch?: ModelBranch; signals: SignalDefinition[]; values: Record<string, SignalValue>; errors: Record<string, string>; stale: boolean; onSignal: (id: string) => void }, 'modelBlock'>;
type PortReferenceNode = Node<PortReferenceData, 'portReference'>;
type DiagramNode = StepNode | ModelNode | PortReferenceNode;

function PortReference({ data, selected }: NodeProps<PortReferenceNode>) {
  return <PortReferenceCard {...data} selected={selected} />;
}

function ModelBlockNode({ data, selected }: NodeProps<ModelNode>) {
  return <div className={`model-block-node ${selected ? 'selected' : ''}`}>
    <div className="model-block-heading"><Box size={16} /><div><strong>{data.branch?.name ?? 'Baustein nicht geladen'}</strong><small>{data.branch?.modelType ?? 'Get Model Structure ausführen'}</small></div><span>OVA</span></div>
    {data.branch?.path && <code className="model-block-path">{data.branch.path}</code>}
    <div className="model-block-ports nodrag nowheel">{data.signals.map(signal => <button key={signal.id} className={`model-port ${data.errors[signal.id] || data.stale ? 'stale-value' : ''}`} onClick={e => { e.stopPropagation(); data.onSignal(signal.id); }} title={`${signal.path}\n${data.errors[signal.id] ?? signal.nativeType ?? signal.type}`}>
      <span className={`port-pin ${signal.direction?.includes('IN') ? 'input' : 'output'}`} /><span className="port-direction">{signal.direction}</span><span className="port-name">{signal.name}</span><code>{data.errors[signal.id] ? '—' : formatValue(data.values[signal.id])}</code>
    </button>)}{data.signals.length === 0 && <p>Keine direkten Ports. Unterbausteine im Modellbaum auswählen.</p>}</div>
    <div className="model-block-footer">Modellreferenz · {data.signals.length} Ports</div>
  </div>;
}

function SignalNode({ data, selected }: NodeProps<StepNode>) {
  const Icon = kindIcons[data.step.kind];
  const { step } = data;
  const detail = step.kind === 'delay' ? `${(step.durationMs ?? 0) / 1000} Sekunden`
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

const nodeTypes = { signal: SignalNode, modelBlock: ModelBlockNode, portReference: PortReference };
interface Props {
  project: Project;
  catalog: ModelCatalog;
  snapshot: RunSnapshot;
  selectedId: string | null;
  locked: boolean;
  values: Record<string, SignalValue>;
  errors: Record<string, string>;
  stale: boolean;
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
  const nodes: DiagramNode[] = useMemo(() => [...project.steps.map((step, index): StepNode => ({
    id: step.id, type: 'signal', position: step.position, selected: step.id === selectedId,
    data: { step, index, signalName: catalog.signals.find(s => s.id === step.signalId)?.name ?? 'Signal auswählen', active: snapshot.activeId === step.id, done: snapshot.completedIds.includes(step.id), failed: snapshot.activeId === step.id && snapshot.status === 'error' },
  })), ...(project.blocks ?? []).map((placement): ModelNode => {
    const branch = findBranch(catalog, placement.blockId);
    return { id: placement.id, type: 'modelBlock', position: placement.position, selected: selectedId === placement.id, connectable: false,
      data: { branch, signals: catalog.signals.filter(s => branch?.signalIds.includes(s.id)), values: props.values, errors: props.errors, stale: props.stale, onSignal: props.onSelectSignal } };
  }), ...(project.portReferences ?? []).map((placement): PortReferenceNode => ({
    id: placement.id, type: 'portReference', position: placement.position, selected: selectedId === placement.id, connectable: false,
    data: { signal: catalog.signals.find(signal => signal.id === placement.signalId), value: props.values[placement.signalId], error: props.errors[placement.signalId], stale: props.stale, locked,
      onInspect: () => props.onSelectSignal(placement.signalId), onRemove: () => props.onDelete([placement.id]) },
  }))], [project.steps, project.blocks, project.portReferences, selectedId, catalog, snapshot.activeId, snapshot.completedIds, snapshot.status, props.values, props.errors, props.stale, props.onSelectSignal, props.onDelete, locked]);
  const edges: Edge[] = useMemo(() => project.links.map(link => ({
    ...link, type: 'smoothstep', animated: snapshot.status === 'running' && snapshot.activeId === link.target,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { stroke: snapshot.completedIds.includes(link.source) ? '#10B981' : '#94A3B8', strokeWidth: 1.5 },
  })), [project.links, snapshot.completedIds, snapshot.activeId, snapshot.status]);

  useEffect(() => { const timer = setTimeout(() => void fitView({ padding: 0.12, maxZoom: 1, duration: 250 }), 60); return () => clearTimeout(timer); }, [project.steps.length, project.blocks?.length, project.portReferences?.length, fitView]);

  const onNodesChange = useCallback((changes: NodeChange<DiagramNode>[]) => {
    if (locked) return;
    const positions = changes.flatMap(c => c.type === 'position' && c.position ? [{ id: c.id, ...c.position }] : []);
    if (positions.length) props.onPositions(positions);
    const removed = changes.filter(c => c.type === 'remove').map(c => c.id);
    if (removed.length) props.onDelete(removed);
  }, [locked, props]);
  const onEdgesChange = (changes: EdgeChange[]) => {
    if (!locked) props.onEdgesDelete(changes.filter(c => c.type === 'remove').map(c => c.id));
  };

  return <div className="flow-wrap" onDragOver={e => { if (!locked) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }} onDrop={e => {
    e.preventDefault();
    if (locked) return;
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
      onNodeClick={(_, n) => { props.onSelect(n.id); if (n.type === 'portReference' && n.data.signal) props.onSelectSignal(n.data.signal.id); }} onPaneClick={() => props.onSelect(null)}
      nodesDraggable={!locked} nodesConnectable={!locked} deleteKeyCode={locked ? null : ['Backspace', 'Delete']}
      minZoom={0.3} maxZoom={1.5} fitView fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
      connectionRadius={24} proOptions={{ hideAttribution: false }}>
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#CCD7E2" />
      <Panel position="top-left" className="canvas-caption"><span className="canvas-label"><Workflow size={13} /> SIGNALABLAUF & MODELLREFERENZEN</span><span>{project.steps.length} Schritte · {project.blocks?.length ?? 0} Modellbausteine · {project.portReferences?.length ?? 0} Portreferenzen</span></Panel>
      <Panel position="top-right"><button className="icon-button canvas-fit" title="Gesamten Ablauf anzeigen" aria-label="Gesamten Ablauf anzeigen" onClick={() => void fitView({ padding: 0.12, duration: 250, maxZoom: 1 })}><Maximize2 size={16} /></button></Panel>
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={n => n.id === snapshot.activeId ? '#009FE3' : snapshot.completedIds.includes(n.id) ? '#10B981' : '#CBD5E1'} maskColor="rgba(248,250,252,.75)" />
      {!catalog.id && <Panel position="top-center"><div className="empty-canvas"><Box size={28} /><h3>Dein virtuos-Modell verbinden</h3><p>Links „Get Model Structure“ klicken.<br />Danach Bausteine und Signale hierher ziehen.</p></div></Panel>}
    </ReactFlow>
  </div>;
}

export default function FlowEditor(props: Props) { return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>; }
