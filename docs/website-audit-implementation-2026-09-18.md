# Website audit implementation

Implemented locally on 18 September 2026. No production deployment or production data changes.

## Delivered

- Unavailable financial reads no longer become ordinary zero totals or empty accounts. Failed savings/bill sections offer retry; other failed reads use the route error boundary.
- Month, custom range and all-period controls are explicit. A range no longer intersects an implicit current month. Income/expense navigation retains its month; dashboard transaction links identify a single record.
- ISK is the supported currency throughout. Settings cannot relabel existing amounts as another currency.
- Transactions have one open editor per record and bulk category changes, with ownership and category-type checks. Linked bill expenses cannot have their amounts, dates or types changed without unlinking first.
- Imports review all eligible rows through pagination, expose excluded-row reasons, allow individual category corrections, and require a deliberate choice for possible duplicates. Mapping presets and merchant rules are scoped to the signed-in user on the current device and can be cleared. Submission uses atomic writes and repeatable batch IDs for safe retries.
- Bills can link an existing expense or explicitly create one with the actual payment date. Unlinking preserves the expense. Selected prior-month bills can be copied without copying payments or duplicating a series in a month.
- Savings history is fully paginated; latest contributions are queried independently per bucket. Dated goals show the required monthly contribution with current-month and no-growth assumptions.
- Demo and signed-in dashboard share their presentation. Demo financial content does not await market/property sources. The open first-month checklist follows the main financial overview.
- Help and data-handling pages are linked from public/app navigation. Settings offers CSV transaction export, JSON account-data export, and a persisted, cancellable account-deletion request.
- Open sections, scroll fade-ins and reduced-motion behavior are retained.

## Validation

- Production build including TypeScript: passed.
- Full application ESLint: passed.
- Integrated Node regression suite: **138 tests passed**, covering data failures/pagination, authentication, date ranges, imports, category editing, bills, savings and account controls, including a complete 1,000-row import and uncertain-response retries.
- Actual PostgreSQL 17.10 integration suite: **33 checks passed** with separate concurrent connections, real schema/RLS/triggers, migration replay, account cascades and atomic savings. Supabase Auth claims were represented by a local stub; no live project was accessed.
- Browser checks used an isolated local backend with synthetic data only.
- Verified August custom-date results while the previously selected month was September.
- Reviewed both pages of a 30-expense import, changed an individual category, saved it, and confirmed 30 inserted records with two excluded source rows.
- Linked a pre-existing bill expense: payment count increased while transaction count stayed unchanged.
- Confirmed CSV download feedback and persisted/cancelled deletion requests without deleting an account.
- Verified complete savings history across two pages, older latest entries for unaffected buckets, and a dated goal's monthly arithmetic.
- Checked mobile layouts at 320- and 390-pixel browser viewport settings; no horizontal overflow in checked transactions/import, bills, savings and settings views. This was not a real iPhone Safari test.
- The production build was also run locally against the synthetic backend. Sustained transaction-read failure showed the unavailable-data screen rather than zero balances; clearing the failure and clicking Retry restored the correct totals.
- Checked every main authenticated route at a 390-pixel viewport. Transactions, bills, savings, settings and real estate also passed 320-pixel layout/date-field checks. These are Chromium viewport checks, not actual iPhone Safari execution.
- Simulated a lost savings response after the write committed. The form locked the original values, retained its request ID and retried successfully. The backend still had exactly one contribution and one balance increment; the cached dashboard showed the updated total immediately. Test writes were removed afterward.
- Invalid login feedback and successful login were checked in the production build. Production CSP excludes `unsafe-eval`; no required-app CSP violation appeared during these checks. Intentional failure-injection errors were expected in logs. Production navigation latency and live-provider uptime were not benchmarked.
- Confirmed the public demo shows the shared dashboard. Test writes were cleaned up from the disposable fixture afterward.

## Before production

1. Apply both `supabase/bill-payment-integrity-update.sql` and `supabase/savings-contribution-integrity-update.sql` to the intended Supabase project before deploying the new actions. They passed the isolated PostgreSQL suite but have not been applied to staging/production. See `docs/bill-payment-deployment.md`; duplicate/inconsistent legacy links deliberately stop the migration for review.
2. Configure a verified `SUPPORT_EMAIL` when supplied and assign the operator process described in `docs/account-data-operations.md`. Deletion requests are stored in Auth metadata; they require manual processing and do not send notifications or delete accounts automatically. No support address was invented.
3. Verify the actual hosting/Auth environment and promote the reviewed candidate using `docs/production-release-checklist.md`. No live deployment or production migration was performed in this readiness pass.

## Readiness fixes

- Closed a normalized-URL open redirect in the authentication callback and preserved expired-session cookie cleanup on API failures.
- Normalized editable deletion-request metadata, preventing malformed metadata from blocking a new valid request.
- Imports now verify persisted row contents during retries and reject conflicting edits, validate numeric precision/limits, and invalidate all affected cached pages.
- Savings contributions now use one transactional, ownership-scoped RPC for history and balance, with a stable request UUID and explicit retry UI after an uncertain response. Concurrent additions cannot overwrite one another.
- Protected linked bill month/owner as well as its expense, and added a transactional preflight for inconsistent historical links.
- Successful finance mutations invalidate shared layouts so navigation does not return stale totals.
- Full lint, separate TypeScript check and optimized build passed. Both dependency audits reported zero known vulnerabilities in the checked lockfile.

Full import-batch undo, persistent transaction review status and automatic recurring schedules remain separate enhancements, as described in the audit. The current implementation provides explicit import review, retry-safe writes and reviewed monthly bill copying.
