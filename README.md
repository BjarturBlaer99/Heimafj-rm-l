# Mín fjármál

An Icelandic personal finance website built with Next.js App Router, TypeScript, Supabase Auth/Postgres, React and Recharts. The public homepage explains the product; `/demo` uses sample financial records and shares the authenticated dashboard presentation.

## Product scope

- Email/password signup, login, password recovery and protected account pages.
- Monthly income/expense summaries, transaction search, date filters and bulk categorization.
- Manual entry and reviewed CSV/Excel **expense** imports, with optional device-local column presets and description rules.
- Monthly bills, links to existing expense records, and deliberate copying into another month.
- Savings buckets, contribution history and goals with monthly contribution estimates.
- Public inflation, policy-rate, FX and property data, plus attributed TradingView embeds.
- Light/dark appearance, visible onboarding steps, action feedback, account exports and cancellable deletion requests.

Amounts are in ISK. There is no automatic bank connection or currency conversion. A deletion request records intent for an operator; it does not erase the account automatically. The current website has no paid-subscription checkout. The separate `mobile/` project is outside these web checks and this release procedure.

## Local development

Use Node.js 22 LTS and the committed lockfile. Install from the repository root:

```bash
npm ci
```

Create `.env.development.local` using [`.env.example`](.env.example), with a **development** Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-development-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-development-publishable-key"
NEXT_PUBLIC_SITE_URL="http://localhost:5173"
SUPPORT_EMAIL=
```

The local environment file is ignored by Git. `SUPPORT_EMAIL` optionally overrides the operator-confirmed support address in `lib/privacy-config.ts`; use only a monitored address. Do not place a Supabase secret/service-role key in any `NEXT_PUBLIC_` variable. Browser clients use only the publishable key and signed-in user session.

### Privacy and public registration

Website signup is closed by default. Complete [the privacy launch review](docs/privacy-launch-readiness.md) before filling in the verified `PRIVACY_*` disclosure settings from `.env.example` and setting `PUBLIC_REGISTRATION_ENABLED=true`. `npm run check:privacy` checks the current process environment and reports missing fields; it does not certify compliance. Disable new signups in Supabase Auth as well while closed: the application gate cannot block direct requests to the provider API or older deployments. Existing-account login and the synthetic demo remain available.

Savings display order, housing membership and goal membership are stored per account in Auth metadata. They do not change balances and are included in JSON exports. The new `supabase/owner-reference-integrity-update.sql` migration separately enforces owner-matched category/goal references; apply it after existing bill/savings migrations in staging before production. `npm run test:database:ownership` runs the isolated PostgreSQL acceptance suite (see script prerequisites).

```bash
npm run dev
```

Development defaults to `http://localhost:5173`. If using another port, update the development site URL and Supabase redirect allowlist to match.

## Checks

```bash
npm run lint
npm test
npm run build
npm run typecheck
npm run audit:production
```

`npm test` / `npm run test:unit` runs an explicit list of non-browser Node test files. It covers authentication, data isolation and paging, periods/filters, transaction and import actions, feedback, bills/savings, exports/deletion requests, and market provider failure/recovery. The tests use synthetic records and mocked service boundaries; they do not require a Supabase project or mutate real accounts. The bill tests do not execute PostgreSQL triggers: database acceptance is a separate release gate.

`npm run test:database -- --tools-dir=/path/to/isolated-postgres-tools` runs the separate real-PostgreSQL integration suite against an automatically created local database. It requires the isolated test tools described in [bill payment deployment requirements](docs/bill-payment-deployment.md). It does not read the application's environment files or accept a remote database URL; it is intentionally separate from the unit runner, which uses the normal project dependencies.

The explicit list deliberately excludes the legacy browser scripts, including `responsive-panels.test.cjs`. Those files rely on browser packages, fixture servers and sometimes machine-specific paths; a broad `scripts/*.test.cjs` command is not the web unit suite. Perform browser acceptance through the approved computer-use workflow against an isolated preview with synthetic accounts.

`next build` uses webpack and includes Next.js/TypeScript validation. Lint remains a separate check. Run standalone `typecheck` after build so generated `.next/types` are present, and avoid rebuilding or restarting Next.js in the same directory during that check. `npm audit` additionally checks the full development dependency tree. An audit result covers known advisories at the time it runs, not application or database correctness.

## Supabase setup

For a **new empty development database**, enable the Email Auth provider and run [`supabase/schema.sql`](supabase/schema.sql). The schema includes the current application tables, owner policies and bill-payment integrity definitions. Do not rerun the fresh schema against an existing populated database.

Existing databases need only the updates missing from their migration history. Review and test the relevant SQL against a disposable database before production:

| Update | Purpose |
| --- | --- |
| [`savings-buckets-update.sql`](supabase/savings-buckets-update.sql) | Older installations without savings buckets; contains one-time enum/trigger creation. |
| [`savings-bucket-entries-update.sql`](supabase/savings-bucket-entries-update.sql) | Savings contribution history and its owner policies. |
| [`bills-update.sql`](supabase/bills-update.sql) | Monthly bill records and preservation of paid history. |
| [`bill-payment-integrity-update.sql`](supabase/bill-payment-integrity-update.sql) | Required integrity protection for linking expenses to bills. |
| [`savings-contribution-integrity-update.sql`](supabase/savings-contribution-integrity-update.sql) | Required atomic, retry-safe savings contribution RPC used by current application actions. |
| [`icelandic-update.sql`](supabase/icelandic-update.sql) | Legacy English defaults/ISK profile labels; does not convert financial amounts. |

Do not blindly run all updates: some include one-time definitions or legacy data changes. Record which updates have been applied. The current application requires both bill-payment integrity and the savings contribution RPC before promotion. See [bill payment deployment requirements](docs/bill-payment-deployment.md) for duplicate-link handling, concurrency and account-erasure checks. Application mocks are not proof that RLS and SQL triggers are installed correctly.

## Environments and release

The repository is already connected to Git and Vercel. Review the current remote, branch and deployment target before publishing; do not initialize another repository. A code push may trigger a Vercel deployment, depending on the configured branch.

| Variable | Production | Preview / local development |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production project URL | Separate development project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production publishable key | Development publishable key |
| `NEXT_PUBLIC_SITE_URL` | Exact production origin | Preview: unset to use `VERCEL_URL`; local: matching localhost origin |
| `SUPPORT_EMAIL` | Verified monitored address, if available | Intended test/support address or unset |

Configure Supabase Auth URL settings separately for both projects. Production's Site URL and allowed redirects must match the production origin. Development must allow the chosen localhost origin and intended Vercel Preview origins. Keep Preview access appropriately restricted; never point it at the production database to make a test pass.

Vercel settings are Next.js, install `npm ci`, build `npm run build`, with a Node.js version matching local verification. Use the [production release checklist](docs/production-release-checklist.md) before promotion. That checklist records database, application, browser and operational evidence; documentation alone does not authorize a deployment or a live database change.

Account exports, support and the manual deletion-request workflow are described in [account data operations](docs/account-data-operations.md). Configure an operator review cadence: there is no request notification email or background queue.

## Rendering and external data

Navigation retains the app shell while route data streams. Links prefetch on intent; browser route entries have a 30-second stale time. Server actions invalidate affected pages. Authentication changes and returning to a tab refresh user-facing data. Personal-data loaders use React's request cache rather than a persistent cache shared across accounts.

Public provider data loads separately from private dashboard data. Inflation, policy-rate and FX failures produce an unavailable state instead of invented values. Policy rates try IS-Macro and then the Central Bank of Iceland; successful snapshots are cached for one hour. Stocks/ETFs use TradingView embeds without a stock API key. Preserve their visible attribution.

The interface uses shared light/dark tokens, a desktop sidebar and mobile navigation. Sections stay open while scrolling. Visible content has a CSS entrance; offscreen sections use `ScrollReveals` to fade in on intersection. Keyboard focus and anchor navigation reveal their targets immediately. Reduced-motion preferences disable entrance animation, and content remains available if animation APIs are absent.

The Next.js proxy verifies signed sessions using Supabase's public-key cache, with remote validation for legacy signing keys. Private server reads and mutations still verify the current user. Header policy and RLS complement these checks; review them and their installed database state when changing authentication or ownership behavior.
