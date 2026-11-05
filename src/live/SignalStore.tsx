import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { LiveState } from '../adapters/live';
import type { SignalValue } from '../core/types';

export interface SignalSnapshot { value?: SignalValue; error?: string; stale: boolean }
const emptySnapshot: SignalSnapshot = Object.freeze({ stale: true });
const emptyValues: LiveState['values'] = {};
const emptyErrors: LiveState['errors'] = {};

/** Telemetry is deliberately outside React Flow's controlled geometry state. */
export class SignalStore {
  private values = emptyValues;
  private errors = emptyErrors;
  private stale = true;
  private snapshots = new Map<string, SignalSnapshot>();
  private listeners = new Map<string, Set<() => void>>();

  getSnapshot(id: string): SignalSnapshot {
    const cached = this.snapshots.get(id);
    if (cached) return cached;
    const snapshot = { value: this.values[id], error: this.errors[id], stale: this.stale };
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  subscribe(id: string, listener: () => void) {
    const listeners = this.listeners.get(id) ?? new Set();
    listeners.add(listener);
    this.listeners.set(id, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(id);
    };
  }

  publish(state: Pick<LiveState, 'values' | 'errors' | 'stale' | 'connected'>) {
    this.values = state.connected ? state.values : emptyValues;
    this.errors = state.errors;
    this.stale = !state.connected || state.stale;
    const changed: string[] = [];
    for (const [id, old] of this.snapshots) {
      if (Object.is(old.value, this.values[id]) && old.error === this.errors[id] && old.stale === this.stale) continue;
      this.snapshots.set(id, { value: this.values[id], error: this.errors[id], stale: this.stale });
      changed.push(id);
    }
    for (const id of changed) this.listeners.get(id)?.forEach(listener => listener());
  }
}

const fallbackStore = new SignalStore();
export const SignalStoreContext = createContext(fallbackStore);

export function useSignalSnapshot(id: string) {
  const store = useContext(SignalStoreContext);
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [store, id]);
  const getSnapshot = useCallback(() => store.getSnapshot(id), [store, id]);
  return useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);
}
