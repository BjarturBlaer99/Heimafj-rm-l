export function DataSectionLoading({ label, chart = false }: { label: string; chart?: boolean }) {
  return (
    <section role="status" aria-label={label} aria-busy="true" className="min-w-0">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="mb-4 h-6 w-40 rounded-md bg-line/10" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="min-h-[180px] rounded-lg border border-line/10 bg-surface p-5">
              <div className="h-4 w-24 rounded bg-line/10" />
              <div className="mt-6 h-8 w-28 rounded bg-line/10" />
              <div className="mt-5 h-10 rounded bg-line/5" />
            </div>
          ))}
        </div>
        {chart ? <div className="mt-4 h-64 rounded-lg border border-line/10 bg-surface" /> : null}
      </div>
    </section>
  );
}
