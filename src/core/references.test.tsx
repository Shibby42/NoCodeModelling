import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createEmptyProject } from '../adapters/live';
import PortReferenceCard from '../components/PortReferenceCard';
import { SequenceEngine } from './engine';
import { parseProject, validateProject } from './project';
import { getSignalDropAction, insertPortReference } from './references';
import type { ModelCatalog, SignalDefinition } from './types';

const reference: SignalDefinition = {
  id: 'axis-reference', name: 'AxisRef', path: '[Block Diagram].[Axis].[AxisRef]',
  type: 'Unsupported', nativeType: 'VAxis', direction: 'OUT',
  readable: false, writable: false, description: 'Achsenreferenz im Modell',
};
const catalog: ModelCatalog = {
  id: 'model', name: 'Modell', source: 'ova',
  root: { id: 'root', name: 'Block Diagram', signalIds: [reference.id], children: [] },
  signals: [reference],
};

describe('Drag & Drop von Referenzports', () => {
  it.each(['VAxis', 'rfActors', 'rfElements', 'VFieldContainerReference', 'VEventCommunicationChannelPin'])('%s wird als Portreferenz angenommen', nativeType => {
    expect(getSignalDropAction({ ...reference, nativeType })).toBe('reference');
  });

  it('verwendet skalare Ein- und Ausgänge weiterhin als Setz- und Warteschritte', () => {
    const scalar: SignalDefinition = { ...reference, type: 'Double', nativeType: 'VReal64', readable: true, writable: true };
    expect(getSignalDropAction({ ...scalar, direction: 'IN' })).toBe('set');
    expect(getSignalDropAction({ ...scalar, direction: 'OUT' })).toBe('wait');
    expect(getSignalDropAction({ ...scalar, direction: 'IN', writable: false })).toBe('wait');
  });

  it('speichert den gezogenen Port an der Drop-Position ohne den Ablauf umzubauen', () => {
    const original = createEmptyProject('model');
    const next = insertPortReference(original, catalog, reference.id, { x: 320, y: 180 });
    expect(next.steps).toBe(original.steps);
    expect(next.links).toBe(original.links);
    expect(next.portReferences?.[0]).toMatchObject({ signalId: reference.id, position: { x: 320, y: 180 } });
    expect(parseProject(JSON.stringify(next))).toEqual(next);
    expect(original).not.toHaveProperty('portReferences');
    expect(validateProject(next, catalog)).toEqual([]);
  });

  it('führt Referenzports nicht aus und fordert keine ihrer Werte bei der RemoteAPI an', async () => {
    const readSignals = vi.fn(async () => ({}));
    const writeSignal = vi.fn(async () => {});
    const engine = new SequenceEngine({ readSignals, writeSignal }, catalog);
    const project = insertPortReference(createEmptyProject('model'), catalog, reference.id, { x: 10, y: 20 });
    engine.start(project);
    await engine.tick(100);
    await engine.tick(100);
    expect(engine.snapshot().status).toBe('completed');
    expect(engine.snapshot().completedIds).toEqual(['start', 'end']);
    expect(readSignals).toHaveBeenNthCalledWith(1, []);
    expect(readSignals).toHaveBeenNthCalledWith(2, []);
    expect(writeSignal).not.toHaveBeenCalled();
  });

  it('zeigt den nativen Referenztyp ohne einen skalaren Live-Wert vorzutäuschen', () => {
    const markup = renderToStaticMarkup(<PortReferenceCard signal={reference} value={12345} stale={false} selected={false} locked={false} onInspect={() => {}} onRemove={() => {}} />);
    expect(markup).toContain('VAxis');
    expect(markup).toContain('Referenzport · kein skalarer Signalwert');
    expect(markup).not.toContain('port-reference-value');
    expect(markup).toContain('Portreferenz entfernen');
  });

  it('verhindert beim Import Kollisionen zwischen Referenz- und Ablaufknoten', () => {
    const project = insertPortReference(createEmptyProject('model'), catalog, reference.id, { x: 10, y: 20 });
    const placement = project.portReferences![0];
    expect(() => parseProject(JSON.stringify({ ...project, portReferences: [{ ...placement, id: 'start' }] }))).toThrow('Portreferenz');
    expect(() => parseProject(JSON.stringify({ ...project, blocks: [{ id: placement.id, blockId: 'block', position: { x: 0, y: 0 } }] }))).toThrow('Portreferenz');
    expect(() => parseProject(JSON.stringify({ ...project, portReferences: [placement, placement] }))).toThrow('Portreferenz');
  });
});
