import { matchesType, type ModelCatalog, type OvaPort, type Project, type RemoteApiPort, type SignalValue, type Step } from '../core/types';
import { autoLayout } from '../core/project';

export const mockCatalog: ModelCatalog = {
  id: 'demo-transfer-v1', name: 'Transferstation', source: 'mock',
  root: { id: 'root', name: 'Transferstation', signalIds: [], children: [
    { id: 'source', name: 'Einlastung', children: [], signalIds: ['source.request', 'source.accepted', 'source.count'] },
    { id: 'belt', name: 'Förderband', children: [], signalIds: ['belt.enable', 'belt.speed', 'belt.running'] },
    { id: 'sensor', name: 'Übergabesensor', children: [], signalIds: ['sensor.occupied'] },
    { id: 'axis', name: 'Achse', children: [], signalIds: ['axis.target', 'axis.execute', 'axis.done', 'axis.actual'] },
    { id: 'station', name: 'Station', children: [], signalIds: ['station.name'] },
  ] },
  signals: [
    { id: 'source.request', name: 'Einlastanforderung', path: '[Transferstation].[Einlastung].[Request]', type: 'Bool', writable: true, description: 'Einlastung über das Modell anfordern.' },
    { id: 'source.accepted', name: 'Einlastbestätigung', path: '[Transferstation].[Einlastung].[Accepted]', type: 'Bool', writable: false, description: 'Das Modell bestätigt die Einlastung.' },
    { id: 'source.count', name: 'Materialzähler', path: '[Transferstation].[Einlastung].[Count]', type: 'Double', writable: false, description: 'Anzahl eingelasteter Materialien.' },
    { id: 'belt.enable', name: 'Bandfreigabe', path: '[Transferstation].[Förderband].[Enable]', type: 'Bool', writable: true, description: 'Förderband ein- oder ausschalten.' },
    { id: 'belt.speed', name: 'Bandgeschwindigkeit', path: '[Transferstation].[Förderband].[Speed]', type: 'Double', writable: true, unit: 'm/s', description: 'Geschwindigkeit des Förderbands.' },
    { id: 'belt.running', name: 'Band läuft', path: '[Transferstation].[Förderband].[Running]', type: 'Bool', writable: false, description: 'Rückmeldung des Förderbands.' },
    { id: 'sensor.occupied', name: 'Übergabe belegt', path: '[Transferstation].[Übergabesensor].[Occupied]', type: 'Bool', writable: false, description: 'Material hat den Übergabesensor erreicht.' },
    { id: 'axis.target', name: 'Zielposition', path: '[Transferstation].[Achse].[TargetPosition]', type: 'Double', writable: true, unit: 'mm', description: 'Sollposition für den nächsten Fahrauftrag.' },
    { id: 'axis.execute', name: 'Fahrauftrag', path: '[Transferstation].[Achse].[Execute]', type: 'Bool', writable: true, description: 'Fahrauftrag im Modell auslösen.' },
    { id: 'axis.done', name: 'Position erreicht', path: '[Transferstation].[Achse].[Done]', type: 'Bool', writable: false, description: 'Rückmeldung: Zielposition erreicht.' },
    { id: 'axis.actual', name: 'Istposition', path: '[Transferstation].[Achse].[ActualPosition]', type: 'Double', writable: false, unit: 'mm', description: 'Aktuelle Position der Modellachse.' },
    { id: 'station.name', name: 'Stationsname', path: '[Transferstation].[Station].[Name]', type: 'String', writable: false, description: 'Bezeichnung der Modellstation.' },
  ],
};

export class MockOvaAdapter implements OvaPort {
  async loadCatalog(): Promise<ModelCatalog> { return structuredClone(mockCatalog); }
}

const initialValues = (): Record<string, SignalValue> => ({
  'source.request': false, 'source.accepted': false, 'source.count': 0,
  'belt.enable': false, 'belt.speed': 0.35, 'belt.running': false,
  'sensor.occupied': false, 'axis.target': 200, 'axis.execute': false,
  'axis.done': false, 'axis.actual': 0, 'station.name': 'Transferstation 01',
});

/** Demo model behavior lives here, never in the generic sequence engine. */
export class MockRemoteAdapter implements RemoteApiPort {
  private values = initialValues();
  private sourceTime = 0;
  private travel = 0;
  automatic = true;

  async readSignals(ids: string[]): Promise<Record<string, SignalValue>> {
    return Object.fromEntries(ids.map(id => {
      if (!(id in this.values)) throw new Error(`Signal ${id} ist nicht verfügbar.`);
      return [id, this.values[id]];
    }));
  }

  async writeSignal(id: string, value: SignalValue): Promise<void> {
    const signal = mockCatalog.signals.find(s => s.id === id);
    if (!signal?.writable) throw new Error('Signal ist nicht beschreibbar.');
    if (!matchesType(value, signal.type)) throw new Error('Falscher Signaldatentyp.');
    this.values[id] = value;
  }

  forceSignal(id: string, value: SignalValue) {
    const signal = mockCatalog.signals.find(s => s.id === id);
    if (!signal || !matchesType(value, signal.type)) throw new Error('Ungültiger Testwert.');
    this.values[id] = value;
  }

  getValues() { return { ...this.values }; }
  reset() { this.values = initialValues(); this.sourceTime = 0; this.travel = 0; }

  advance(deltaMs: number) {
    if (!this.automatic) return;
    if (this.values['source.request']) {
      this.sourceTime += deltaMs;
      if (this.sourceTime >= 400 && !this.values['source.accepted']) {
        this.values['source.accepted'] = true;
        this.values['source.count'] = Number(this.values['source.count']) + 1;
        this.travel = 0;
        this.values['sensor.occupied'] = false;
      }
    } else { this.sourceTime = 0; this.values['source.accepted'] = false; }
    this.values['belt.running'] = Boolean(this.values['belt.enable']);
    if (this.values['belt.enable'] && Number(this.values['source.count']) > 0) {
      this.travel += Math.max(0, Number(this.values['belt.speed'])) * deltaMs / 1000;
      if (this.travel >= 0.85) this.values['sensor.occupied'] = true;
    }
    if (this.values['axis.execute']) {
      const actual = Number(this.values['axis.actual']);
      const target = Number(this.values['axis.target']);
      const difference = target - actual;
      const distance = 100 * deltaMs / 1000;
      this.values['axis.actual'] = Math.abs(difference) <= distance ? target : actual + Math.sign(difference) * distance;
      this.values['axis.done'] = this.values['axis.actual'] === target;
    } else this.values['axis.done'] = false;
  }
}

export function createDemoProject(): Project {
  const definitions: Omit<Step, 'id' | 'position'>[] = [
    { kind: 'start', label: 'Ablauf starten' },
    { kind: 'set', label: 'Material einlasten', signalId: 'source.request', value: true },
    { kind: 'wait', label: 'Einlastung bestätigen', signalId: 'source.accepted', value: true, comparator: 'eq', waitMode: 'level', timeoutMs: 5000 },
    { kind: 'set', label: 'Anforderung zurücksetzen', signalId: 'source.request', value: false },
    { kind: 'set', label: 'Förderband starten', signalId: 'belt.enable', value: true },
    { kind: 'wait', label: 'Auf Material warten', signalId: 'sensor.occupied', value: true, comparator: 'eq', waitMode: 'level', timeoutMs: 10000 },
    { kind: 'set', label: 'Förderband stoppen', signalId: 'belt.enable', value: false },
    { kind: 'set', label: 'Zielposition vorgeben', signalId: 'axis.target', value: 200 },
    { kind: 'set', label: 'Achse starten', signalId: 'axis.execute', value: true },
    { kind: 'wait', label: 'Auf Position warten', signalId: 'axis.done', value: true, comparator: 'eq', waitMode: 'rising', timeoutMs: 10000 },
    { kind: 'set', label: 'Fahrauftrag zurücksetzen', signalId: 'axis.execute', value: false },
    { kind: 'end', label: 'Transfer abgeschlossen' },
  ];
  const steps = definitions.map((step, i) => ({ ...step, id: `step-${i + 1}`, position: { x: 0, y: 0 } }));
  const links = steps.slice(1).map((s, i) => ({ id: `link-${i}`, source: steps[i].id, target: s.id }));
  return { version: 1, name: 'Materialtransfer', modelId: mockCatalog.id, steps: autoLayout(steps, links), links };
}
