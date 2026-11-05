import { useCallback, useLayoutEffect, useRef } from 'react';

/** A stable event handler, with current project state after each commit. */
export function useEventCallback<Args extends unknown[], Result>(handler: (...args: Args) => Result) {
  const current = useRef(handler);
  useLayoutEffect(() => { current.current = handler; });
  return useCallback((...args: Args) => current.current(...args), []);
}
