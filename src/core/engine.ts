import { validateProject } from './project';
import { compare, formatValue, matchesType, type ModelCatalog, type Project, type RemoteApiPort, type RunSnapshot, type SignalValue, type Step } from './types';

export class SequenceEngine {
  private project: Project | null = null;
  private entered = false;
  private previousValue: SignalValue | undefined;
  private generation = 0;
  private ticking = false;
  private nextLogId = 0;
  private state: RunSnapshot = this.initialState();

  constructor(private remote: RemoteApiPort, private catalog: ModelCatalog) {}

  private initialState(): RunSnapshot {
    return { status: 'idle', activeId: null, completedIds: [], elapsedMs: 0, stepElapsedMs: 0, values: {}, logs: [], error: null };
  }

  snapshot(): RunSnapshot { return structuredClone(this.state); }

  private log(message: string, level: 'info' | 'success' | 'error' = 'info') {
    this.state.logs = [...this.state.logs.slice(-199), { id: ++this.nextLogId, timeMs: this.state.elapsedMs, level, message }];
  }

  start(project: Project) {
    if (this.state.status === 'running' || this.state.status === 'paused') throw new Error('Zuerst den aktuellen Ablauf stoppen.');
    const errors = validateProject(project, this.catalog);
    if (errors.length) throw new Error(errors.join('\n'));
    this.generation++;
    this.project = structuredClone(project);
    this.state = this.initialState();
    this.state.status = 'running';
    this.state.activeId = project.steps.find(s => s.kind === 'start')!.id;
    this.entered = false;
    this.log(`Ablauf „${project.name}“ gestartet.`);
  }

  pause() { if (this.state.status === 'running') { this.state.status = 'paused'; this.log('Ablauf pausiert.'); } }
  resume() { if (this.state.status === 'paused') { this.state.status = 'running'; this.log('Ablauf fortgesetzt.'); } }
  stop() {
    this.generation++;
    this.state.status = 'stopped';
    this.log('Ablauf gestoppt. Bereits gesetzte Signalwerte bleiben erhalten.');
  }
  reset() { this.generation++; this.state = this.initialState(); this.project = null; this.entered = false; }

  private finishStep(step: Step) {
    this.state.completedIds.push(step.id);
    this.log(`${step.label} abgeschlossen.`, 'success');
    if (step.kind === 'end') {
      this.state.status = 'completed';
      this.state.activeId = null;
      this.log('Ablauf erfolgreich abgeschlossen.', 'success');
    } else {
      this.state.activeId = this.project!.links.find(l => l.source === step.id)!.target;
    }
    this.entered = false;
    this.state.stepElapsedMs = 0;
  }

  /** One serial logical tick. The caller supplies simulation time, not wall time. */
  async tick(deltaMs: number) {
    if (this.ticking || this.state.status !== 'running' || !this.project) return;
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Ungültiger Zeitschritt.');
    this.ticking = true;
    const generation = this.generation;
    try {
      const usedIds = [...new Set(this.project.steps.flatMap(s => s.signalId ? [s.signalId] : []))];
      const values = await this.remote.readSignals(usedIds);
      if (generation !== this.generation || this.state.status !== 'running') return;
      for (const signal of this.catalog.signals.filter(s => usedIds.includes(s.id))) {
        if (!matchesType(values[signal.id], signal.type)) throw new Error(`Ungültiger oder fehlender Wert: ${signal.name}.`);
      }
      this.state.values = values;
      this.state.elapsedMs += deltaMs;
      const step = this.project.steps.find(s => s.id === this.state.activeId)!;
      const firstTick = !this.entered;
      if (firstTick) {
        this.entered = true;
        this.state.stepElapsedMs = 0;
        this.previousValue = step.signalId ? values[step.signalId] : undefined;
        this.log(`Aktiv: ${step.label}.`);
      } else this.state.stepElapsedMs += deltaMs;

      if (step.kind === 'start' || step.kind === 'end') this.finishStep(step);
      else if (step.kind === 'set') {
        await this.remote.writeSignal(step.signalId!, step.value!);
        if (generation !== this.generation) return;
        this.state.values[step.signalId!] = step.value!;
        this.log(`${this.catalog.signals.find(s => s.id === step.signalId)!.name} := ${formatValue(step.value)}`);
        this.finishStep(step);
      } else if (step.kind === 'delay') {
        if (this.state.stepElapsedMs >= step.durationMs!) this.finishStep(step);
      } else if (step.kind === 'wait') {
        const current = values[step.signalId!];
        const condition = step.waitMode === 'rising' ? !firstTick && this.previousValue === false && current === true
          : step.waitMode === 'falling' ? !firstTick && this.previousValue === true && current === false
            : compare(current, step.value!, step.comparator!);
        this.previousValue = current;
        if (condition) this.finishStep(step);
        else if (step.timeoutMs! > 0 && this.state.stepElapsedMs >= step.timeoutMs!) throw new Error(`Timeout bei „${step.label}“ nach ${step.timeoutMs! / 1000} s.`);
      }
    } catch (error) {
      if (generation !== this.generation) return;
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : 'Unbekannter Verbindungsfehler.';
      this.log(this.state.error, 'error');
    } finally { this.ticking = false; }
  }
}
