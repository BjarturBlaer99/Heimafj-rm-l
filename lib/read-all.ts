type ReadResult<T> = { data: T[] | null; error: { message: string } | null };

// PostgREST caps a response at 1,000 rows. Totals and exports must include every page.
export async function readAllPages<T>(read: (from: number, to: number) => PromiseLike<ReadResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const result = await read(from, from + size - 1);
    if (result.error) throw new Error("Ekki tókst að sækja gögn.");
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < size) return rows;
  }
}
