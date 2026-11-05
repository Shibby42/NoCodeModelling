import { matchesType, type GeneratorConfig, type GeneratorKind, type ScalarLevel, type SignalDefinition, type Step } from './types';

export const GENERATOR_MIN_INTERVAL_MS = 100;
export const generatorKinds: GeneratorKind[] = ['pulse', 'square', 'ramp', 'sine', 'triangle', 'sawtooth'];
export const isGeneratorKind = (kind: string): kind is GeneratorKind => generatorKinds.includes(kind as GeneratorKind);

export function defaultGenerator(kind: GeneratorKind, signal?: SignalDefinition): GeneratorConfig {
  const low = signal?.type === 'Bool' ? false : 0;
  const high = signal?.type === 'Bool' ? true : 1;
  switch (kind) {
    case 'pulse': return { kind, low, high, delayMs: 200, widthMs: 500 };
    case 'square': return { kind, low, high, periodMs: 1000, dutyCycle: 0.5 };
    case 'ramp': return { kind, start: 0, end: 1 };
    case 'sine': return { kind, amplitude: 1, offset: 0, periodMs: 2000, phaseDeg: 0 };
    case 'triangle': case 'sawtooth': return { kind, low: 0, high: 1, periodMs: 2000 };
  }
}

export function acceptsGeneratorSignal(kind: GeneratorKind, signal: SignalDefinition): boolean {
  if (!signal.writable || signal.readable === false) return false;
  if (kind === 'pulse' || kind === 'square') return signal.type === 'Bool' || signal.type === 'Double';
  return signal.type === 'Double' && (!signal.nativeType || signal.nativeType === 'VReal32' || signal.nativeType === 'VReal64');
}

export function retargetGenerator(config: GeneratorConfig, signal: SignalDefinition): GeneratorConfig {
  if (config.kind !== 'pulse' && config.kind !== 'square') return config;
  return { ...config,
    low: matchesType(config.low, signal.type) ? config.low : signal.type === 'Bool' ? false : 0,
    high: matchesType(config.high, signal.type) ? config.high : signal.type === 'Bool' ? true : 1,
  };
}

export function generatorDuration(step: Step): number {
  return step.generator?.kind === 'pulse' ? step.generator.delayMs + step.generator.widthMs : step.durationMs ?? 0;
}

/** Analytic samples, independent of rendering, polling frequency or transport. */
export function sampleGenerator(config: GeneratorConfig, timeMs: number, durationMs: number): { value: ScalarLevel; complete: boolean } {
  const t = Math.max(0, timeMs);
  if (config.kind === 'pulse') return { value: t >= config.delayMs && t < config.delayMs + config.widthMs ? config.high : config.low, complete: t >= config.delayMs + config.widthMs };
  const complete = t >= durationMs;
  if (config.kind === 'ramp') return { value: complete ? config.end : config.start + (config.end - config.start) * t / durationMs, complete };
  if (config.kind === 'sine') return { value: complete ? config.offset : config.offset + config.amplitude * Math.sin(2 * Math.PI * t / config.periodMs + config.phaseDeg * Math.PI / 180), complete };
  if (complete) return { value: config.low, complete };
  const phase = (t % config.periodMs) / config.periodMs;
  if (config.kind === 'square') return { value: phase < config.dutyCycle ? config.high : config.low, complete };
  return { value: config.low + (config.high - config.low) * (config.kind === 'triangle' ? 1 - Math.abs(2 * phase - 1) : phase), complete };
}

export function validateGenerator(step: Step, signal?: SignalDefinition): string[] {
  const config = step.generator;
  if (!config || config.kind !== step.kind) return ['Generatorparameter fehlen oder passen nicht zum Baustein.'];
  const errors: string[] = [];
  if (signal && !acceptsGeneratorSignal(config.kind, signal)) errors.push(config.kind === 'pulse' || config.kind === 'square' ? 'Ein beschreibbares Bool- oder numerisches Signal ist erforderlich.' : 'Ein beschreibbarer Real32-/Real64-Port ist erforderlich.');
  if (config.kind !== 'pulse' && (!Number.isFinite(step.durationMs) || (step.durationMs ?? 0) < GENERATOR_MIN_INTERVAL_MS)) errors.push('Laufzeit muss mindestens 0,1 s sein.');
  if (config.kind === 'pulse' || config.kind === 'square') {
    if (signal && (!matchesType(config.low, signal.type) || !matchesType(config.high, signal.type))) errors.push('Ruhe- und Aktivwert müssen zum Signaldatentyp passen.');
    if (signal?.nativeType?.match(/^VU?Int/) && (typeof config.low !== 'number' || typeof config.high !== 'number' || !Number.isInteger(config.low) || !Number.isInteger(config.high))) errors.push('Ganzzahlports benötigen ganzzahlige Pegel.');
  }
  if (config.kind === 'pulse') {
    if (!Number.isFinite(config.delayMs) || config.delayMs < 0) errors.push('Startverzögerung muss mindestens 0 sein.');
    if (!Number.isFinite(config.widthMs) || config.widthMs < GENERATOR_MIN_INTERVAL_MS) errors.push('Pulsbreite muss mindestens 0,1 s sein.');
  }
  if ('periodMs' in config && (!Number.isFinite(config.periodMs) || config.periodMs < 2 * GENERATOR_MIN_INTERVAL_MS)) errors.push('Periodendauer muss mindestens 0,2 s sein (maximal 5 Hz).');
  if (config.kind === 'square') {
    if (!Number.isFinite(config.dutyCycle) || config.dutyCycle <= 0 || config.dutyCycle >= 1) errors.push('Tastgrad muss zwischen 0 und 100 % liegen.');
    else if (config.periodMs * Math.min(config.dutyCycle, 1 - config.dutyCycle) < GENERATOR_MIN_INTERVAL_MS) errors.push('Aktiv- und Ruhephase müssen jeweils mindestens 0,1 s dauern.');
  }
  if (config.kind === 'sine' && (!Number.isFinite(config.amplitude) || config.amplitude < 0)) errors.push('Amplitude muss endlich und mindestens 0 sein.');
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'number' && !Number.isFinite(value)) errors.push(`${key}: Endlicher Zahlenwert erforderlich.`);
  }
  return [...new Set(errors)];
}

/** Strict file boundary; semantic bounds are checked by validateGenerator. */
export function isGeneratorConfig(value: unknown): value is GeneratorConfig {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (typeof data.kind !== 'string' || !isGeneratorKind(data.kind)) return false;
  const number = (key: string) => typeof data[key] === 'number' && Number.isFinite(data[key]);
  const level = (key: string) => typeof data[key] === 'boolean' || number(key);
  switch (data.kind) {
    case 'pulse': return level('low') && level('high') && number('delayMs') && number('widthMs');
    case 'square': return level('low') && level('high') && number('periodMs') && number('dutyCycle');
    case 'ramp': return number('start') && number('end');
    case 'sine': return number('amplitude') && number('offset') && number('periodMs') && number('phaseDeg');
    case 'triangle': case 'sawtooth': return number('low') && number('high') && number('periodMs');
  }
}
