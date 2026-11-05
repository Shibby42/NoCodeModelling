import type { Node } from '@xyflow/react';

function shallowEqual(left: Record<string, unknown>, right: Record<string, unknown>) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.is(left[key], right[key]));
}

/** Keep React Flow's measured sizes and node identities across metadata updates. */
export function synchronizeGraphNodes<T extends Node>(current: T[], desired: T[]): T[] {
  const byId = new Map(current.map(node => [node.id, node]));
  const next = desired.map(node => {
    const previous = byId.get(node.id);
    if (!previous) return node;
    const samePosition = previous.position.x === node.position.x && previous.position.y === node.position.y;
    if (previous.type === node.type && previous.selected === node.selected && previous.connectable === node.connectable
      && previous.dragHandle === node.dragHandle && samePosition && shallowEqual(previous.data, node.data)) return previous;
    return { ...previous, ...node, measured: previous.measured };
  });
  return next.length === current.length && next.every((node, index) => node === current[index]) ? current : next;
}
