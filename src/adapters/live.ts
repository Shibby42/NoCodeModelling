import type { ModelCatalog, RemoteApiPort, SignalValue } from '../core/types';

export interface ConnectionConfig {
  binDirectory: string;
  host: string;
  port: string;
  objectName: string;
  processId: number;
}
export interface LiveState {
  connected: boolean;
  ready: boolean;
  message: string;
  values: Record<string, SignalValue>;
  errors: Record<string, string>;
  access: Record<string, { readable: boolean; writable: boolean }>;
  forcedIds: string[];
  updatedAt: number | null;
  generation: number;
  stale: boolean;
  projectName: string;
  modelChanged: boolean;
  config: ConnectionConfig;
}
export const defaultConfig: ConnectionConfig = { binDirectory: 'C:\\ISG\\ISG-virtuos_3_8\\bin_x64', host: '127.0.0.1', port: '54322', objectName: 'Visualization', processId: 0 };
export const emptyCatalog: ModelCatalog = { id: '', name: 'Kein Modell geladen', source: 'ova', root: { id: '', name: '', signalIds: [], children: [] }, signals: [] };
export const disconnectedState = (message = 'Nicht verbunden'): LiveState => ({ connected: false, ready: false, message, values: {}, errors: {}, access: {}, forcedIds: [], updatedAt: null, generation: 0, stale: true, projectName: '', modelChanged: false, config: defaultConfig });

export async function request<T>(path: string, body?: unknown, timeoutMs = 6000): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  } catch (error) {
    throw new Error(error instanceof DOMException && error.name === 'TimeoutError'
      ? 'Die Bridge antwortet nicht rechtzeitig. Verbindung prüfen; einen laufenden Struktur-Export nicht erneut starten.'
      : 'Lokale Bridge nicht erreichbar. Die App mit npm.cmd run dev starten.');
  }
  const data = await response.json().catch(() => { throw new Error('Ungültige Bridge-Antwort. Lokalen Dienst prüfen.'); });
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Bridge-Fehler ${response.status}`);
  return data as T;
}

export class LiveRemoteAdapter implements RemoteApiPort {
  state: LiveState = disconnectedState();
  private receivedAt = 0;

  async refresh() { this.state = await request<LiveState>('/state'); this.receivedAt = performance.now(); return this.state; }
  async readSignals(ids: string[]): Promise<Record<string, SignalValue>> {
    if (performance.now() - this.receivedAt > 1500) await this.refresh();
    if (!this.state.connected || this.state.modelChanged) throw new Error(this.state.message);
    // A start/end-only project does not need signal data.
    if (ids.length && (!this.state.ready || this.state.stale)) throw new Error('Kein aktueller Remote-Datensatz verfügbar. Simulation / Ramp-up prüfen.');
    for (const id of ids) {
      if (this.state.errors[id] || this.state.values[id] === undefined) throw new Error(this.state.errors[id] ?? 'Portwert ist nicht verfügbar.');
    }
    return Object.fromEntries(ids.map(id => [id, this.state.values[id]]));
  }
  async writeSignal(id: string, value: SignalValue) {
    const result = await request<{ success: boolean; state: LiveState }>('/signals/write', { id, value });
    this.state = result.state;
  }
  async connect(config: ConnectionConfig) { this.state = await request<LiveState>('/connect', config, 15000); return this.state; }
  async disconnect() { this.state = await request<LiveState>('/disconnect', {}, 15000); return this.state; }
  async release() { this.state = await request<LiveState>('/signals/release', {}, 15000); return this.state; }
  async getModelStructure(config: ConnectionConfig) {
    const result = await request<{ catalog: ModelCatalog; state: LiveState; connectionError: string | null }>('/model/structure', config, 145000);
    this.state = result.state;
    return result;
  }
}

export function createEmptyProject(modelId = '') {
  return { version: 1 as const, name: 'Neuer Signalablauf', modelId,
    steps: [
      { id: 'start', kind: 'start' as const, label: 'Start', position: { x: 50, y: 100 } },
      { id: 'end', kind: 'end' as const, label: 'Ende', position: { x: 50, y: 310 } },
    ], links: [{ id: 'start-end', source: 'start', target: 'end' }], blocks: [] };
}

export function findBranch(catalog: ModelCatalog, id: string) {
  const stack = [catalog.root];
  while (stack.length) {
    const branch = stack.pop()!;
    if (branch.id === id) return branch;
    stack.push(...branch.children);
  }
  return undefined;
}
