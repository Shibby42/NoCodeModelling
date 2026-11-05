import { describe, expect, it, vi } from 'vitest';
import { createStep } from './blocks';
import { SequenceEngine } from './engine';
import { acceptsGeneratorSignal, defaultGenerator, generatorKinds, isGeneratorConfig, sampleGenerator } from './generators';
import { parseProject, validateProject } from './project';
import type { GeneratorKind, ModelCatalog, Project, SignalDefinition, SignalValue, Step } from './types';

const real: SignalDefinition = { id: 'output', name: 'Ausgang', path: '[Model].[Output]', type: 'Double', nativeType: 'VReal64', writable: true, description: '' };
const boolean: SignalDefinition = { ...real, type: 'Bool', nativeType: 'VBoolean' };
const catalog = (signal = real): ModelCatalog => ({ id: 'model', name: 'Model', source: 'ova', root: { id: 'root', name: 'Root', signalIds: [signal.id], children: [] }, signals: [signal] });
function projectWith(step: Step): Project {
  return { version: 1, name: 'Generator', modelId: 'model', steps: [createStep('start', undefined, undefined, 'start'), step, createStep('end', undefined, undefined, 'end')], links: [{ id: 'a', source: 'start', target: step.id }, { id: 'b', source: step.id, target: 'end' }] };
}
function harness(kind: GeneratorKind, signal = real, patch: Partial<Step> = {}) {
  let value: SignalValue = signal.type === 'Bool' ? false : 0;
  const writeSignal = vi.fn(async (_id: string, next: SignalValue) => { value = next; });
  const engine = new SequenceEngine({ readSignals: async () => ({ output: value }), writeSignal }, catalog(signal));
  const step = { ...createStep(kind, signal, undefined, 'generator'), ...patch };
  engine.start(projectWith(step));
  return { engine, writeSignal, written: () => writeSignal.mock.calls.map(call => call[1]) };
}

describe('Signalformen', () => {
  it('erzeugt steigende und fallende Rampen mit exaktem Endwert', () => {
    expect(sampleGenerator({ kind: 'ramp', start: 0, end: 100 }, 500, 2000)).toEqual({ value: 25, complete: false });
    expect(sampleGenerator({ kind: 'ramp', start: 5, end: -3 }, 1000, 2000).value).toBe(1);
    expect(sampleGenerator({ kind: 'ramp', start: 5, end: -3 }, 2200, 2000)).toEqual({ value: -3, complete: true });
  });
  it('berechnet Sinus mit Phase, Amplitude und Offset', () => {
    const config = { kind: 'sine' as const, amplitude: 2, offset: 3, periodMs: 1000, phaseDeg: 0 };
    expect(sampleGenerator(config, 0, 5000).value).toBeCloseTo(3);
    expect(sampleGenerator(config, 250, 5000).value).toBeCloseTo(5);
    expect(sampleGenerator({ ...config, phaseDeg: 90 }, 0, 5000).value).toBeCloseTo(5);
    expect(sampleGenerator(config, 5000, 5000)).toEqual({ value: 3, complete: true });
  });
  it('berechnet Dreieck und Sägezahn mit periodischem Rücksprung', () => {
    const config = { kind: 'triangle' as const, low: 0, high: 10, periodMs: 1000 };
    expect(sampleGenerator(config, 250, 5000).value).toBe(5);
    expect(sampleGenerator(config, 500, 5000).value).toBe(10);
    expect(sampleGenerator(config, 750, 5000).value).toBe(5);
    expect(sampleGenerator({ ...config, kind: 'sawtooth' }, 750, 5000).value).toBe(7.5);
    expect(sampleGenerator({ ...config, kind: 'sawtooth' }, 1000, 5000).value).toBe(0);
  });
});

describe('Generatoren in der Ablaufsteuerung', () => {
  it.each([real, boolean])('führt einen einzelnen Puls für $type aus und setzt den Ruhewert zurück', async signal => {
    const h = harness('pulse', signal);
    for (let index = 0; index < 15 && h.engine.snapshot().status === 'running'; index++) await h.engine.tick(100);
    expect(h.engine.snapshot().status).toBe('completed');
    expect(h.written()).toEqual(signal.type === 'Bool' ? [false, true, false] : [0, 1, 0]);
  });
  it('überspringt bei einem verzögerten Tick nicht den kompletten Puls', async () => {
    const h = harness('pulse');
    await h.engine.tick(100); await h.engine.tick(100);
    await h.engine.tick(5000);
    expect(h.written()).toEqual([0, 1]);
    expect(h.engine.snapshot().activeId).toBe('generator');
    await h.engine.tick(499);
    expect(h.written()).toEqual([0, 1]);
    await h.engine.tick(1); await h.engine.tick(100);
    expect(h.written()).toEqual([0, 1, 0]);
    expect(h.engine.snapshot().status).toBe('completed');
  });
  it('schreibt beim Rechteck nur Pegelwechsel und schließt mit dem Ruhewert ab', async () => {
    const h = harness('square', real, { durationMs: 1500 });
    await h.engine.tick(100); await h.engine.tick(100);
    await h.engine.tick(250); await h.engine.tick(250); await h.engine.tick(500); await h.engine.tick(500); await h.engine.tick(100);
    expect(h.written()).toEqual([1, 0, 1, 0]);
    expect(h.engine.snapshot().status).toBe('completed');
  });
  it('friert die Rampe während Pause ein und setzt sie danach fort', async () => {
    const h = harness('ramp');
    await h.engine.tick(100); await h.engine.tick(100); await h.engine.tick(500);
    expect(h.written()).toEqual([0, 0.25]);
    h.engine.pause(); await h.engine.tick(5000);
    expect(h.written()).toEqual([0, 0.25]);
    h.engine.resume(); await h.engine.tick(500);
    expect(h.written()).toEqual([0, 0.25, 0.5]);
    await h.engine.tick(1000); await h.engine.tick(100);
    expect(h.written().at(-1)).toBe(1);
    expect(h.engine.snapshot().status).toBe('completed');
  });
  it('belässt beim Stop den letzten Wert und erzeugt keine weiteren Samples', async () => {
    const h = harness('square');
    await h.engine.tick(100); await h.engine.tick(100);
    h.engine.stop(); await h.engine.tick(5000);
    expect(h.written()).toEqual([1]);
    expect(h.engine.snapshot().status).toBe('stopped');
  });
  it('beendet den Ablauf bei Schreibfehlern und führt nachfolgende Schritte nicht aus', async () => {
    const engine = new SequenceEngine({ readSignals: async () => ({ output: 0 }), writeSignal: async () => { throw new Error('Schreibzugriff abgelehnt'); } }, catalog());
    engine.start(projectWith(createStep('ramp', real, undefined, 'generator')));
    await engine.tick(100); await engine.tick(100);
    expect(engine.snapshot().status).toBe('error');
    expect(engine.snapshot().error).toBe('Schreibzugriff abgelehnt');
    expect(engine.snapshot().completedIds).toEqual(['start']);
  });
});

describe('Generator-Konfiguration und Projektdateien', () => {
  it.each(generatorKinds)('speichert und lädt %s mit allen Parametern', kind => {
    const project = projectWith(createStep(kind, real, undefined, 'generator'));
    expect(parseProject(JSON.stringify(project))).toEqual(project);
    expect(validateProject(project, catalog())).toEqual([]);
  });
  it('verhindert unpassende Signaltypen, fehlende Ausgänge und zu kurze Perioden', () => {
    expect(acceptsGeneratorSignal('pulse', boolean)).toBe(true);
    expect(acceptsGeneratorSignal('ramp', boolean)).toBe(false);
    expect(acceptsGeneratorSignal('sine', { ...real, nativeType: 'VInt32' })).toBe(false);
    expect(validateProject(projectWith(createStep('ramp')), catalog()).join(' ')).toContain('Ausgangssignal');
    const step = createStep('square', real, undefined, 'generator');
    step.generator = { kind: 'square', low: 0, high: 1, periodMs: 100, dutyCycle: 0.5 };
    expect(validateProject(projectWith(step), catalog()).join(' ')).toContain('Periodendauer');
    step.generator = { kind: 'square', low: 0, high: 1, periodMs: 1000, dutyCycle: 0.99 };
    expect(validateProject(projectWith(step), catalog()).join(' ')).toContain('Aktiv- und Ruhephase');
  });
  it('weist beschädigte oder zum Baustein unpassende Generatorparameter zurück', () => {
    expect(isGeneratorConfig({ kind: 'pulse', low: '0', high: 1, delayMs: 0, widthMs: 500 })).toBe(false);
    const step = createStep('square', real, undefined, 'generator');
    step.generator = defaultGenerator('sine');
    expect(() => parseProject(JSON.stringify(projectWith(step)))).toThrow('Generatorparameter');
  });
});
