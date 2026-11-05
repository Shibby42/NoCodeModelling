import { matchesType, type ModelCatalog, type Project, type Step } from './types';

export function validateProject(project: Project, catalog: ModelCatalog): string[] {
  const errors: string[] = [];
  if (!project.name.trim()) errors.push('Bitte einen Projektnamen vergeben.');
  if (project.modelId !== catalog.id) errors.push('Das Projekt gehört zu einem anderen Modell.');
  const starts = project.steps.filter(s => s.kind === 'start');
  const ends = project.steps.filter(s => s.kind === 'end');
  if (starts.length !== 1) errors.push('Der Ablauf benötigt genau einen Start.');
  if (ends.length !== 1) errors.push('Der Ablauf benötigt genau ein Ende.');
  const byId = new Map(project.steps.map(s => [s.id, s]));
  if (byId.size !== project.steps.length) errors.push('Schritt-IDs müssen eindeutig sein.');
  if (new Set(project.links.map(l => l.id)).size !== project.links.length) errors.push('Verbindungs-IDs müssen eindeutig sein.');
  for (const link of project.links) {
    if (!byId.has(link.source) || !byId.has(link.target)) errors.push('Eine Verbindung verweist auf einen fehlenden Schritt.');
  }
  for (const step of project.steps) {
    const incoming = project.links.filter(l => l.target === step.id).length;
    const outgoing = project.links.filter(l => l.source === step.id).length;
    if (incoming !== (step.kind === 'start' ? 0 : 1)) errors.push(`${step.label}: ${step.kind === 'start' ? 'keine' : 'genau eine'} eingehende Verbindung erforderlich.`);
    if (outgoing !== (step.kind === 'end' ? 0 : 1)) errors.push(`${step.label}: ${step.kind === 'end' ? 'keine' : 'genau eine'} ausgehende Verbindung erforderlich.`);
    if (step.kind === 'set' || step.kind === 'wait') {
      const signal = catalog.signals.find(s => s.id === step.signalId);
      if (!signal) { errors.push(`${step.label}: Signal auswählen.`); continue; }
      if (signal.type === 'Unsupported' || signal.readable === false) errors.push(`${step.label}: Dieser Porttyp wird von der skalaren RemoteAPI nicht unterstützt.`);
      if (step.kind === 'set' && !signal.writable) errors.push(`${step.label}: ${signal.name} ist schreibgeschützt.`);
      if (!matchesType(step.value, signal.type)) errors.push(`${step.label}: Wert muss vom Typ ${signal.type} sein.`);
      if (step.kind === 'wait') {
        if (!step.comparator) errors.push(`${step.label}: Vergleich auswählen.`);
        if (!step.waitMode) errors.push(`${step.label}: Wartemodus auswählen.`);
        if (signal.type !== 'Double' && step.comparator !== 'eq' && step.comparator !== 'neq') errors.push(`${step.label}: Für ${signal.type} nur = oder ≠ verwenden.`);
        if (step.waitMode !== 'level' && signal.type !== 'Bool') errors.push(`${step.label}: Flanken benötigen ein Bool-Signal.`);
        if (step.timeoutMs === undefined || !Number.isFinite(step.timeoutMs) || step.timeoutMs < 0) errors.push(`${step.label}: Timeout muss mindestens 0 sein.`);
      }
    }
    if (step.kind === 'delay' && (step.durationMs === undefined || !Number.isFinite(step.durationMs) || step.durationMs < 0)) errors.push(`${step.label}: Wartezeit muss mindestens 0 sein.`);
  }
  if (starts.length === 1) {
    const visited = new Set<string>();
    let next: string | undefined = starts[0].id;
    while (next && byId.has(next)) {
      if (visited.has(next)) { errors.push('Schleifen sind im ersten Prototyp nicht ausführbar.'); break; }
      visited.add(next);
      next = project.links.find(l => l.source === next)?.target;
    }
    if (visited.size !== project.steps.length) errors.push('Alle Schritte müssen vom Start aus erreichbar sein.');
  }
  return [...new Set(errors)];
}

/** Validate the file structure before accepting data from disk or localStorage. */
export function parseProject(text: string): Project {
  if (text.length > 1_000_000) throw new Error('Die Projektdatei ist zu groß (max. 1 MB).');
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || value.version !== 1 || typeof value.name !== 'string' || typeof value.modelId !== 'string'
    || !Array.isArray(value.steps) || !Array.isArray(value.links) || value.steps.length > 500 || value.links.length > 500) {
    throw new Error('Keine unterstützte Signal-Studio-Projektdatei (Version 1).');
  }
  for (const step of value.steps) {
    if (!isRecord(step) || typeof step.id !== 'string' || !step.id || typeof step.label !== 'string'
      || typeof step.kind !== 'string' || !['start', 'set', 'wait', 'delay', 'end'].includes(step.kind)
      || !isRecord(step.position) || typeof step.position.x !== 'number' || !Number.isFinite(step.position.x)
      || typeof step.position.y !== 'number' || !Number.isFinite(step.position.y)
      || (step.signalId !== undefined && typeof step.signalId !== 'string')
      || (step.value !== undefined && !['boolean', 'number', 'string'].includes(typeof step.value))
      || (typeof step.value === 'number' && !Number.isFinite(step.value))
      || (step.comparator !== undefined && (typeof step.comparator !== 'string' || !['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(step.comparator)))
      || (step.waitMode !== undefined && (typeof step.waitMode !== 'string' || !['level', 'rising', 'falling'].includes(step.waitMode)))
      || (step.timeoutMs !== undefined && (typeof step.timeoutMs !== 'number' || !Number.isFinite(step.timeoutMs)))
      || (step.durationMs !== undefined && (typeof step.durationMs !== 'number' || !Number.isFinite(step.durationMs)))) {
      throw new Error('Die Datei enthält einen ungültigen Schritt.');
    }
  }
  for (const link of value.links) {
    if (!isRecord(link) || typeof link.id !== 'string' || !link.id || typeof link.source !== 'string' || typeof link.target !== 'string') {
      throw new Error('Die Datei enthält eine ungültige Verbindung.');
    }
  }
  if (value.blocks !== undefined) {
    if (!Array.isArray(value.blocks) || value.blocks.length > 500) throw new Error('Ungültige Modellreferenzen.');
    const ids = new Set<string>();
    for (const block of value.blocks) {
      if (!isRecord(block) || typeof block.id !== 'string' || typeof block.blockId !== 'string'
        || !isRecord(block.position) || typeof block.position.x !== 'number' || !Number.isFinite(block.position.x)
        || typeof block.position.y !== 'number' || !Number.isFinite(block.position.y)
        || ids.has(block.id) || value.steps.some(s => s.id === block.id)) throw new Error('Ungültige Modellreferenz.');
      ids.add(block.id);
    }
  }
  return value as unknown as Project;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }

export function autoLayout(steps: Step[], links: Project['links']): Step[] {
  const ordered: string[] = [];
  let next: string | undefined = steps.find(s => s.kind === 'start')?.id;
  while (next && !ordered.includes(next)) {
    ordered.push(next);
    next = links.find(l => l.source === next)?.target;
  }
  for (const s of steps) if (!ordered.includes(s.id)) ordered.push(s.id);
  return steps.map(step => {
    const index = ordered.indexOf(step.id);
    const row = Math.floor(index / 3);
    const column = row % 2 === 0 ? index % 3 : 2 - index % 3;
    return { ...step, position: { x: column * 260 + 25, y: row * 145 + 25 } };
  });
}
