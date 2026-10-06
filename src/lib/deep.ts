import { useSyncExternalStore } from 'react';
import { deepCuts } from '../data/deep';

/* Which deep cuts this visitor has found. Remembered in their own browser only;
 * if storage is blocked (private windows, strict settings) the hunt still works
 * for the visit, it just starts fresh next time. */

const KEY = 'tensorman:deep-cuts';
const known = new Set(deepCuts.map((c) => c.id));

function read(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string' && known.has(id)) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable — keep going in memory
  }
}

let found: readonly string[] = read();
const listeners = new Set<() => void>();
const discoverListeners = new Set<(id: string) => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Every cut found so far, in the order it was found. */
export function useDeepCuts(): readonly string[] {
  return useSyncExternalStore(subscribe, () => found, () => found);
}

export const isFound = (id: string) => found.includes(id);

/**
 * Mark a cut as found. Returns true the first time only, so callers can play a
 * one-off reveal; the "deep cut found" notice is shown by the toast, not here.
 */
export function discover(id: string): boolean {
  if (!known.has(id) || found.includes(id)) return false;
  found = [...found, id];
  write([...found]);
  listeners.forEach((fn) => fn());
  discoverListeners.forEach((fn) => fn(id));
  return true;
}

/** Listen for first-time discoveries (the toast uses this). */
export function onDiscover(fn: (id: string) => void) {
  discoverListeners.add(fn);
  return () => {
    discoverListeners.delete(fn);
  };
}

/* The liner notes live in one dialog at the root; anything can ask to open it. */
let openNotes: ((focusId?: string) => void) | null = null;

export function registerLinerNotes(fn: ((focusId?: string) => void) | null) {
  openNotes = fn;
}

export function openLinerNotes(focusId?: string) {
  openNotes?.(focusId);
}
