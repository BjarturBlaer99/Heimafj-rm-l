export default function ProtectedLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Opna síðu" className="space-y-5">
      <span className="sr-only">Opna síðu…</span>
      <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
        <div className="space-y-3 py-1">
          <div className="h-8 w-40 rounded-md bg-line/10" />
          <div className="h-4 w-64 max-w-full rounded bg-line/10" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-4 rounded-lg border border-line/10 bg-surface p-4 sm:p-5">
              <div className="h-3 w-20 max-w-full rounded bg-line/10" />
              <div className="h-7 w-28 max-w-full rounded bg-line/10" />
              <div className="h-3 w-16 rounded bg-line/10" />
            </div>
          ))}
        </div>
        <div className="h-72 rounded-lg border border-line/10 bg-surface p-5">
          <div className="h-5 w-36 rounded bg-line/10" />
          <div className="mt-8 space-y-5">
            {[0, 1, 2, 3].map((index) => <div key={index} className="h-4 rounded bg-line/10" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
