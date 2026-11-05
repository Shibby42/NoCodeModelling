// @vitest-environment jsdom
import { act, type ComponentType, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeChange } from '@xyflow/react';
import FlowEditor from './FlowEditor';
import SignalTree from './SignalTree';
import { SignalStore, SignalStoreContext } from '../live/SignalStore';
import { createEmptyProject, disconnectedState } from '../adapters/live';
import { SequenceEngine } from '../core/engine';
import type { ModelCatalog, RunSnapshot } from '../core/types';
import App from '../App';

type TestNode = { id: string; type: string; data: Record<string, unknown>; position: { x: number; y: number }; selected?: boolean; measured?: { width?: number; height?: number } };
const probe = vi.hoisted(() => ({
  renders: 0, nodes: [] as TestNode[],
  change: (_changes: NodeChange[]) => {},
  fitView: vi.fn(async () => true),
}));

// jsdom has no layout engine. Render the real custom node components while
// recording the controlled React Flow boundary and its measurement events.
vi.mock('@xyflow/react', async () => {
  const React = await import('react');
  const NodeView = React.memo(({ node, components }: { node: TestNode; components: Record<string, ComponentType<{ id: string; data: Record<string, unknown>; selected: boolean }>> }) => {
    const Component = components[node.type];
    return <Component id={node.id} data={node.data} selected={node.selected ?? false} />;
  });
  const helpers = { fitView: probe.fitView, screenToFlowPosition: (point: { x: number; y: number }) => point };
  return {
    ReactFlow: ({ nodes, nodeTypes, children, onNodesChange }: { nodes: TestNode[]; nodeTypes: Record<string, ComponentType<{ id: string; data: Record<string, unknown>; selected: boolean }>>; children: ReactNode; onNodesChange: (changes: NodeChange[]) => void }) => {
      probe.renders++; probe.nodes = nodes; probe.change = onNodesChange;
      return <section>{nodes.map(node => <NodeView key={node.id} node={node} components={nodeTypes} />)}{children}</section>;
    },
    ReactFlowProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Background: () => null, Controls: () => null, MiniMap: () => null, Handle: () => null,
    BackgroundVariant: { Dots: 'dots' }, MarkerType: { ArrowClosed: 'arrowclosed' }, Position: { Top: 'top', Bottom: 'bottom' },
    useReactFlow: () => helpers,
    applyNodeChanges: (changes: NodeChange[], nodes: TestNode[]) => nodes.map(node => {
      const change = changes.find(change => 'id' in change && change.id === node.id);
      if (change?.type === 'dimensions') return { ...node, measured: change.dimensions };
      if (change?.type === 'position' && change.position) return { ...node, position: change.position };
      return node;
    }),
  };
});

const catalog: ModelCatalog = {
  id: 'model', name: 'Model', source: 'ova',
  root: { id: 'block', name: 'Block', signalIds: ['time', 'fixed'], children: [] },
  signals: [
    { id: 'time', name: 'Time', path: '[Block].[Time]', type: 'Double', nativeType: 'VReal64', direction: 'OUT', writable: false, description: '' },
    { id: 'fixed', name: 'Fixed', path: '[Block].[Fixed]', type: 'Double', nativeType: 'VReal64', direction: 'IN', writable: true, description: '' },
  ],
};
const project = { ...createEmptyProject('model'), blocks: [{ id: 'model-block', blockId: 'block', position: { x: 400, y: 100 } }] };
const handlers = { onSelect: vi.fn(), onPositions: vi.fn(), onDelete: vi.fn(), onEdgesDelete: vi.fn(), onConnect: vi.fn(), onAdd: vi.fn(), onAddBlock: vi.fn(), onAddPortReference: vi.fn(), onSelectSignal: vi.fn() };
const watched: string[] = [];
const onWatch = vi.fn();
const onReload = vi.fn();
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  probe.renders = 0; probe.nodes = []; vi.clearAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function frame(elapsedMs = 0, activeId = 'start'): RunSnapshot {
  return { status: 'running', activeId, completedIds: [], elapsedMs, stepElapsedMs: elapsedMs, values: {}, logs: [], error: null };
}
function render(store: SignalStore, snapshot = frame()) {
  root.render(<SignalStoreContext.Provider value={store}>
    <FlowEditor project={project} catalog={catalog} snapshot={snapshot} selectedId={null} locked={false} {...handlers} />
    <SignalTree catalog={catalog} stale={false} selectedId={null} watched={watched} locked={false} loading={false} onSelect={handlers.onSelectSignal} onWatch={onWatch} onReload={onReload} />
  </SignalStoreContext.Provider>);
}

describe('Graph bei laufender Telemetrie', () => {
  it('verarbeitet 100 Live-Updates ohne den Graphen neu aufzubauen oder Hover-Elemente zu ersetzen', async () => {
    const store = new SignalStore();
    store.publish({ ...disconnectedState(), connected: true, stale: false, values: { time: 0, fixed: 7 } });
    await act(() => render(store));
    await act(() => vi.advanceTimersByTime(100));
    const originalNodes = probe.nodes;
    const originalRenders = probe.renders;
    const hoverTarget = container.querySelector<HTMLButtonElement>('.signal-item')!;
    const originalTitle = hoverTarget.title;
    hoverTarget.focus();
    const fixedPort = [...container.querySelectorAll('.model-port')].find(port => port.textContent?.includes('Fixed'))!;
    const changed = vi.fn();
    const observer = new MutationObserver(changed);
    observer.observe(fixedPort, { subtree: true, childList: true, characterData: true, attributes: true });
    for (let i = 1; i <= 100; i++) {
      await act(() => {
        store.publish({ ...disconnectedState(), connected: true, stale: false, values: { time: i, fixed: 7 } });
        render(store, frame(i * 100));
      });
    }
    expect(probe.renders).toBe(originalRenders);
    expect(probe.nodes).toBe(originalNodes);
    expect(probe.fitView).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.signal-item')).toBe(hoverTarget);
    expect(document.activeElement).toBe(hoverTarget);
    expect(hoverTarget.title).toBe(originalTitle);
    expect(hoverTarget.textContent).toContain('100');
    expect(changed).not.toHaveBeenCalled();
    observer.disconnect();
  });

  it('behält gemessene Knotengrößen bei einem aktiven Schrittwechsel', async () => {
    const store = new SignalStore();
    await act(() => render(store));
    await act(() => probe.change([{ id: 'start', type: 'dimensions', dimensions: { width: 216, height: 92 } }]));
    const measured = probe.nodes.find(node => node.id === 'start')!.measured;
    const modelNode = probe.nodes.find(node => node.id === 'model-block');
    await act(() => render(store, frame(100, 'end')));
    expect(probe.nodes.find(node => node.id === 'start')!.measured).toBe(measured);
    expect(measured).toEqual({ width: 216, height: 92 });
    expect(probe.nodes.find(node => node.id === 'model-block')).toBe(modelNode);
  });

  it('bewegt Knoten lokal und speichert die Position erst nach dem Ziehen', async () => {
    await act(() => render(new SignalStore()));
    await act(() => probe.change([{ id: 'start', type: 'position', position: { x: 120, y: 180 }, dragging: true }]));
    expect(probe.nodes.find(node => node.id === 'start')!.position).toEqual({ x: 120, y: 180 });
    expect(handlers.onPositions).not.toHaveBeenCalled();
    await act(() => probe.change([{ id: 'start', type: 'position', position: { x: 120, y: 180 }, dragging: false }]));
    expect(handlers.onPositions).toHaveBeenCalledOnce();
    expect(handlers.onPositions).toHaveBeenCalledWith([{ id: 'start', x: 120, y: 180 }]);
  });
  it('nimmt einen Signalbaustein aus der Bibliothek an der Drop-Position an', async () => {
    await act(() => render(new SignalStore()));
    const event = new MouseEvent('drop', { bubbles: true, clientX: 320, clientY: 220 });
    Object.defineProperty(event, 'dataTransfer', { value: { getData: (type: string) => type === 'application/signal-studio-step' ? 'ramp' : '' } });
    await act(() => container.querySelector('.flow-wrap')!.dispatchEvent(event));
    expect(handlers.onAdd).toHaveBeenCalledWith('ramp', undefined, { x: 320, y: 220 });
  });

  it('erstellt für einen unveränderten Ablauf keine wiederholten Snapshot-Kopien', () => {
    const engine = new SequenceEngine({ readSignals: async () => ({}), writeSignal: async () => {} }, catalog);
    const idle = engine.snapshot();
    expect(engine.snapshot()).toBe(idle);
    engine.start(project);
    const running = engine.snapshot();
    expect(running).not.toBe(idle);
    expect(engine.snapshot()).toBe(running);
    engine.pause();
    expect(engine.snapshot().status).toBe('paused');
    expect(running.status).toBe('running');
    expect(idle.status).toBe('idle');
  });
  it('konfiguriert eine Rampe aus dem eigenen Bibliothekspanel und speichert deren Parameter', async () => {
    localStorage.clear();
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
    const state = { ...disconnectedState(), connected: true, ready: true, stale: false, values: { time: 0, fixed: 7 } };
    const fetchMock = vi.fn(async (path: string) => ({ ok: true, json: async () => path.endsWith('/model/structure') ? { catalog, state, connectionError: null } : state }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      await act(() => root.render(<App />));
      expect(container.querySelector('.workspace > .block-library')).not.toBeNull();
      expect(container.querySelector('.left-sidebar .block-library')).toBeNull();
      expect(container.querySelector('img[alt="ISG"]')?.getAttribute('src')).toContain('ISG_Logo_klein.png');
      const load = [...container.querySelectorAll('button')].find(button => button.textContent?.includes('Get Model Structure'))!;
      await act(async () => load.click());
      await act(() => container.querySelector<HTMLButtonElement>('.library-block.kind-ramp')!.click());
      const field = (label: string) => [...container.querySelectorAll('label')].find(field => field.textContent?.startsWith(label))!;
      const output = field('Ausgangssignal').querySelector('select')!;
      await act(() => { output.value = 'fixed'; output.dispatchEvent(new Event('change', { bubbles: true })); });
      const changeNumber = async (label: string, value: string) => {
        const input = field(label).querySelector('input')!;
        await act(() => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      };
      await changeNumber('Startwert', '5');
      await changeNumber('Endwert', '15');
      await changeNumber('Rampenzeit', '1.5');
      await act(() => vi.advanceTimersByTimeAsync(450));
      const saved = JSON.parse(localStorage.getItem('virtuos-signal-studio.live-project.v1')!);
      expect(saved.steps.find((step: { kind: string }) => step.kind === 'ramp')).toMatchObject({ signalId: 'fixed', durationMs: 1500, generator: { kind: 'ramp', start: 5, end: 15 } });
      expect(fetchMock.mock.calls.some(([path]) => path.includes('/signals/write'))).toBe(false);
      const tree = container.querySelector('.signal-browser');
      await act(() => container.querySelector<HTMLButtonElement>('[aria-label="Bibliothek schließen"]')!.click());
      expect(container.querySelector('.block-library')).toBeNull();
      expect(container.querySelector('.signal-browser')).toBe(tree);
    } finally { Object.defineProperty(window, 'innerWidth', { value: width, configurable: true }); }
  });
});
