# Bill linking and savings deployment prerequisites

Apply these two migrations to the intended Supabase project **before** deploying the new web actions:

1. `supabase/bill-payment-integrity-update.sql`
2. `supabase/savings-contribution-integrity-update.sql`

Both are transactional and safe to rerun. Fresh installations include identical definitions at the end of `supabase/schema.sql`; do not run the entire fresh-install schema against an existing project. Confirm the target project and a recoverable database backup before applying migrations through the project's normal migration process or Supabase SQL editor.

Use `supabase/production-readiness-check.sql` before and after applying them. The artifact is explicitly read-only and reports missing tables/columns, RLS policies, conflict indexes, function permissions, installed triggers, and legacy duplicate/mismatch counts. Before migration, prerequisite checks must pass and installation checks may fail. After migration, every check must pass and both legacy issue counts must be zero. It reports historical unlinked payments without blocking them. SQL clients that show only one result set should execute each commented SELECT block separately and inspect the legacy-check NOTICE output.

For older databases, inspect the prerequisites before choosing an upgrade: base schema (`auth.users`, `auth.uid()`, `transactions`, and `set_updated_at()`), then `bills-update.sql` for monthly bills; `savings-buckets-update.sql` for bucket types/balances, then `savings-bucket-entries-update.sql` for history. Apply only missing baseline migrations before the two integrity migrations. `savings-buckets-update.sql` contains unconditional type/trigger/policy creation and must not be blindly rerun against an existing bucket schema.

## Bill integrity

Each expense can link to at most one bill payment. Triggers verify matching owner, amount, payment date, and bill month. While linked, an expense's amount/date/type/owner cannot change and it cannot be deleted. A linked bill's month/owner cannot change. Descriptive fields, including expense notes and bill names, remain editable. Locks on both the expense and the bill serialize linking against competing edits; application checks and deterministic payment IDs are additional protection, not a substitute for these database constraints.

The migration briefly blocks writes while auditing existing links and installing constraints; reads continue. Its 10-second lock timeout aborts the entire transaction if busy traffic prevents acquiring the locks. Retry during a quieter period; do not remove the timeout to leave production writes waiting indefinitely.

The migration stops without changing data if an expense is linked more than once, or if a linked payment differs from its expense or bill. Review and deliberately unlink incorrect payment records while preserving the expense, then rerun. It never silently rewrites financial history. Historical payments whose expense link was already null are preserved; new payments must link a valid expense.

To identify records requiring review before deployment, run these read-only queries in the intended database:

```sql
select transaction_id, count(*) as payment_count
from public.bill_payments
where transaction_id is not null
group by transaction_id
having count(*) > 1;

select p.id as payment_id, p.transaction_id, p.bill_id
from public.bill_payments p
join public.transactions t on t.id = p.transaction_id
join public.bills b on b.id = p.bill_id
where p.user_id <> t.user_id or t.type <> 'expense'
   or p.amount <> t.amount or p.paid_at <> t.date
   or p.user_id <> b.user_id or p.month <> b.month;
```

Unlinking preserves the expense. To delete an expense, first unlink it from its bill and review it separately. Operator account deletion through `auth.users` remains supported: foreign-key cascades delete that account's records, while ordinary expense deletion still requires unlinking. This path was exercised in real PostgreSQL, including preservation of a second account's data.

## Atomic savings contributions

The authenticated `add_savings_bucket_contribution` RPC inserts history and increments the current savings balance in one transaction. It derives ownership from `auth.uid()`, runs as the caller with row-level security, and grants no anonymous execution. It does not add a service-role key or bypass ownership policies.

The migrations explicitly revoke access from `anon`, and revoke client access to the internal trigger and signup-seeding functions. The privileged signup trigger can still create initial categories and savings buckets; clients cannot call seeding helpers with another account's UUID. This also handles Supabase's default function grants: removing `PUBLIC` access alone does not remove a role's independent grant. The local integration suite models these defaults. See [Supabase function permissions](https://supabase.com/docs/guides/database/functions).

The client sends a request UUID retained across retries. Repeating the same UUID and payload returns the existing entry without incrementing again; reusing it with different details is rejected. Concurrent independent contributions both increment the locked current balance. A history failure, invalid input, or balance overflow rolls the entire operation back.

Its SQL signature is:

```sql
public.add_savings_bucket_contribution(
  p_request_id uuid,
  p_bucket_type public.savings_bucket_type,
  p_amount numeric,
  p_date date,
  p_note text default null,
  p_label text default null
)
-- returns table(entry_id uuid, balance numeric, already_recorded boolean)
```

## Reproduce the database verification

The dedicated integration runner uses a disposable, actual PostgreSQL server on `127.0.0.1`, with synthetic data and separate concurrent connections. It does not read application environment files, accept a remote database URL, or connect to Supabase. The Supabase `auth.users` table and `auth.uid()` claim function are represented locally; the actual application schema, RLS policies, functions and migrations execute in PostgreSQL.

Install the pinned test tools separately from the application (PowerShell):

```powershell
npm install --prefix "$env:TEMP\finance-postgres-test-tools-20260918" --no-save --no-package-lock embedded-postgres@17.10.0-beta.17 pg@8.16.3
npm run test:database -- "--tools-dir=$env:TEMP\finance-postgres-test-tools-20260918"
```

The runner creates a unique temporary database directory, chooses an available loopback port, and stops/removes its cluster on completion. These tools are not runtime dependencies and do not enter the production bundle. PostgreSQL process creation requires permission in restricted execution environments.

On 2026-09-18, **33 checks passed on PostgreSQL 17.10 (Windows x64)**. Coverage includes the read-only preflight before/after installation, both migration replays, the complete fresh schema, legacy duplicate/mismatch rollback, preserved unlinked history, RLS ownership, explicit function grants, protected signup helpers, unlinking, account deletion, bill and expense edit/link races in both orderings, competing links, atomic savings success/failure, concurrent additions, and idempotent retries. Concurrency tests verify a real PostgreSQL lock wait before releasing the competing transaction rather than assuming timing from a fixed sleep.

These checks validate the repository SQL and application assumptions. They do not confirm the schema, PostgreSQL version, permissions, backups or legacy records of a live Supabase project. **No production migration or production financial write was performed.** After applying both migrations, verify their presence and run the normal application smoke checks using an isolated test account before publishing broadly. Keep the integrity constraints when rolling back application code; removing protections can reintroduce duplicate links or inconsistent savings updates.
