import { useCallback, useEffect, useRef, useState } from 'react';

export function useFormAction() {
  const lock = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async (action: () => Promise<void>) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : 'Ekki tókst að vista. Reyndu aftur.');
      return false;
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  return { busy, error, clearError: useCallback(() => setError(null), []), run };
}
