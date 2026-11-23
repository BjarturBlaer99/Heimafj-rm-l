@AGENTS.md

# Mín fjármál — permanent project instructions

Read this file and [HANDOFF.md](HANDOFF.md) before changing the project. This file defines lasting engineering and product rules; HANDOFF.md records dated status, evidence, unfinished work, and deployment history. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) explains requirements and decision rationale; [INFRASTRUCTURE.md](INFRASTRUCTURE.md) maps hosting, environments, authentication, database relationships and operations. Preserve the `@AGENTS.md` import above. Explicit current instructions from the owner take precedence over historical preferences.

Migration package expanded **23 November 2026**. Treat source-confirmed behavior, dated test results, owner reports and current live state as different evidence. The package does not contain a complete export of every original ChatGPT Project conversation, custom instruction or attachment. Retrieval limits are listed in HANDOFF.md. Do not fill those gaps with assumptions.

The iPhone source is now tracked and pushed to GitHub on **`codex/ios-app-handoff`**, app commit **`1963654`** (23 November). Check out that branch for the complete app and migration documents; the app has not been merged into `main`. Credentials, dependencies, generated Expo state and local screenshots are intentionally excluded. See INFRASTRUCTURE.md for clone/setup commands.

## Purpose and product boundaries

Mín fjármál is an Icelandic personal-finance product for understanding income, expenses, monthly plans, bills, and savings. The aim is a credible, approachable financial workspace, with natural Icelandic copy, accurate totals, quick navigation, and a polished mobile experience.

The primary product is the Next.js website. A separate Expo/React Native project in `mobile/` implements an iPhone companion. They use the same financial concepts and Supabase schema, but have separate application code, dependencies, builds, environment files, and release processes. A web deployment does not deploy the phone app.

Current supported behavior is manual entry and reviewed **expense** file import, in **ISK**. Do not imply automatic bank connections, account-balance synchronization, currency conversion, live property listings, investment advice, paid subscriptions, or certifications that are not implemented and verified. Public market indicators are separate from personal financial records. Monthly income minus expenses is cash flow/afkoma, not a verified bank balance or net worth.

The operator-confirmed public contact is **Bjartur Blær Gunnlaugsson**, **bjarturbbg@gmail.com**. The source of truth for displayed contact details is `lib/privacy-config.ts`; `SUPPORT_EMAIL` can override support separately. Do not change the responsible operator or invent business registration details.

## Repository and technology

| Area | Implementation |
| --- | --- |
| Web runtime | Node.js 22.x, Next.js App Router, React, strict TypeScript |
| Web versions | Root package pins Next.js and eslint-config-next 16.3.4; resolve other exact versions from the root lockfile |
| Web styling | Tailwind CSS 3, global CSS tokens, CSS Modules, shared UI primitives, Radix Slot/Tooltip, CVA/clsx/tailwind-merge |
| Web graphics | Phosphor icons, Recharts, Motion and the existing scroll-reveal implementation |
| Backend | Supabase Auth, Postgres/PostgREST, RLS, SQL triggers/functions; Next.js server actions and route handlers |
| Validation | Zod and domain-specific validation/format helpers |
| Native app | Expo SDK 58, React Native 0.88.1, React 19.3.0, Expo Router; own `mobile/package-lock.json` |
| Hosting/source | Existing GitHub repository and Vercel project; identifiers and dated release evidence are in HANDOFF.md |

This is not a Vite application, a Prisma-backed service, or a Supabase Edge Functions architecture. Do not resurrect old `src/`, `prisma/`, SQLite, or Vite paths from stale instructions. No separate general-purpose backend server is required for the web app.

```text
app/                         Next.js App Router
  (app)/                     Authenticated finance pages and persistent shell
  (auth)/                    Login/signup/password pages
  auth/callback/route.ts     Email-token and legacy PKCE callback
  api/data/export/route.ts   Ownership-scoped JSON/CSV downloads
  demo/, help/, privacy/     Public product/support pages
components/                  Shared UI and interactive forms
lib/                         Data loaders, server actions, validation, domain logic
  supabase/                  Browser/server clients, environment guard, auth proxy logic
supabase/                    Fresh schema, additive updates, checks, email templates
scripts/                     Explicit Node tests, isolated Postgres tests, older QA utilities
docs/                        Design decisions, operations, release/QA evidence
mobile/                      Independent Expo application
  app/                       Expo Router native screens
  providers/                 Authentication and top-screen feedback
  lib/                       Native data/actions/storage/export/validation
  components/, hooks/        Native interface and refresh behavior
  tests/, scripts/, docs/    Native tests, helpers, and QA notes
```

### Web architecture

- Server Components load private data through `lib/data.ts`, `lib/bill-data.ts`, `lib/savings-data.ts`, and related helpers. Use the existing request-scoped `React.cache` patterns; never put personal account data in a cross-user persistent cache.
- Mutations live in `lib/actions.ts` and the focused `*-actions.ts` modules. Preserve server-side authentication, ownership checks, validation, idempotency, and revalidation. A client validation result is not authorization.
- `proxy.ts` calls `lib/supabase/middleware.ts`. It verifies signed claims, preserves refreshed/cleared cookies, redirects protected-page requests, and returns 401 for unauthorized APIs. Private loaders/actions also verify the current user. Do not replace verification with trust in an unverified client session.
- `lib/supabase/server.ts` uses the async Next.js cookies API. Browser clients use publishable credentials. Auth state must not leak across requests/accounts.
- Public loaders in `lib/market-data.ts` and `lib/real-estate-data.ts` can cache public provider results. Keep them separate from the financial overview so a slow external API does not block personal data or the demo.
- The app shell remains mounted during navigation. Preserve loading/error boundaries, intent-based prefetch, mutation invalidation, refresh on auth changes/return, and the currently configured 30-second router stale times unless measurements justify changing them.

### Native architecture

- Run native commands from `mobile/`. The root web TypeScript configuration excludes it and `.vercelignore` excludes it from web uploads.
- `mobile/index.js` selects `expo-router/entry` normally. `EXPO_PUBLIC_STARTUP_DIAGNOSTIC=1` enables a development-only plain startup test; production always uses the real router. Never accidentally leave a finance preview in diagnostic mode.
- `mobile/providers/auth-provider.tsx` coordinates sessions and recovery links. `mobile/lib/supabase.ts` uses native Expo Crypto for PKCE and rejects the production project during development.
- Native sessions use chunked SecureStore persistence with migration from old AsyncStorage, serialized writes, and logout protection. Preserve those guarantees; do not replace them with plaintext session storage.
- The SDK supported by installed Expo Go must match the project's SDK. Verify both before investigating another launch failure. A bundle build or Expo Doctor pass does not prove that an iPhone screen works.
- Preserve explicit protected-route redirect targets in `mobile/app/_layout.tsx`. The `(auth)` group has no index screen; redirecting to the group alone can yield Unmatched Route. Recovery sessions must go to `/reset-password`, not finance screens.
- Native icons currently use a shared Material Icons font renderer, including iOS. Do not restore native SymbolView rendering casually; see the crash history in HANDOFF.md.

## Design, copy, and UI rules

1. **Use natural Icelandic.** Write concise, specific text as a careful financial-product professional would. Avoid robotic filler, inflated claims, jargon, and fake reassurance. Keep terminology consistent: Færslur, Tekjur, Útgjöld, Reikningar, Sparnaður, Afkoma, Áætlun. The owner explicitly requested “Innskráning” instead of “Skrá inn” for the relevant entry label.
2. **Use the established visual system.** Light mode uses warm neutral backgrounds, white surfaces, dark ink text and restrained blue actions; dark mode has corresponding tokens. See `app/globals.css`, `tailwind.config.ts`, CSS Modules, `components/ui.tsx`, and `components/ui/`. Do not scatter unrelated colors, shadows, radii, or button patterns.
3. **Preserve the restored typography and icons.** Body text uses the existing Inter/system sans-serif stack; display headings use the existing serif/Georgia treatment. A font-family name does not prove that font is bundled. Spesía-inspired Fraunces/Jost and Carbon icon experiments were rejected/reverted. The current web icon dependency is Phosphor. Commercial reference fonts must not be copied without a verified license.
4. **Keep information open while scrolling.** The owner rejected collapsible information panels. Keep primary data, filters, and editing sections visible; ordinary selection controls are not categorically banned. Do not hide important content behind accordions to simplify layout.
5. **Keep the requested fades accessible.** Use the existing CSS entrances and `ScrollReveals`, with reduced-motion support. Keyboard focus and anchor targets must reveal immediately. Motion must not delay usable controls, hide data if APIs fail, or capture the first scroll. Preserve the `overflow-x: clip` fix that avoids a second body scroller.
6. **Success feedback belongs at the top.** Reuse `ActionFeedbackProvider`, action helpers, and native `FeedbackProvider`. Web feedback is top-centered, with screen-reader announcements, dismissal and focus-aware timing. Do not reintroduce bottom-right toasts or report success before a mutation succeeds.
7. **Treat mobile as a first-class layout.** Test narrow 320/390-pixel views and actual Safari touch behavior where available. Reuse shared date/amount inputs, `min-width: 0`, wrapping and appropriate field sizing. Watch Safari native date overflow/alignment. Browser emulation is not a physical-device pass.
8. **Format numbers consistently.** Use the existing amount-draft/format helpers: dots group thousands, Icelandic decimal input is supported, displayed ISK uses `kr.`, amounts align with tabular numerals. Preserve input editing/caret behavior and symmetric positive/negative half-króna display rounding. Formatting must not change stored values.
9. **Be honest about data.** Show unavailable/error states when private reads fail, not zero balances. Distinguish no budget from overspending. Label demo/sample information clearly; the demo heading is “Sýnigögn,” not a greeting to Test/Alex. Preserve source/as-of information and third-party attribution.

Research references and rationale are recorded in `docs/design-research.md` and `docs/website-audit-*.md`. Treat old audits as historical findings, not proof that their subsequently fixed bugs still exist.

## Financial integrity contracts

### Ownership and money

- Supabase `auth.users` owns all ten application tables. Most use `user_id`; `profiles.id` is the Auth UUID. Every private read/write/export must be scoped to the authenticated owner, with RLS as a second boundary.
- Category/goal IDs must belong to that owner. Preserve composite owner-matching foreign keys and PostgREST relationship names. User metadata is editable and is never a source of privileges.
- Amounts use Postgres `numeric(12,2)` and domain validation; most financial records require positive amounts, while savings balances allow zero. Do not silently round an invalid write to make it acceptable. Dates must be real calendar dates, not JavaScript rollover dates.
- Paginate complete totals/history/export reads beyond PostgREST's row cap. A partial result is not an account total. Preserve fail-closed export behavior and CSV formula protection.

### Imports

- Imports currently accept expenses, up to 1,000 accepted rows. The file is read in the browser; parsed candidate records reach the server for duplicate checks, and selected records are persisted on confirmation. Do not claim that all processing stays on the device. Original files are not stored as uploaded objects by this workflow.
- After parsing and duplicate review finish, one button imports all selected new rows across review pages. Users can adjust categories or skip new rows; do not require a confirmation for each row/page.
- Automatically skip duplicates by date, amount and normalized description, within the file and against stored records. Preserve server rechecking, stable retry IDs, the import hash, and unique `(user_id, import_key)` index. UI deduplication alone does not prevent concurrent duplicates.
- Manual identical transactions remain legitimate. The database clears an imported record's old key when identifying values change. Do not broaden import uniqueness to all manual financial entries.
- Mapping presets/description rules are optional, user-scoped browser storage with clearing controls. Do not treat them as synchronized server settings or include them in server exports accidentally.

### Bills and savings

- Bills are month-specific; `series_id` supports deliberate copying, not an automatic recurring scheduler. The web can link an existing expense or deliberately record a new one. Unlinking a web bill payment preserves its expense.
- A transaction may fund only one bill payment. Database triggers require matching owner, amount/date and bill month, and protect linked records from incompatible edits/deletion. Never bypass these triggers to resolve a UI error.
- Savings bucket contributions use `add_savings_bucket_contribution`: one SQL transaction writes history and increments the current balance, using a stable request UUID for retries. Never replace it with client-side read/add/overwrite or separate balance/history writes.
- The four stored bucket keys are `serignarsparnadur` (intentional existing spelling), `husnaedisparnadur`, `hlutabref`, and `sjodir`. Keep persisted identifiers compatible.
- `user_metadata.savings_preferences` version 1 stores order, housing membership and goal membership. Defaults include pension + housing in housing savings and all four in goal savings. The user can exclude pension after buying a home. Preferences do not alter balances or total savings. Keep web/native normalization and fallback behavior aligned.
- Goal contribution history and bucket contribution history are distinct models. Do not count both as additional money without reviewing the existing totals. Goal projections must disclose no-growth/current-month assumptions; no return is guaranteed.

## Auth, privacy, and operational security

- Never commit `.env*` secrets, service-role keys, database passwords, tokens, real account exports, mailbox screenshots, or native session data. `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` are public bundles, not secret storage. Do not print credentials while diagnosing configuration.
- Keep production and development Supabase projects separate. Preserve the existing environment guards. A production-mode local build does not automatically make its database selection safe; verify its actual configuration.
- Preserve callback validation: no open redirects; reject invalid/ambiguous credentials; do not log token-bearing links. Web callbacks have private/no-store and no-referrer headers. Keep legacy PKCE and current one-use email-token behavior compatible.
- Deploy compatible web callback code before changing email templates. Already sent links matter during rollback. Native PKCE email checks are a separate device flow and require the current native callback scheme/host allowlist.
- Keep CSP/security headers functional. Production currently avoids `unsafe-eval` but still uses `unsafe-inline` for scripts/styles; do not describe this as a fully nonce-based CSP. Review integrations rather than casually weakening the policy.
- TradingView content is optional and must wait for user choice. Preserve decline/revoke behavior, the current expiry, isolated iframe treatment, and attribution. Do not send personal transaction data into external charts.
- `PUBLIC_REGISTRATION_ENABLED` is an operator-controlled website switch, **not privacy certification**. Supabase Auth has its own signup switch. Do not silently re-close signup because old documents describe a former gate, and do not mark privacy work complete because signup is open.
- The `PRIVACY_*` fields require verified operational facts. Do not invent hosting regions, retention periods, DPAs, transfer safeguards, backup coverage, or legal compliance. Recheck current provider/legal sources when advising on them; old research is dated.
- Account deletion requests are metadata for a **manual** operator process, with no automatic notification or deletion worker. Preserve cancellation. Never erase a real account as a test or promise instantaneous backup erasure.
- RLS isolates ordinary users; it does not make data inaccessible to a privileged project administrator. Do not tell the operator that they cannot access users' personal financial records. No plaintext-password storage is implemented by this app; authentication is delegated to Supabase.

## Development and release rules

1. Inspect current source, Git status and relevant docs before editing. Native source is tracked on `codex/ios-app-handoff`; other local web changes/artifacts remain outside that commit. Preserve unrelated changes and assets; never use a blanket reset/clean, recreate the repo, or assume ignored credentials/artifacts come with a clone.
2. **Before writing Next.js code, read the relevant installed guide under `node_modules/next/dist/docs/`.** Follow AGENTS.md. APIs in this Next version may differ from prior knowledge. Keep its generated instruction block; Next recreates it.
3. Match nearby code style: strict TypeScript, `@/` aliases, functional React components, server-only boundaries, shared primitives and domain helpers. The web generally uses double quotes; native generally uses single quotes. Avoid broad formatting churn. Preserve UTF-8 Icelandic text: earlier PowerShell output showed mojibake even when source bytes were correct, so verify the file/browser before attempting encoding repairs.
4. Verify current package manifests/lockfiles before dependency changes. Use `npm ci`; keep web/native lockfiles separate. Do not use `npm audit fix --force`, bypass peer checks, or downgrade Expo just to clear an advisory. Remove an override only after establishing why it is no longer needed.
5. Add meaningful regression coverage for behavior changes, especially money/auth/routing/retries. Separate mocked unit coverage, actual PostgreSQL coverage, browser acceptance and real-device checks. State limitations explicitly.
6. Web baseline: `npm run lint`, `npm test`, `npm run build`, then `npm run typecheck`; review `npm run audit:production`. Build before standalone typecheck when Next-generated types are absent. Do not run competing builds/dev servers in the same `.next` directory.
7. Database tests are separate commands: `npm run test:database`, `npm run test:database:ownership`, `npm run test:database:imports`. Read their prerequisites and `docs/bill-payment-deployment.md`; they use isolated local PostgreSQL, not production. A mocked test cannot prove deployed RLS/triggers.
8. `npm test` deliberately enumerates non-browser files. Do not replace it with `scripts/*.test.cjs`; legacy browser scripts have stale assumptions, external tools and machine-specific paths. Use the browser workflow permitted by the active agent environment and synthetic data. `mobile/tests/iphone-smoke.cjs` is stale.
9. Native baseline: from `mobile/`, run `npm test`, `npm run typecheck`, `npm run lint`, and Expo Doctor when dependencies change. Verify an iOS export after relevant build changes. A signed native build/TestFlight release is a separate task.
10. Prefer the smallest verified fix. Investigate authenticated first-load performance before adding shared caching. Preserve financial correctness, auth isolation and accessibility when optimizing.
11. Review/apply only migrations missing from the target. `schema.sql` is for an empty database, not a reset script for populated production. Preserve preflight failures instead of silently repairing financial records. Confirm backups, grants, RLS, and installed migration results.
12. Follow `docs/production-release-checklist.md` for a web release. Existing GitHub/Vercel wiring must be reused. A push may deploy depending on branch configuration. Historical deployment approval is not blanket permission for unrelated future releases or destructive database work; honor the current user-authorized scope.
13. Never upload a local fixture `.next` build to production. Vercel must build with its production environment. A web rollback does not undo SQL or sent email links.
14. On Windows, start background servers hidden, log them, and stop only the verified process for this project/port. Never kill every Node process. Validate absolute target paths before recursive removal/moves.
15. Work proactively within the agreed scope; avoid repeatedly asking permission for already-authorized reversible work. Give brief progress updates and clearly distinguish implemented, tested, user-confirmed, deployed and still-pending results. Never claim “production ready” from a build alone.
