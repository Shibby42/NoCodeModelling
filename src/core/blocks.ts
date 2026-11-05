import { defaultGenerator, isGeneratorKind } from './generators';
import { stepLabels, type SignalDefinition, type Step, type StepKind } from './types';

export const blockDefinitions: { kind: StepKind; title: string; description: string; group: 'source' | 'flow' }[] = [
  { kind: 'set', title: 'Konstante', description: 'Einen festen Signalwert setzen', group: 'source' },
  { kind: 'pulse', title: 'Puls', description: 'Einmaliger Impuls mit Ruhewert', group: 'source' },
  { kind: 'square', title: 'Rechteck', description: 'Periodischer Wechsel zweier Werte', group: 'source' },
  { kind: 'ramp', title: 'Rampe', description: 'Linear vom Start- zum Endwert', group: 'source' },
  { kind: 'sine', title: 'Sinus', description: 'Sinus mit Amplitude und Offset', group: 'source' },
  { kind: 'triangle', title: 'Dreieck', description: 'Gleichmäßig auf- und abfahren', group: 'source' },
  { kind: 'sawtooth', title: 'Sägezahn', description: 'Wiederholter Anstieg mit Rücksprung', group: 'source' },
  { kind: 'wait', title: 'Auf Signal warten', description: 'Wertbedingung oder Signalflanke', group: 'flow' },
  { kind: 'delay', title: 'Zeit warten', description: 'Den Ablauf zeitlich verzögern', group: 'flow' },
];

export const isLibraryStepKind = (kind: string): kind is StepKind => blockDefinitions.some(block => block.kind === kind);

export function createStep(kind: StepKind, signal?: SignalDefinition, position = { x: 0, y: 0 }, id: string = crypto.randomUUID()): Step {
  return {
    id, kind, label: stepLabels[kind], position,
    ...(signal && (kind === 'set' || kind === 'wait' || isGeneratorKind(kind)) ? { signalId: signal.id } : {}),
    ...(kind === 'set' || kind === 'wait' ? { value: signal?.type === 'Bool' ? true : signal?.type === 'Double' ? 0 : '' } : {}),
    ...(kind === 'wait' ? { waitMode: 'level' as const, comparator: 'eq' as const, timeoutMs: 10000 } : {}),
    ...(kind === 'delay' ? { durationMs: 1000 } : {}),
    ...(isGeneratorKind(kind) ? { generator: defaultGenerator(kind, signal), ...(kind !== 'pulse' ? { durationMs: kind === 'ramp' ? 2000 : 5000 } : {}) } : {}),
  };
}
