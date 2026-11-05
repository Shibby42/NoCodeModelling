import { describe, expect, it } from 'vitest';
import { createDemoProject, MockRemoteAdapter, mockCatalog } from '../adapters/mock';
import { SequenceEngine } from './engine';
import { parseProject, validateProject } from './project';
import type { Project, RemoteApiPort, SignalValue, Step } from './types';

function withStep(config: Partial<Step>): Project {
  return { version: 1, name: 'Test', modelId: mockCatalog.id, steps: [
    { id: 'start', kind: 'start', label: 'Start', position: { x: 0, y: 0 } },
    { id: 'action', kind: 'wait', label: 'Bedingung', position: { x: 0, y: 100 }, signalId: 'sensor.occupied', value: true, comparator: 'eq', waitMode: 'level', timeoutMs: 1000, ...config },
    { id: 'end', kind: 'end', label: 'Ende', position: { x: 0, y: 200 } },
  ], links: [{ id: 'a', source: 'start', target: 'action' }, { id: 'b', source: 'action', target: 'end' }] };
}

describe('gemeinsame Signal-Laufzeit', () => {
  it('führt den gesamten Materialtransfer aus', async () => {
    const remote = new MockRemoteAdapter();
    const engine = new SequenceEngine(remote, mockCatalog);
    const project = createDemoProject();
    expect(validateProject(project, mockCatalog)).toEqual([]);
    engine.start(project);
    for (let i = 0; i < 150 && engine.snapshot().status === 'running'; i++) {
      remote.advance(100);
      await engine.tick(100);
    }
    expect(engine.snapshot().status).toBe('completed');
    expect(engine.snapshot().completedIds).toHaveLength(project.steps.length);
    expect(remote.getValues()).toMatchObject({ 'source.count': 1, 'source.request': false, 'belt.enable': false, 'sensor.occupied': true, 'axis.actual': 200, 'axis.execute': false });
  });

  it('nimmt eine bereits erfüllte Wertbedingung an', async () => {
    const remote = new MockRemoteAdapter();
    remote.forceSignal('sensor.occupied', true);
    const engine = new SequenceEngine(remote, mockCatalog);
    engine.start(withStep({}));
    await engine.tick(100); await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().status).toBe('completed');
  });

  it('ignoriert bei steigender Flanke ein bereits gesetztes Signal', async () => {
    const remote = new MockRemoteAdapter();
    remote.forceSignal('sensor.occupied', true);
    const engine = new SequenceEngine(remote, mockCatalog);
    engine.start(withStep({ waitMode: 'rising' }));
    await engine.tick(100); await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().activeId).toBe('action');
    remote.forceSignal('sensor.occupied', false); await engine.tick(100);
    remote.forceSignal('sensor.occupied', true); await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().status).toBe('completed');
  });

  it('erkennt eine fallende Flanke nach Aktivierung', async () => {
    const remote = new MockRemoteAdapter();
    remote.forceSignal('sensor.occupied', true);
    const engine = new SequenceEngine(remote, mockCatalog);
    engine.start(withStep({ waitMode: 'falling' }));
    await engine.tick(100); await engine.tick(100);
    remote.forceSignal('sensor.occupied', false); await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().status).toBe('completed');
  });

  it('hält Zeit und aktive Bedingung während Pause an', async () => {
    const engine = new SequenceEngine(new MockRemoteAdapter(), mockCatalog);
    engine.start(withStep({}));
    await engine.tick(100); await engine.tick(100);
    engine.pause();
    const before = engine.snapshot();
    await engine.tick(5000);
    expect(engine.snapshot()).toEqual(before);
    engine.resume(); await engine.tick(100);
    expect(engine.snapshot().status).toBe('running');
    expect(engine.snapshot().stepElapsedMs).toBe(100);
  });

  it('meldet einen Timeout und lässt gesetzte Werte stehen', async () => {
    const remote = new MockRemoteAdapter();
    await remote.writeSignal('belt.enable', true);
    const engine = new SequenceEngine(remote, mockCatalog);
    engine.start(withStep({ timeoutMs: 200 }));
    await engine.tick(100); await engine.tick(100); await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().status).toBe('error');
    expect(engine.snapshot().error).toContain('Timeout');
    expect(remote.getValues()['belt.enable']).toBe(true);
  });

  it('wartet bei Timeout 0 unbegrenzt', async () => {
    const engine = new SequenceEngine(new MockRemoteAdapter(), mockCatalog);
    engine.start(withStep({ timeoutMs: 0 }));
    await engine.tick(100); await engine.tick(100); await engine.tick(1_000_000);
    expect(engine.snapshot().status).toBe('running');
  });

  it('unterstützt numerische Vergleiche und Zeitwarten', async () => {
    const remote = new MockRemoteAdapter();
    remote.forceSignal('axis.actual', 120);
    const engine = new SequenceEngine(remote, mockCatalog);
    engine.start(withStep({ signalId: 'axis.actual', comparator: 'gte', value: 100 }));
    await engine.tick(100); await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().status).toBe('completed');
    engine.start(withStep({ kind: 'delay', durationMs: 300 }));
    await engine.tick(100); await engine.tick(100); await engine.tick(200);
    expect(engine.snapshot().activeId).toBe('action');
    await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().status).toBe('completed');
  });

  it('behandelt Transportfehler als Ablauf-Fehler', async () => {
    const port: RemoteApiPort = { readSignals: async () => { throw new Error('RemoteAPI getrennt'); }, writeSignal: async () => {} };
    const engine = new SequenceEngine(port, mockCatalog);
    engine.start(withStep({})); await engine.tick(100);
    expect(engine.snapshot().status).toBe('error');
    expect(engine.snapshot().error).toBe('RemoteAPI getrennt');
  });

  it('weist fehlende und falsch typisierte Signalwerte zurück', async () => {
    const remote = new MockRemoteAdapter();
    const port: RemoteApiPort = { readSignals: async () => ({ ...remote.getValues(), 'sensor.occupied': 'true' }), writeSignal: async () => {} };
    const engine = new SequenceEngine(port, mockCatalog);
    engine.start(withStep({})); await engine.tick(100);
    expect(engine.snapshot().error).toContain('Übergabe belegt');
  });

  it('lässt eine alte Leseantwort einen gestoppten Lauf nicht fortsetzen', async () => {
    let resolve!: (values: Record<string, SignalValue>) => void;
    const remote = new MockRemoteAdapter();
    const port: RemoteApiPort = { readSignals: () => new Promise(r => { resolve = r; }), writeSignal: async () => {} };
    const engine = new SequenceEngine(port, mockCatalog);
    engine.start(withStep({}));
    const pending = engine.tick(100);
    engine.stop(); resolve(remote.getValues()); await pending;
    expect(engine.snapshot().status).toBe('stopped');
    expect(engine.snapshot().completedIds).toHaveLength(0);
  });

  it('wiederholt bei Pause keinen bereits bestätigten Schreibbefehl', async () => {
    const remote = new MockRemoteAdapter();
    let finishWrite!: () => void;
    let writes = 0;
    const port: RemoteApiPort = {
      readSignals: ids => remote.readSignals(ids),
      writeSignal: async () => { writes++; await new Promise<void>(resolve => { finishWrite = resolve; }); },
    };
    const engine = new SequenceEngine(port, mockCatalog);
    engine.start(withStep({ kind: 'set', signalId: 'belt.enable', value: true }));
    await engine.tick(100);
    const pending = engine.tick(100);
    await Promise.resolve();
    engine.pause(); finishWrite(); await pending;
    expect(engine.snapshot().status).toBe('paused');
    expect(engine.snapshot().activeId).toBe('end');
    engine.resume(); await engine.tick(100);
    expect(writes).toBe(1);
    expect(engine.snapshot().status).toBe('completed');
  });
});

describe('Projektprüfung und Import', () => {
  it('erhält das Projekt beim JSON-Roundtrip', () => {
    const project = createDemoProject();
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });
  it('prüft Schreibrechte, Datentyp und Signalzugehörigkeit', () => {
    expect(validateProject(withStep({ kind: 'set', signalId: 'sensor.occupied' }), mockCatalog).join(' ')).toContain('schreibgeschützt');
    expect(validateProject(withStep({ value: 1 }), mockCatalog).join(' ')).toContain('Bool');
    expect(validateProject(withStep({ signalId: 'missing' }), mockCatalog).join(' ')).toContain('Signal auswählen');
  });
  it('weist Verzweigungen, Schleifen und unerreichbare Schritte zurück', () => {
    const project = withStep({});
    project.links.push({ id: 'loop', source: 'action', target: 'action' });
    expect(validateProject(project, mockCatalog).length).toBeGreaterThan(0);
    const disconnected = withStep({});
    disconnected.links = [];
    expect(validateProject(disconnected, mockCatalog).join(' ')).toContain('erreichbar');
  });
  it('weist ungültige Projektdateien vor Verwendung zurück', () => {
    expect(() => parseProject('{}')).toThrow('Projektdatei');
    const project = withStep({});
    const bad = { ...project, steps: [{ ...project.steps[0], kind: ['start'] }] };
    expect(() => parseProject(JSON.stringify(bad))).toThrow('ungültigen Schritt');
    expect(() => parseProject(JSON.stringify({ ...project, links: [null] }))).toThrow('Verbindung');
  });
});
