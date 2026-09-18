# Production release checklist

Use this for a specific web release candidate. Leave an item unchecked until its evidence exists. No production deployment or live database change is implied by preparing this checklist. The mobile app is a separate release.

## Release record

- Candidate commit / branch:
- Preview URL and build ID:
- Target Vercel project / production origin:
- Development database / migration revision:
- Production migration revision and planned changes:
- Reviewer / operator / date:
- Previous healthy deployment for rollback:

## Local application checks

- [ ] Review the final diff and ensure no environment secrets, test sessions, screenshots containing real records, or local runtime files are included.
- [ ] `npm ci` succeeds with the committed lockfile on the selected Node.js 22 runtime.
- [ ] `npm run lint` succeeds.
- [ ] `npm test` succeeds. This is the explicit non-browser suite; do not substitute a wildcard that starts legacy Playwright files.
- [ ] `npm run build` succeeds in a directory not concurrently used by a dev server or another build.
- [ ] `npm run typecheck` succeeds after generated Next types are available.
- [ ] `npm run audit:production` is reviewed. Run `npm audit` for development-tool advisories as well; document any accepted advisory and rationale instead of silently ignoring it.

Record command dates and results with this candidate. A prior commit's passing check is not this release's evidence. Mocked service tests do not validate a deployed SQL policy or real provider availability.

## Database gate

- [ ] Compare the target database migration history with [`schema.sql`](../supabase/schema.sql) and the applicable update scripts. Do not run the fresh schema over an existing database.
- [ ] Backups/recovery access are confirmed before any planned database update; record an operator and maintenance plan.
- [ ] Required updates have passed in a disposable/staging database, including the [bill-payment integrity migration](bill-payment-deployment.md) and [atomic savings contribution RPC](../supabase/savings-contribution-integrity-update.sql). The separate `npm run test:database -- --tools-dir=...` suite validates local PostgreSQL behavior; confirm deployed staging grants and schema separately.
- [ ] Legacy duplicate expense links and invalid relationships are reviewed before applying constraints. A migration failure is a release blocker, not a reason to remove protection.
- [ ] Test two distinct synthetic users against real staging RLS: each must be unable to read, insert, update, delete, or link records belonging to the other.
- [ ] Verify bill linking/unlinking, one-expense/one-payment enforcement, linked-expense edit/delete rejection and competing requests in staging. Unlinking must retain the expense.
- [ ] Verify atomic savings balance/history writes, concurrent contributions, safe retries, rollback on failure and authorized disposable-account erasure after all triggers are installed. No real account is used for destructive acceptance testing.
- [ ] An authorized operator has recorded the production migration result before application promotion. Include required new migrations added during final security review.

## Environment and operations

- [ ] Production public Supabase variables point to production; Preview/local variables point to development. Public keys are publishable keys, never secret/service-role keys.
- [ ] Production `NEXT_PUBLIC_SITE_URL` and Supabase Site URL/redirect allowlist match the actual origin. Preview recovery links resolve to the intended preview, without a production origin override.
- [ ] Signup confirmation, password recovery and session refresh work with the configured email delivery and Auth settings.
- [ ] If a support address is shown, `SUPPORT_EMAIL` is real and monitored. If unset, Help's project link and manual-request limitations remain accurate.
- [ ] An operator owns the [deletion-request review workflow](account-data-operations.md), knows where Auth metadata requests are stored, and has a review cadence. There is no automatic notification or erasure worker.
- [ ] Current Help/Privacy text matches the release's storage, import, export, external embed and deletion behavior.
- [ ] Vercel/Supabase logs and the prior deployment are available to the operator; incident and rollback ownership are recorded.

## Isolated browser acceptance

Use the approved computer-use browser workflow with synthetic development accounts and files. Do not run the legacy standalone browser scripts as part of this checklist.

- [ ] Homepage clearly describes manual entry, expense import and ISK; signup/login/demo/help/privacy links work. Demo financial totals agree with inspectable sample records.
- [ ] Login/logout, invalid credentials, signup, password recovery and a revoked/expired session behave correctly. Returning after another tab changes accounts does not show the previous account's data.
- [ ] Dashboard prioritizes financial totals, then visible onboarding steps. Existing history completes record-based steps; category review requires explicit acknowledgement.
- [ ] Create/update/delete a synthetic transaction, filter by month/custom/all dates, follow a direct record anchor, and bulk-categorize selected records. Check success/error feedback and saved totals.
- [ ] Import representative CSV/Excel expenses, remap columns, inspect rejected/duplicate lines, select rows and confirm totals. Verify device-local presets/rules and their clearing controls are scoped to the signed-in user.
- [ ] Add/copy a bill, link an existing expense, unlink it, and verify that the expense remains. Check actual payment date and prevention of double use.
- [ ] Change savings, inspect contribution history and goal estimates, and confirm resulting feedback and dashboard amounts.
- [ ] Export CSV and JSON for the synthetic account. Confirm ownership, all records, readable ISK data and complete-download failure handling. Request/cancel deletion and confirm the account still exists.
- [ ] Verify 320/390-pixel mobile and desktop layouts, especially Safari date inputs, import review, transaction actions, bill links and settings. No unintended page-wide horizontal overflow.
- [ ] Check keyboard focus, focus visibility, labels, light/dark appearance, reduced motion and section fades. Anchor/focus targets must be visible immediately and open content must remain reachable.
- [ ] Verify real public provider loading and unavailable states without substituting sample numbers. Market delays must not block personal finances or the demo ledger.
- [ ] Browser console and server logs contain no unexplained application errors; security headers do not block required Auth or attributed TradingView content.

## Promotion and rollback

- [ ] Confirm the user's authorization covers this release and its required production database changes; state any unresolved gates plainly before promotion.
- [ ] Promote the verified candidate through the existing Vercel project after required database changes are confirmed. Record commit and deployment ID.
- [ ] Perform read-only production smoke checks for public pages, login page, asset delivery and provider status; inspect deployment errors. Any authenticated production check uses an authorized test account.
- [ ] If critical errors occur, restore the previous healthy application deployment and stop writes affected by incompatible behavior. Assess database compatibility before rollback; an application rollback does not undo migrations or user data changes.
- [ ] Record the final result, remaining limitations and follow-up owner. Remove only disposable test artifacts through the authorized test-environment process.

## Current evidence and limits

On 18 September 2026, the final `npm test` run passed **138 tests** across eleven non-browser test files and `npm run lint` passed. The separate local integration runner passed **33 checks on actual PostgreSQL 17.10**, covering both migration replays, fresh schema installation, ownership, bill/expense concurrency and atomic savings retries; see [database verification](bill-payment-deployment.md). Both `npm audit --json` and `npm run audit:production` reported **zero known vulnerabilities** in the checked lockfile. Rerun changed checks and audit for the final candidate because code, advisories and the lockfile can change. These results do not confirm a live Supabase schema, production migration application, browser acceptance or deployment. No production database change was performed.
