# Mín fjármál — infrastructure and data reference

Prepared **23 November 2026**, Atlantic/Reykjavik. This is a source-backed inventory, not a fresh audit of live services. Local Git identifiers and key configuration files were reread on that date. Release outcomes below are dated historical records. No credentials, session tokens, private recovery links or financial datasets are included.

Read [CLAUDE.md](CLAUDE.md) for permanent safety/development rules, [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for business logic and [HANDOFF.md](HANDOFF.md) for pending work and verification history.

## 1. System boundaries

```text
Web browser
  -> Next.js App Router on Vercel
     -> server components / actions / route handlers
        -> Supabase Auth + PostgREST/Postgres (user session, RLS)
        -> public economic-data providers (separate public caching)
  -> optional TradingView iframe after user choice

iPhone / Expo Go
  -> separate Expo Router / React Native app in mobile/
     -> Supabase Auth + PostgREST/RPC (native session, RLS)
     -> SecureStore session storage; native share sheet for JSON export

GitHub -> existing Vercel project for web releases
Local Expo development server/tunnel -> phone preview only
```

There is no current Prisma/SQLite data store, Vite web runtime, general-purpose separate API server, or established Supabase Edge Functions deployment. The historical prototype request does not override the present manifests. Web and native have separate code, dependencies, lockfiles and release processes. A Vercel web deployment does not ship the phone app.

## 2. Repository and hosting identities

| Item | Verified local configuration or historical record |
| --- | --- |
| Working directory at handoff | `C:\Users\bjarturbg\OneDrive - Public Administration\Meetings\Desktop\Finance app` |
| Git origin | `https://github.com/BjarturBlaer99/Heimafj-rm-l.git` |
| Handoff branch | `codex/ios-app-handoff`, tracking `origin/codex/ios-app-handoff` |
| Native source commit | `1963654`, 23 November 2026, “Add Expo SDK 58 iPhone app and regression tests”; documentation follows on the same branch |
| Web baseline | Branch created from `cca0eec`, 9 October, “Label the demo dashboard as sample data”; remote `codex/web-release-2026-09-18` matched that baseline on 23 November |
| Web production origin | `https://minfjarmal.vercel.app` in source and release records; current deployment not rechecked |
| Vercel project | `supabase-personal-finance` |
| Vercel project ID | `prj_jEnELVbtwTa7aorc05pEwI4KHjdD` |
| Vercel org ID | `team_modQQF1qyY38ZdQc7cBiuGY8` |
| Production Supabase ref | `gtgqxgddlqcvspegvxzt` |
| Development Supabase ref | `bqpmkvgpedtasrbxtirs` |
| Native scheme / app IDs | `minfjarmal`; iOS bundle and Android package `is.minfjarmal.app` |
| Native Expo slug | `min-fjarmal-mobile` |
| Desired custom domain | `minfjarmal.is`, deferred; no verified purchase or DNS configuration |

The Vercel IDs come from local `.vercel/project.json`; they are identifiers, not credentials. GitHub permissions, repository visibility, remote tip, branch protection, CI settings and the current production branch mapping were not retrieved live. Earlier releases used `main` and/or candidate promotion; inspect current wiring before a push.

**GitHub transfer completed:** before this follow-up, `mobile/` was untracked. On 23 November, 93 native files were committed as `1963654` and pushed to [codex/ios-app-handoff](https://github.com/BjarturBlaer99/Heimafj-rm-l/tree/codex/ios-app-handoff). This includes source, generated app icons, tests, native lockfile, example environment and relevant notes. It has not been merged into `main`; use the handoff branch explicitly. Other local web changes/artifacts were not bundled into the app commit.

For a new directory on another machine:

```bash
git clone --branch codex/ios-app-handoff https://github.com/BjarturBlaer99/Heimafj-rm-l.git
cd Heimafj-rm-l/mobile
npm ci
```

Then create `mobile/.env.local` from `mobile/.env.example` using the development project, and follow mobile/README.md. For an existing clone, preserve local changes, fetch the branch and switch to it. `.env.local`, `.expo`, dependencies, logs and private screenshots are excluded; ignored SDK backups and old preview artifacts do not transfer. No secrets were added to the app commit. Starting Expo or restoring local configuration is separate from cloning source.

## 3. Source layout and runtime

| Path | Responsibility |
| --- | --- |
| `app/` | Next App Router pages, layouts, route handlers, global styling and error/loading boundaries |
| `app/(app)/` | Authenticated financial pages and persistent app layout |
| `app/(auth)/` | Login, signup, forgot-password and reset-password pages |
| `app/auth/callback/route.ts` | Web email/callback completion |
| `app/api/data/export/route.ts` | Authenticated account download endpoint |
| `components/` | Shared shell, navigation, forms, ledger, import, charts, feedback and savings UI |
| `lib/` | Server actions, account/data loaders, validation, formatting, financial rules, public provider loaders |
| `lib/supabase/` | Browser/server clients, environment guard, session middleware |
| `proxy.ts` | Next request boundary using the Supabase middleware |
| `supabase/` | Fresh schema, existing-installation SQL updates, verification SQL and email templates |
| `scripts/` | Explicit web unit runner inputs, isolated PostgreSQL tests and older browser tools |
| `docs/` | Design, release, privacy, operations and dated QA evidence |
| `mobile/` | Independent Expo project, app routes, providers/components, libraries, tests, assets and docs |

Root [package.json](package.json) specifies Node **22.x**, Next **16.3.4**, React **^19.0.0**, TypeScript **^5.7.2**, Tailwind **^3.4.17**, Supabase SSR **^0.5.2**, Supabase JS **^2.48.1**, Phosphor, Recharts, Motion, Zod, Radix primitives and date-fns. Ranges are manifest requirements; use [package-lock.json](package-lock.json) for exact installed resolutions. Strict TypeScript uses root `@/` imports; native and legacy source trees are excluded from the web typecheck.

Public web routes include `/`, `/demo`, `/help`, `/privacy` and the four auth pages. Private routes include `/dashboard`, `/monthly-overview`, `/income`, `/expenses`, `/budgets`, `/bills`, `/savings-goals`, `/transactions`, `/transactions/category/[id]`, `/analytics`, `/markets`, `/real-estate`, `/settings` and `/import`. Icelandic aliases temporarily redirect to their canonical English routes; see [next.config.ts](next.config.ts). Do not duplicate page implementations for aliases.

### Data loading, navigation and security headers

Personal loaders use request-scoped React caching, ownership checks and the signed-in Supabase context. Shared `unstable_cache` is used for public indicators, not a global cache of account records. Navigation uses the persistent shell, intent prefetch, return refresh and short browser router reuse. `next.config.ts` currently configures dynamic/static stale times of 30 seconds. Actions invalidate affected data/layouts; keep invalidation when adding caching.

The request middleware validates claims, maintains refreshed cookies and protects private routes; server boundaries still verify the user. Remote user verification is used where needed for auth entry/revocation handling. Auth failures for data endpoints must return appropriate private errors rather than leaking another account's content. See [lib/supabase/middleware.ts](lib/supabase/middleware.ts), [lib/supabase/server.ts](lib/supabase/server.ts) and [lib/data.ts](lib/data.ts).

Configured headers include `nosniff`, `DENY`, strict-origin referrer policy, restricted device permissions and CSP. Production excludes `unsafe-eval`, but the current policy still allows inline scripts/styles: it is not a fully nonce-based policy. Supabase connections and TradingView origins are explicitly accommodated. Auth callback responses add `no-referrer` and `private, no-store`. Server-action body limit is 4 MB. Account export implements its own private/no-store behavior.

## 4. Environment variables and separation

Use [.env.example](.env.example) and [mobile/.env.example](mobile/.env.example). Actual secret/local files were not copied into this package.

| Variable | Use / handling |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Web Supabase project URL; select the correct environment |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web publishable/anon key; never a secret/service-role key |
| `NEXT_PUBLIC_SITE_URL` | Canonical web origin for links and redirects; local example is `http://localhost:5173` |
| `SUPPORT_EMAIL` | Optional support override; does not replace the fixed privacy-controller identity |
| `PUBLIC_REGISTRATION_ENABLED` | Exact `true` opens the website signup gate; default example is false |
| `PRIVACY_DATA_LOCATION` | Verified public description of processing/storage location |
| `PRIVACY_TRANSFER_SAFEGUARDS` | Verified public transfer safeguards description |
| `PRIVACY_BACKUP_RETENTION` | Verified backup retention description |
| `PRIVACY_LOG_RETENTION` | Verified log retention description |
| `PRIVACY_SUPPORT_RETENTION` | Verified support correspondence retention description |
| `EXPO_PUBLIC_SUPABASE_URL` | Native environment's Supabase URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Native publishable/anon key |

The five privacy fields are public facts, not credentials or controls that configure provider retention. Do not fill them with guessed values to make a preflight pass. Website registration and Supabase Auth's signup setting are separate controls; changing only the website cannot block direct provider API requests.

Root README recommends `.env.development.local`; native uses `mobile/.env.local`. `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are exposed to clients. No privileged database key belongs there. Transfer credentials separately through the owner's secure process, not in Markdown, screenshots, source control or a public archive.

[lib/supabase/config.ts](lib/supabase/config.ts) guards the production project ref: Vercel production must use production; Vercel preview or `NODE_ENV=development` must not. This is a code-level guard, not proof of live values. A local production-mode process without `VERCEL_ENV` does not satisfy either nonproduction condition automatically: explicitly verify its database before tests. Native development uses the separate development project, whose availability must also be checked.

Vercel provides `VERCEL_ENV` and `VERCEL_URL`; preview origin handling can use the latter when no explicit site origin is set. Actual environment inheritance, branch overrides and live Supabase URL allowlists were not exported. Update site origin and allowlists when changing ports/domains; never assume a historic localhost port is the active one.

## 5. Postgres schema and ownership

Canonical definition: [supabase/schema.sql](supabase/schema.sql), including the later integrity definitions appended to it. Ten public application tables use UUID identities. `profiles.id` is the Auth user ID; other tables have `user_id` referencing `auth.users(id)` with cascade deletion. RLS is enabled with owner policies. The following is a field/relationship map, not a replacement for executable SQL.

| Table | Significant columns and relationships |
| --- | --- |
| `profiles` | `id` → Auth user; `full_name`, `currency` default ISK, created/updated timestamps |
| `categories` | `user_id`, `name`, `type` income/expense/both, `is_default`; unique owner/name |
| `transactions` | `user_id`, nullable `category_id`, positive `numeric(12,2)` amount, income/expense type, date, note, timestamps; later nullable `import_key` |
| `budgets` | Owner, nullable category, month, positive amount; unique `(user_id, month, category_id)` as declared; do not infer that nullable overall-budget rows have a special NULL-equality constraint |
| `bills` | Owner, `series_id`, optional category, first-of-month `month`, name, positive amount, `due_day` 1–31, `is_active`; unique owner/series/month |
| `bill_payments` | Owner, bill, optional legacy `transaction_id`, month, positive amount, actual `paid_at`; unique owner/bill/month and partial uniqueness on linked transaction |
| `savings_buckets` | Owner, bucket enum, label, nonnegative balance; unique owner/type |
| `savings_bucket_entries` | Owner, bucket enum, label, positive amount, date, note; request UUID supports retry identity. Bucket relation is logical owner/type, not a bucket-ID FK |
| `savings_goals` | Owner, title, positive target, nonnegative current amount, optional target date |
| `savings_contributions` | Owner, goal reference, amount, date, note; goal balance maintained through SQL behavior |

Persisted bucket enum values are `serignarsparnadur`, `husnaedisparnadur`, `hlutabref`, `sjodir`. Preserve exact values. Category and transaction enums use English persisted identifiers even though the UI is Icelandic.

Sign-up triggers create the profile, Icelandic default categories and savings buckets. Updated-at triggers maintain applicable timestamps. Goal contribution triggers maintain goal totals. Category/goal references have composite ownership constraints, preventing a row from referencing another account's entity even when its own `user_id` passes RLS. Category deletion clears transaction/bill category references without clearing ownership; associated budgets cascade. Goal deletion cascades its contributions. The owner-reference migration relies on PostgreSQL 15+ syntax; production PostgreSQL 17.6 was recorded in September, not rechecked now.

Bill integrity triggers lock related rows and validate owner, bill/payment/expense amounts, dates and month consistency. They protect linked expenses against inconsistent edits/deletion and allow account-deletion cascades. New payments require a valid expense link even though the legacy column remains nullable. Do not conclude that the initial table definition alone describes the final enforced contract.

The security-invoker RPC `add_savings_bucket_contribution(p_request_id, p_bucket_type, p_amount, p_date, p_note, p_label)` derives ownership from `auth.uid()`, writes history and updates balance atomically, and returns entry/balance/retry information. A repeated request ID with different payload is rejected. Failed writes/overflow roll back. Anonymous execution is revoked. Internal seed/trigger functions also have restricted execution; Supabase role-specific grants mean revoking PUBLIC alone is insufficient.

The import key is a SHA-256-derived, user-scoped key, constrained to the expected hex shape and protected by a partial unique index for non-null keys. Identity-changing edits clear it. The migration does not rewrite/backfill existing financial records. Server-side value comparison still protects imports against existing rows without keys.

Auth user metadata stores versioned `savings_preferences`, deletion request/cancellation state and privacy-notice metadata. Metadata is user-editable; it is not an authorization source. Theme, onboarding, import presets/rules and external-content choice have additional device-local storage. Not all browser preferences are included in an account export.

## 6. Schema installation and migration inventory

There is no established ORM migration ledger in this repository. Inspect actual installed constraints/functions/grants and release records before applying SQL. `schema.sql` is for a fresh empty database: do not rerun it wholesale on populated production.

| SQL file | Role / recorded production evidence |
| --- | --- |
| [schema.sql](supabase/schema.sql) | Fresh installation, including appended integrity definitions |
| [savings-buckets-update.sql](supabase/savings-buckets-update.sql) | Legacy bucket support |
| [savings-bucket-entries-update.sql](supabase/savings-bucket-entries-update.sql) | Legacy contribution history support |
| [bills-update.sql](supabase/bills-update.sql) | Monthly bills/history update |
| [icelandic-update.sql](supabase/icelandic-update.sql) | Legacy labels/defaults, not currency conversion |
| [bill-payment-integrity-update.sql](supabase/bill-payment-integrity-update.sql) | Recorded applied/verified 18 September |
| [savings-contribution-integrity-update.sql](supabase/savings-contribution-integrity-update.sql) | Recorded applied/verified 18 September |
| [owner-reference-integrity-update.sql](supabase/owner-reference-integrity-update.sql) | Recorded applied/verified 25 September |
| [import-deduplication-update.sql](supabase/import-deduplication-update.sql) | Recorded applied/verified 8 October |
| [production-readiness-check.sql](supabase/production-readiness-check.sql) | Read-only verification aid |

The development project's migration parity, RPC availability for authenticated writes, backups and current role grants remain to be verified. Successful ID-only/zero-row table probes do not prove these properties. Preserve migration preflight errors instead of silently deleting or repairing financial records to make SQL apply.

## 7. Authentication and email flows

Supabase handles email/password authentication. The web uses cookie-based SSR sessions and protected server entry points. Native uses a separate client/session lifecycle and secure device storage. The app does not implement plaintext password storage. Privileged project administrators can access user data; RLS is not encryption against the operator.

The owner previously received reset emails that landed at login rather than reset-password. The web callback and templates were updated to route through the application callback and use `token_hash`/OTP verification, while preserving supported legacy flows. This removes reliance on an original browser's PKCE verifier for the new web email link format. Allow only safe intended destinations and preserve recovery state; a recovery session must not be redirected straight into ordinary app navigation.

Templates and rollout details are in [supabase/email-templates/README.md](supabase/email-templates/README.md), [confirm-signup.html](supabase/email-templates/confirm-signup.html) and [reset-password.html](supabase/email-templates/reset-password.html). The owner confirmed successful reset/dashboard access and signup on 9 October. Cross-device and reused live links were not separately confirmed. SMTP provider, delivery guarantees and current Auth dashboard settings were not retrieved.

Deploy compatible callback code before changing templates. Already-sent links survive a deployment and matter during rollback. Do not print full callback URLs, recovery codes or tokens in logs/docs. For testing, use the owner's authorized sample account and let the owner choose credentials; historic mailbox access does not authorize new outbound mail during this documentation task.

Native uses PKCE helpers, crypto support, URL handling and SecureStore-backed chunked storage. Its callback scheme/Expo host allowlist is separate from the web email flow. Session chunks use a manifest-last strategy and migration/clearing safeguards. See [mobile/lib/chunked-auth-storage.ts](mobile/lib/chunked-auth-storage.ts), [mobile/lib/auth-storage.ts](mobile/lib/auth-storage.ts), [mobile/lib/auth-links.ts](mobile/lib/auth-links.ts) and [mobile/lib/supabase.ts](mobile/lib/supabase.ts).

## 8. External services and stored data

| Service | Source-backed use | Important limit |
| --- | --- | --- |
| Hagstofa PX API | CPI `VIS01000.px`; housing index `VIS01106.px` | Public cached data; provider failures handled; housing fallback explicitly sample |
| LCE / IS-Macro API | `https://www.lce.is/api/fixed-income` for policy/FX source data | Current availability not tested for this package |
| Central Bank of Iceland | `https://sedlabanki.is/xmltimeseries/Default.aspx` policy-rate fallback | External dependency, not a guaranteed feed |
| TradingView | Opt-in attributed stock/ETF widgets in isolated iframe | Preserve consent/revocation and avoid sending private finance data |
| Supabase | Auth, relational account records and RPCs | Live region/retention/backup/SMTP details need verification |
| Vercel | Next.js web hosting/builds | Current project settings and operational retention not exported |
| Expo | Development bundling/phone preview and tunnel | Not a production iOS distribution pipeline |

Full provider URLs and parsing are in [lib/market-data.ts](lib/market-data.ts) and [lib/real-estate-data.ts](lib/real-estate-data.ts). Public caches use six hours for CPI/housing and one hour for policy/FX. Do not cache private records using these mechanisms. No production bank API, payment processor, general analytics platform or raw bank-file storage service was established by the reviewed architecture.

Account JSON export includes ten owned tables and limited account metadata; it paginates and fails closed. CSV protects spreadsheet consumers from formula execution. Native export creates a temporary file for the share sheet and cleans up. Deletion requests are manual metadata, with no established notification worker or automated fulfillment. See [docs/account-data-operations.md](docs/account-data-operations.md).

## 9. Development, checks and releases

Web setup from the root: Node 22, `npm ci`, a development environment file, then `npm run dev`. The script starts webpack Next dev on **5173**. Historical browser URLs on 5191/5195 are not defaults. `npm run start` runs the built app with Next's default port unless explicitly overridden. Never run a fixture-backed local build as a production artifact.

Web release checks: `npm run lint`, `npm test`, `npm run build`, `npm run typecheck`, `npm run audit:production`. Build before standalone typecheck if generated Next types are absent. Unit tests are an explicit file list; broad wildcards include stale browser scripts. Database checks are `npm run test:database`, `npm run test:database:ownership`, and `npm run test:database:imports`, with isolated PostgreSQL tools described in [docs/bill-payment-deployment.md](docs/bill-payment-deployment.md). They must not target production. `npm run check:privacy` checks supplied process environment disclosures; passing is not a legal certification.

Vercel's recorded setup uses Next.js, Node 22, `npm ci` and `npm run build`. [.vercelignore](.vercelignore) excludes `mobile`, `.env*`, `data`, local output/dependencies, logs, `.git`, `.agents` and `docs/qa` from CLI uploads. These upload exclusions are not a substitute for Git privacy review. Reconfirm Git-trigger behavior and deployment environment before publishing. Follow [docs/production-release-checklist.md](docs/production-release-checklist.md).

Historical release evidence: September 18 initial release and bill/savings SQL; September 25 ownership SQL; October 8 import SQL plus callback/import/copy release `f8ba601`, followed by October 9 verification and demo-heading commit `cca0eec`. Current production commit is not inferred from local HEAD. Detailed evidence and test totals are in HANDOFF.md and [the October final review](docs/qa/2026-10-07-final-review.md).

Rollback must consider web code, database compatibility and already-sent emails separately. A web rollback does not undo SQL. No verified backup/restore drill or automated rollback procedure is claimed. Establish the target, current state and recovery option before any destructive database action.

### Native setup and the current interruption

Work inside `mobile/` with its own `npm ci`. Its current manifest targets Expo SDK 58, Router 58, React Native 0.88.1 and React 19.3.0. The recorded resolved Expo version is 58.0.25; use the native lockfile for exact resolution. Native scripts include `npm test`, `npm run typecheck`, `npm run lint`, `npm run start:tunnel` (Expo Go, port 8082), and platform starts. Run Expo Doctor after compatibility changes and verify iOS export when relevant.

The owner confirmed Expo Go 58.0.5. SDK 57 is obsolete for this continuation. After upgrade the app stayed open but showed Unmatched Route. Explicit protected-route fallback and auth anchor fixes are local, with 33 recorded tests; actual iPhone retest is still pending. HANDOFF.md section 3 is the precise continuation point and supersedes older native README status text.

Generate a fresh tunnel/link, disable the development-only startup diagnostic for normal acceptance, and verify the served SDK. The iPhone cannot connect to the desktop's `localhost`. Old PIDs, QR codes and `on.expo.app` hosts do not prove a server is running now. Start hidden background processes on Windows and stop only the verified project process. Native app config declares portrait orientation, tablet support, typed routes and React Compiler; those settings do not prove device acceptance.

No signed TestFlight/App Store build, Apple Developer membership, production EAS configuration or store submission is established. Those are later infrastructure decisions, not a task to perform as part of this migration package.

## 10. Facts to retrieve before claiming operational readiness

- Live GitHub/Vercel integration, production commit, protection rules and environment values by environment; no secret values should be pasted into documentation.
- Current Supabase database schema/functions/RLS/grants in both projects, Auth switches/allowlists/templates, provider configuration, plan and paused-state behavior.
- Actual data regions, processing agreements, transfer arrangements, log/support/backup retention and recovery evidence. Old Free-plan/no-backup observations are dated, not current facts.
- Real-user isolation checks in staging, native contribution RPC writes/retries, real-phone date/scroll/route/export behavior and current dependency audits.
- Custom-domain ownership/DNS if resumed; update origins, auth links, redirects, templates and native public links together.
- Complete original ChatGPT Project instructions/uploads if the owner exports them later. Local spreadsheets/screenshots may contain private data; their presence is not evidence that all original attachments were recovered.

Until these are retrieved, retain explicit unknowns. Do not invent a production schema version, SLA, customer count, monitoring service, backup schedule or compliance approval.
