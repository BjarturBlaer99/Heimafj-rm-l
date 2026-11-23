import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { subscribeFinanceChanges } from '@/lib/finance-events';

type DataState<T> = {
  loader: () => Promise<T>;
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

export function useRefreshableData<T>(loader: () => Promise<T>) {
  const mounted = useRef(true);
  const focused = useRef(false);
  const generation = useRef(0);
  const [state, setState] = useState<DataState<T>>({ loader, data: null, error: null, loading: true, refreshing: false });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; };
  }, []);

  const run = useCallback(async (refresh = false) => {
    if (!mounted.current) return;
    const request = ++generation.current;
    setState((previous) => ({ loader, data: previous.loader === loader ? previous.data : null, error: null, loading: !refresh, refreshing: refresh }));
    try {
      const data = await loader();
      if (mounted.current && request === generation.current) setState({ loader, data, error: null, loading: false, refreshing: false });
    } catch (error) {
      if (mounted.current && request === generation.current) setState((previous) => ({
        ...previous, error: error instanceof Error ? error.message : 'Ekki tókst að uppfæra gögn. Reyndu aftur.', loading: false, refreshing: false,
      }));
    }
  }, [loader]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void run();
    return () => { focused.current = false; generation.current += 1; };
  }, [run]));

  useEffect(() => {
    let previousState = AppState.currentState;
    const appState = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && previousState !== 'active' && focused.current) void run(true);
      previousState = nextState;
    });
    const unsubscribe = subscribeFinanceChanges(() => {
      if (focused.current) void run(true);
    });
    return () => { appState.remove(); unsubscribe(); };
  }, [run]);

  // A changed account/filter loader must never render its predecessor's data,
  // even in the render before the new focus effect starts its request.
  const current = state.loader === loader ? state : { data: null, error: null, loading: true, refreshing: false };
  return {
    data: current.data, error: current.error, loading: current.loading, refreshing: current.refreshing,
    refresh: useCallback(() => run(true), [run]), retry: useCallback(() => run(false), [run]),
  };
}
