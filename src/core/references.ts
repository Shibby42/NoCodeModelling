import type { ModelCatalog, Project, SignalDefinition } from './types';

/** Reference ports can be inspected in the diagram without becoming commands. */
export function getSignalDropAction(signal: SignalDefinition) {
  if (signal.type === 'Unsupported' || signal.readable === false) return 'reference' as const;
  return signal.direction?.includes('OUT') || !signal.writable ? 'wait' as const : 'set' as const;
}

export function insertPortReference(project: Project, catalog: ModelCatalog, signalId: string, position: { x: number; y: number }, id = crypto.randomUUID()): Project {
  if (!catalog.signals.some(signal => signal.id === signalId)) throw new Error('Der Port ist nicht im geladenen Modell enthalten.');
  return { ...project, portReferences: [...(project.portReferences ?? []), { id, signalId, position: { ...position } }] };
}
