export type SignalValue = boolean | number | string;
export type SignalType = 'Bool' | 'Double' | 'String' | 'Unsupported';

export interface SignalDefinition {
  id: string;
  name: string;
  path: string;
  type: SignalType;
  writable: boolean;
  unit?: string;
  description: string;
  nativeType?: string;
  direction?: 'IN' | 'OUT' | 'EXT-IN' | 'EXT-OUT';
  blockId?: string;
  readable?: boolean;
  writeAccess?: 'unverified';
}

export interface ModelBranch {
  id: string;
  name: string;
  children: ModelBranch[];
  signalIds: string[];
  path?: string;
  modelType?: string;
}

export interface ModelCatalog {
  id: string;
  name: string;
  source: 'mock' | 'ova';
  root: ModelBranch;
  signals: SignalDefinition[];
  projectName?: string;
}

export type StepKind = 'start' | 'set' | 'wait' | 'delay' | 'end';
export type Comparator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type WaitMode = 'level' | 'rising' | 'falling';

export interface Step {
  id: string;
  kind: StepKind;
  label: string;
  position: { x: number; y: number };
  signalId?: string;
  value?: SignalValue;
  comparator?: Comparator;
  waitMode?: WaitMode;
  timeoutMs?: number;
  durationMs?: number;
}

export interface Link { id: string; source: string; target: string }
export interface ModelBlockPlacement { id: string; blockId: string; position: { x: number; y: number } }
export interface Project {
  version: 1;
  name: string;
  modelId: string;
  steps: Step[];
  links: Link[];
  blocks?: ModelBlockPlacement[];
}

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'stopped' | 'error';
export interface LogEntry {
  id: number;
  timeMs: number;
  level: 'info' | 'success' | 'error';
  message: string;
}
export interface RunSnapshot {
  status: RunStatus;
  activeId: string | null;
  completedIds: string[];
  elapsedMs: number;
  stepElapsedMs: number;
  values: Record<string, SignalValue>;
  logs: LogEntry[];
  error: string | null;
}

/** OVA supplies metadata. It is never used as the cyclic signal transport. */
export interface OvaPort { loadCatalog(): Promise<ModelCatalog> }

/** A future local SDK bridge implements this port; rejected calls fault the run. */
export interface RemoteApiPort {
  readSignals(ids: string[]): Promise<Record<string, SignalValue>>;
  writeSignal(id: string, value: SignalValue): Promise<void>;
}

export interface EditorModule {
  id: string;
  label: string;
  description: string;
  available: boolean;
}

export const editorModules: EditorModule[] = [
  { id: 'flow', label: 'Ablaufgraph', description: 'Signale visuell verknüpfen', available: true },
  { id: 'blocks', label: 'Bausteine', description: 'Steckbare Programmblöcke', available: false },
  { id: 'table', label: 'Schritttabelle', description: 'Abläufe tabellarisch beschreiben', available: false },
  { id: 'timeline', label: 'Timeline', description: 'Signale auf einer Zeitachse planen', available: false },
];

export const stepLabels: Record<StepKind, string> = {
  start: 'Start', set: 'Signal setzen', wait: 'Auf Signal warten', delay: 'Zeit warten', end: 'Ende',
};
export const comparatorLabels: Record<Comparator, string> = {
  eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
};
export const formatValue = (value: SignalValue | undefined): string =>
  value === undefined ? '—' : typeof value === 'number' ? Number(value.toFixed(3)).toString() : String(value);

export function matchesType(value: unknown, type: SignalType): value is SignalValue {
  return type === 'Bool' ? typeof value === 'boolean'
    : type === 'Double' ? typeof value === 'number' && Number.isFinite(value)
      : type === 'String' && typeof value === 'string';
}

export function compare(a: SignalValue, b: SignalValue, operator: Comparator): boolean {
  switch (operator) {
    case 'eq': return a === b;
    case 'neq': return a !== b;
    case 'gt': return typeof a === 'number' && typeof b === 'number' && a > b;
    case 'gte': return typeof a === 'number' && typeof b === 'number' && a >= b;
    case 'lt': return typeof a === 'number' && typeof b === 'number' && a < b;
    case 'lte': return typeof a === 'number' && typeof b === 'number' && a <= b;
  }
}
