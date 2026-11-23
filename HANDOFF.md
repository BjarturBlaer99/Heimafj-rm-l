# Mín fjármál — project handoff

Initially prepared **19 November 2026**, expanded into the four-document migration package **23 November 2026**, Atlantic/Reykjavik. Read [CLAUDE.md](CLAUDE.md) for permanent implementation rules, [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for product requirements and rationale, and [INFRASTRUCTURE.md](INFRASTRUCTURE.md) for systems, environment variables and database contracts.

This handoff combines the conversation available in this workspace, inspected source/configuration, Git history, and dated QA/release records. It is not a complete transcript of every earlier assistant action. No production dashboard, DNS configuration, inbox, or live database was re-audited for this document. No deployment or database change was made while preparing it.

## 1. Status at a glance

| Area | Status and confidence |
| --- | --- |
| Website | Implemented with documented production releases. Last detailed production release evidence is 8–9 October; current live commit/configuration not rechecked today. |
| Production URL | Historically verified `https://minfjarmal.vercel.app/`. |
| Local Git / GitHub | `codex/ios-app-handoff`, based on `cca0eec`; native source commit `1963654` pushed 23 November. Documentation follows on the same branch. Not merged into `main`. |
| Working tree | Native source is now tracked on the handoff branch. Other web changes and local QA artifacts remain outside the native commit. Ignored credentials/generated files must be recreated or transferred securely. |
| iPhone app | SDK 58 upgrade implemented. User confirms it no longer closes, but encountered Unmatched Route. The routing fix is now also verified in a browser run of the app (the old redirect reproduces Unmatched Route; the fix lands on sign-in). Native bill-payment undo was fixed on 23 November (Claude continuation). **No phone retest yet.** |
| Public signup | User explicitly requested opening it despite unfinished privacy work; user confirmed signup worked on 9 October. Current live switches not checked today. |
| Privacy/public readiness | Incomplete operational work. No compliance certification, verified comprehensive load test, or complete real-device acceptance. |
| Domain | User wants `minfjarmal.is`; purchase/domain move was deferred. No evidence of purchase or DNS setup. |
| Native distribution | Expo Go testing only. No signed TestFlight/App Store release established. |

Evidence labels used below: **source-confirmed** means present in code; **recorded** means documented in a dated QA/release note or retrieved historical chat; **user-confirmed** means the owner reported the result. None of these automatically means reverified live on 23 November. The original documentation expansion did not rerun acceptance. The subsequent owner-authorized GitHub handoff reran native tests/typecheck/lint, as recorded below; no real-device or production acceptance was repeated.

## 2. Start here in Claude Code

1. Check out `codex/ios-app-handoff` from the existing GitHub repository. Native source is now tracked there, starting with `1963654`; the branch also contains this migration package and AGENTS.md. Keep ignored credentials private and configure the development project separately. A default `main` checkout does not yet include this native handoff.
2. Read CLAUDE.md, AGENTS.md, root README.md, and mobile/README.md. Then read section 3 below for the exact routing continuation. The older 9 November QA note predates the final routing fix; the mobile README and 23 November check now reflect it.
3. Inspect `git status`, `git diff`, the current branch and remote. Many web files appear modified in status, but `git diff --name-only` before this handoff identified textual changes only in `docs/qa/2026-10-07-final-review.md` and generated `next-env.d.ts`. This likely includes line-ending/stat noise; inspect rather than discarding or committing blindly.
4. Decide with the owner's current request whether to continue native acceptance or web launch work. Immediately before handoff, the active feature task was the iPhone Unmatched Route fix. The owner then requested these documents; this is not permission to deploy either product.
5. When restarting native testing, verify the Expo Go version and start a fresh server. The old tunnel/port/PID below is historical, not proof that a server is currently running.

## 3. Exact interrupted task: iPhone launch routing

### What happened

- Expo Go repeatedly terminated completely when opening this project, through both QR and direct links. The owner sometimes described the point as after login and later clarified it also happened on launch.
- On 9 November the owner reported a successful dashboard opening after an iOS icon compatibility change. That was not proof of the precise crash cause; the failure recurred.
- A development-only `STARTUP TEST A` was added through `mobile/index.js` and `diagnostics/startup-entry.tsx`. It executes a plain React Native counter without finance/auth/navigation initialization. Metro can still package registered modules, so it is not a fully stripped native reproducer. The user said Expo Go still closed and did not confirm seeing the test screen.
- On 14 November the owner supplied and then explicitly confirmed **Expo Go 58.0.5**. The project was still SDK 57. It was upgraded to **Expo 58.0.25 / Router 58.0.31 / React Native 0.88.1 / React 19.3.0**, with SDK-aligned native libraries. The version mismatch was confirmed; there is no native crash report proving its exact mechanism.
- The user subsequently said: **“now the app does not close but I get unmatched route.”** The displayed link was the new secure tunnel root. This is the latest user-confirmed phone result.

### Fix currently in the working tree

`mobile/app/_layout.tsx` now sets explicit `Stack.Protected.redirectTo` destinations:

| Session state | Required navigation |
| --- | --- |
| Signed out, opens `/` or private route | `/sign-in` |
| Signed in normally, opens auth screen | `/(tabs)` dashboard |
| Recovery session, opens auth/private route | `/reset-password` |

The `(auth)` group has no index screen. Router 58's inferred group-only fallback `/(auth)` produced Unmatched Route. The recovery fallback could also select an invalid generated destination. `mobile/app/(auth)/_layout.tsx` now uses `unstable_settings.anchor` instead of deprecated `initialRouteName`.

Added `mobile/tests/routing.test.cjs` to the explicit native test runner. It loads the real route filenames and layout configuration, substitutes UI/data providers, and exercises the installed Router's guard resolution and path parser. Before the fix, signed-out startup failed with `Unmatched route: /(auth)` and recovery also failed; after the fix all three new tests passed. **33/33 native tests passed in the recorded run.** This is meaningful routing regression coverage, not a native end-to-end test.

### Upgrade details to retain

- The in-place npm upgrade had a stale peer-resolution conflict. A clean package set was resolved in `.expo/sdk58-resolution`, then installed with `npm ci`; no `--force` or `--legacy-peer-deps` was used. SDK 57 package/config backups are under `.expo/sdk57-before-upgrade/` (ignored/local-only).
- Updated input refs to `TextInputInstance`, a list footer to `undefined`, and Material Icons color styling for stricter native types.
- Router 58 no longer uses `query-string`. Removed the old `decode-uri-component` dependency and override; historical source/license remain in `mobile/vendor/` but are not installed. Regression coverage now exercises Router 58's actual parser with Icelandic text and malformed escapes.
- Before the later routing fix: 30 tests, lint, typecheck, 20/20 Expo Doctor checks and full iOS Hermes export passed. Export: 1,661 modules, about 4.6 MB, `.expo/sdk58-ios/_expo/static/js/ios/index-4b36735b4f02350d7536ad82858cb853.hbc`. This is not a signed iOS binary.
- The current native Supabase client still supplies deprecated `lock: processLock`. A runtime deprecation warning was observed after the upgrade; it was not established as a cause of the route error. Review upstream migration guidance before changing session coordination.

### Resume safely

From `mobile/`, inspect the latest source and run `npm test`, `npm run typecheck`, `npm run lint`; export iOS if required for the final candidate. Start the normal Expo Go preview with diagnostic mode unset or `0`. Check the public manifest reports SDK 58 and the served bundle uses normal startup.

Last known preview: port **8082**, process **12424**, logs `mobile/expo-sdk58-2026-11-14*.log`; secure URL `exps://c-bjartur99-sosa0x-mwh0ezjn32d5994w.on.expo.app`. These are historical diagnostics. SDK 58 changed tunnel services from the previous `exp.direct` host to `on.expo.app`; generate/verify the current link before handing it to the user. Never send `localhost`/127.0.0.1 as an iPhone address. CLI was signed in as `bjartur99`; do not assume current phone/CLI account state.

Ask the user to reopen the **normal app**, verify sign-in/dashboard and a cold restart. Then test the deferred 1,000 kr. sample savings contribution/date/top-message flow and native JSON share sheet. If the process closes again, obtain the matching Expo/Exponent or Jetsam `.ips` report and actual device/iOS versions. Only Expo Go 58.0.5 was supplied; iPhone model/iOS version remain unknown.

## 4. Implemented website features

These are source-confirmed and broadly covered by historical tests; coverage limitations follow in section 9.

| Feature | Behavior and main source |
| --- | --- |
| Public introduction and demo | `/`, `/demo`; shared dashboard presentation with synthetic ledger data. Heading “Sýnigögn.” No invented bank integration or testimonials. |
| Account flows | Signup/login/logout, password change/recovery, protected pages, invalid/expired-session handling. `lib/auth-actions.ts`, `lib/supabase/*`, `app/auth/callback/route.ts`. |
| Dashboard | Monthly income, recorded expenses, cash flow, unpaid bills, savings and charts. External public data loads separately. `components/dashboard-*`, `lib/data.ts`. |
| Transactions | Create/edit/delete, search, month/custom/all-date scopes, stable record anchors, compact open rows and bulk categorization. `components/transaction-ledger.tsx`, `lib/transaction-*`. |
| Income/expenses/plans | Income and expense views, category analysis, monthly overview, budgets and analytics. Months without a plan show “Engin áætlun,” not an over-budget claim. |
| File import | CSV/Excel expense parsing, full paginated review, column mapping, per-row categories, exclusion reasons, optional local mapping/merchant rules, automatic duplicate exclusion and one final import button. `components/csv-importer.tsx`, `lib/import-*`. |
| Bills | Month-specific bills, actual payment dates, existing-expense linking/new expense choice, unlink preserving expense, deliberate month copying, integrity protections. `lib/bill-*`, bill SQL migrations. |
| Savings | Four buckets, contribution history, balance corrections, goals/monthly estimates, user-defined order/housing/goal inclusion. `lib/savings-*`, `components/savings-*`. |
| Markets | Inflation, policy rates, FX and optional attributed TradingView stock/ETF charts. `lib/market-data.ts`, market components. |
| Property tools | Housing index data and a calculator; sample property content is illustrative, not a live listings service. `lib/real-estate-data.ts`, `components/real-estate-overview.tsx`. |
| Settings | Profile, categories, appearance, password, local external-content controls, export and deletion request/cancellation. |
| Data controls | CSV transactions; JSON all ten tables plus limited account metadata, including savings preferences. Pagination, user isolation, no partial exports, private/no-store headers and CSV formula protection. |
| Onboarding/help/privacy | Open first-month checklist, Help and Privacy pages, real operator contact, explicit unknown privacy disclosures. |
| UI polish | Desktop/sidebar and mobile navigation, light/dark, open sections, scroll fades/reduced motion, top-centered feedback, grouped amount entry, responsive date inputs. |

Public source behavior: inflation and housing indexes use Hagstofa PX APIs; policy rates use IS-Macro/LCE with Central Bank XML fallback; FX uses LCE. Current cache durations are six hours for inflation/housing and one hour for policy rates/FX. Provider availability has changed before and must be retested when debugging missing values. Market failures show unavailable states. **Housing differs:** its loader can return explicitly `status: "sample"` fallback series; preserve that label and never present them as live observations.

## 5. Implemented native features and remaining differences

The native app has dashboard and six-month cash-flow history; monthly transaction search/filter/create/edit/delete; bills and payment undo; savings buckets, settings, contributions/history and goals; account/profile/recovery; top feedback; Icelandic amount formatting and native date pickers. JSON export reads all ten owned tables and uses the iPhone share sheet with temporary-file cleanup. SecureStore migration/chunking and native PKCE crypto are implemented.

It is **not full website parity**. No native bank-file importer, complete web market/property experience, or signed distribution is established. Native bill pay/undo performs multiple requests with retry reconciliation. It needs a database transaction/RPC for full cross-device atomicity. Do not assume its undo semantics are identical to the web's preserve-expense unlink flow; inspect `mobile/lib/finance-actions.ts` before harmonizing them.

All ten development-table availability probes returned HTTP 200 in recorded November checks, using ID-only/zero-row reads. This does **not** establish authenticated write permissions or successful installation/execution of the contribution RPC. The user repeatedly deferred the contribution and export/share-sheet acceptance tests. Do not mark them passed.

## 6. Database architecture and relationships

The database is defined in `supabase/schema.sql`, with existing-installation updates beside it. No ORM migration ledger is established by the repository; inspect actual installed SQL/functions/constraints and release evidence before applying anything.

| Table | Main relationships and role |
| --- | --- |
| `profiles` | `id` = `auth.users.id`; full name, currency (ISK), timestamps. |
| `categories` | Owned by `user_id`; unique user/name; type income/expense/both and default flag. |
| `transactions` | Owner, optional category, positive `numeric(12,2)` amount, income/expense type, date, note. Nullable `import_key` added for imported-row deduplication. |
| `budgets` | Owner, month, optional category and positive planned amount; unique `(user_id, month, category_id)` as defined in schema. Null category represents an overall plan in application behavior. |
| `bills` | Owner/category, series UUID, month constrained to first day, name/amount/due day/active; unique `(user_id, series_id, month)`. |
| `bill_payments` | Owner, bill, linked transaction, month/amount/paid date; unique owner/bill/month and unique non-null linked transaction. Historical null links can exist; new payments need valid expenses. |
| `savings_buckets` | Owner plus enum bucket type; label/current nonnegative amount; unique owner/bucket. |
| `savings_bucket_entries` | Owned positive contributions by bucket type/date/label/note. Request UUID is the entry ID for retry-safe RPC writes; bucket relation is logical by owner/type, not a direct bucket-ID FK. |
| `savings_goals` | Owned title, target/current amount and optional target date. |
| `savings_contributions` | Owned contributions linked to a goal; goal amount maintained by contribution triggers. Distinct from bucket-entry history. |

`auth.users` deletion cascades into owned application records. Signup triggers create the profile, Icelandic default categories and four savings buckets. Updated-at triggers maintain relevant timestamps. All ten tables have owner-oriented RLS in the schema.

Important enforced relationships:

- Composite `(category_id, user_id)` references prevent transactions/budgets/bills from pointing at another user's category. Deleting a category clears only `category_id` for transactions/bills, retaining ownership; related category budgets cascade.
- Composite `(savings_goal_id, user_id)` prevents cross-owner goal contributions; deleting a goal cascades its contributions. This migration requires PostgreSQL 15+.
- Bill triggers lock and validate matching expense and bill identities; they reject incompatible edits and duplicate links. Special handling permits authorized Auth-account cascade deletion.
- `add_savings_bucket_contribution(p_request_id, p_bucket_type, p_amount, p_date, p_note, p_label)` is security-invoker, derives owner from `auth.uid()`, returns entry ID/balance/already-recorded, and atomically updates history/balance. Retries with different payload for the same ID fail. Anonymous execution is revoked.
- The import SHA-256 key is scoped to user; unique index covers only non-null keys. Editing date/type/amount/note/owner clears the key. Existing rows are not automatically backfilled or rewritten; server preflight still compares their values.
- Internal seed/trigger functions have restricted execute permissions. Supabase may grant roles individually, so revoking PUBLIC alone is insufficient.

Auth metadata holds `savings_preferences` (version/order/housing/goal), `account_deletion_request`, and privacy-notice metadata. These are user-editable display/request facts, never access-control authority. Device-local theme/onboarding/import presets/rules and TradingView choice are separate from server records and are not all included in account exports.

### Migration inventory and recorded production state

| SQL file | Purpose / recorded state |
| --- | --- |
| `schema.sql` | Fresh empty installation; includes later integrity definitions at the end. Not safe to rerun wholesale on existing data. |
| `savings-buckets-update.sql`, `savings-bucket-entries-update.sql` | Legacy installations missing bucket/history support. Some definitions are one-time. |
| `bills-update.sql` | Month-specific bills/history; inspect target's current state first. |
| `icelandic-update.sql` | Legacy labels/defaults; does not convert money. |
| `bill-payment-integrity-update.sql` | Recorded applied to production 18 September 2026. |
| `savings-contribution-integrity-update.sql` | Recorded applied to production 18 September 2026. |
| `owner-reference-integrity-update.sql` | Recorded applied/verified in production 25 September 2026. |
| `import-deduplication-update.sql` | Recorded applied/verified in production 8 October 2026 before web release. |
| `production-readiness-check.sql` | Read-only verification aid; not a substitute for checking live operational configuration. |

Older readiness/audit documents say some migrations had not yet been applied. Those were correct at their date and are superseded by the later deployment records above. Development-project parity, backups, grants and present live state still need verification.

## 7. GitHub, hosting and environments

| System | Confirmed identifier / evidence |
| --- | --- |
| GitHub origin | `https://github.com/BjarturBlaer99/Heimafj-rm-l.git`, read from local Git |
| Handoff branch | `codex/ios-app-handoff`; remote tracking branch established 23 November |
| Native source / web base | App commit `1963654`; based on web commit `cca0eec`. Documentation follows on the handoff branch; inspect Git for its latest tip. |
| Vercel project | `supabase-personal-finance`; local `.vercel/project.json` project ID `prj_jEnELVbtwTa7aorc05pEwI4KHjdD`, org ID `team_modQQF1qyY38ZdQc7cBiuGY8` |
| Production web origin | `https://minfjarmal.vercel.app` |
| Production Supabase | Project label historically “Finance app,” ref `gtgqxgddlqcvspegvxzt`; production guard uses this ref |
| Development Supabase | Ref `bqpmkvgpedtasrbxtirs`; used for native testing; owner resumed paused project in November |
| Local web default | Root `npm run dev`: webpack Next dev, port 5173; past previews used 5191/5195 and other ports |
| Native default | `npm run start:tunnel` from mobile uses port 8082; tunnel host can change |

Web environment variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, optional `SUPPORT_EMAIL`, `PUBLIC_REGISTRATION_ENABLED`, and five `PRIVACY_*` fields listed in `.env.example`. Root README recommends `.env.development.local`. Preview origin selection can use `VERCEL_URL` when a site origin is not explicitly set. Confirm redirect origins whenever changing ports/domains.

Native environment: `mobile/.env.local`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; optional process-only startup diagnostic flag. Keys/passwords are intentionally absent from this handoff. Native app scheme is `minfjarmal`, bundle identifier/package `is.minfjarmal.app`. No EAS production build configuration was established by the reviewed workflow.

Vercel uses Next.js / `npm ci` / `npm run build` / Node 22. `.vercelignore` excludes mobile, environment files, data, logs, local build output and QA artifacts from CLI uploads. Inspect Git integration/production branch and Vercel environment settings before publishing: local project metadata is not a live dashboard check. Some previous releases used a protected candidate, `--skip-domain`, then promotion; do not infer all future pushes follow that procedure.

**Migration update:** `mobile/` was untracked when the first handoff was written. The owner then requested GitHub publication, completed on `codex/ios-app-handoff` with app commit `1963654` on 23 November. It includes 93 native source/config/test/asset/doc files. Do not commit `.env.local`, `.expo`, dependencies, session artifacts, logs or private screenshots. These are not needed in Git to restore the app. The handoff branch is not merged into `main`; clone/switch to it explicitly.

## 8. Development history and owner decisions

| Period / evidence | Important change or decision |
| --- | --- |
| April–May earlier finance chats, partially retrieved 23 November | Original prompt requested React/TypeScript/Tailwind with Prisma/SQLite; later chat summary already describes the actual Next.js/Supabase implementation. Preview-first branch releases, monthly dashboard context and Windows/OneDrive development difficulties were recorded. These old stack requests/build workarounds do not override current source or later successful build evidence. |
| Earlier conversations, dates not fully established | Fixed missing inflation/policy-rate displays; repeated requests to reduce signed-in navigation delays. Do not assume current providers are permanently reliable. |
| Earlier UI iterations | Professional finance design, improved import and settings layouts, mobile sizing/date alignment, amount grouping, top success feedback, and more visible fades. Owner repeatedly reviewed locally before asking to deploy. |
| 16–18 September research/implementation | Mercury, Copilot, Monarch, Wise, Lunch Money and YNAB informed clearer ledgers, accurate bill links, full import review, shared demo, onboarding/help/exports, and savings planning. These are design references, not code-copy requirements. |
| 18 September release | `a184a54`, release recorded by `bf0c18e`; web published and bill/savings migrations verified. `main` was fast-forwarded then; current remote branch wiring is not inferred. See `docs/releases/2026-09-18.md`. |
| 19 September | `ecc3f82`: fixed first-scroll capture caused by nested body overflow. Preserve `overflow-x: clip`. |
| 25 September | `61958b1`: natural copy/input improvements, personal savings grouping, privacy/data controls and ownership-reference protection. Operator identity/email supplied by user. |
| 25–28 September | User requested opening signup and postponing privacy work. `018a246` committed independent operator-controlled registration on 28 September. This did not resolve privacy obligations. |
| 30 September–1 October | Feature/speed review identified asymmetric half-króna rounding and misleading missing-budget history. Both were subsequently corrected, not current unresolved bugs. |
| 7–9 October | Final text/import/feedback review; concurrent import deduplication and email callback improvements. `f8ba601` deployed 8 October; `ab130a9` records rollout and successful password recovery. Owner confirmed password reset and signup worked on 9 October. |
| 9 October | `cca0eec`: demo heading explicitly changed to “Sýnigögn” instead of greeting Test. Keep sample/test identities neutral, not Alex. |
| Late October–3 November | Spesía typography study: reference fonts identified as commercial Feature Deck and F37 August. Free Fraunces/Jost experiment was tried, then owner asked to restore old fonts. QA explicitly records restoration and no production deployment of that experiment. |
| Subsequent icon conversation | Carbon icons were tried; owner asked to revert. Current source uses Phosphor. No reliable exact experiment date/deployment record is asserted. |
| November native work | App feature completion, development DB resume, secure storage/PKCE/export/contribution work, repeated launch diagnosis. Latest SDK/routing sequence is in section 3. |
| 19 November | Owner requested transfer to Claude Code. Only handoff documentation and a limited native verification check were undertaken for this request; no release authorized by it. |
| 23 November | Expanded migration to four documents, reread local Git/configuration and retrieved portions of three earlier finance chats. Documentation validation only; no fresh application test run or deployment. |
| 23 November, subsequent owner request | Published the native app as `1963654` on `codex/ios-app-handoff`, then updated/published migration docs on that branch. Native 33/33 tests, typecheck and lint passed. No merge into `main`, signed distribution or production deployment was requested or performed. |

Persistent owner preferences: polished and human-written, financially precise Icelandic; all important information open while scrolling; fades throughout with functional scrolling; top success messages; good mobile proportions and centered native date inputs; thousand separators during amount entry; adjustable savings grouping because pension should not always count toward a home purchase. Preserve these decisions unless the owner changes them.

The owner asked about buying `minfjarmal.is`, then deferred it. No registrar, ownership, DNS or certificate work is confirmed. Later migration must update Vercel domain, site origin, Supabase allowlists/templates, mobile public links, and test new email links before relying on the domain.

## 9. Verification evidence and its limits

| Date / source | Recorded result | What it does not prove |
| --- | --- | --- |
| 18 September release | 138 web tests; build/lint/types; 33 PostgreSQL checks; production bill/savings migration checks | Current latest code/live settings or all devices |
| 24–25 September privacy/ownership notes | 11 ownership checks + 33 prior DB checks; 177 app tests; production ownership migration | Full staging two-user acceptance or privacy compliance |
| 7–9 October final review | 185 web tests; 33 bill/savings DB + 11 owner DB + 12 import DB checks; 5 auth callback + 5 export integration checks; build/lint/types; 35 anonymous HTTP checks | Real-device Safari/Android, complete load testing, current dependency audit |
| 9 October owner report | Reset password worked and dashboard opened; signup worked | Cross-device/reused real email-link behavior was not separately confirmed |
| 3 November typography note | Restoration to original fonts visually verified; earlier experiment tested at narrow widths | Phone Safari rendering or deployment of experiment |
| 14 November native SDK upgrade | 30 tests; typecheck/lint; 20/20 Doctor; iOS export; public SDK 58 bundle verified | Signed binary, native workflow acceptance |
| Last native routing change | 33/33 tests; pre-fix reproduction and post-fix passes | Phone route fix still awaiting owner retest |
| 19 November handoff check | Native typecheck and lint rerun successfully against the current routing-fix source; both document link checks pass | No fresh web suite, device run, live configuration check or deployment was performed |
| 23 November GitHub handoff | Native 33/33 tests, typecheck and lint passed; candidate source scanned for common credential patterns and ignored private/generated paths checked | No fresh iOS export, phone retest, database write or production release; pending native acceptance remains pending |
| 23 November Claude continuation | 37/37 native tests, typecheck, lint, Doctor 19/20 (network-blocked check), iOS export; 10/10 web-build acceptance against a synthetic backend; root SQL suites 33/11/12 on embedded PostgreSQL 17.10. See [mobile/docs/qa/2026-11-23-claude-continuation.md](mobile/docs/qa/2026-11-23-claude-continuation.md) | iPhone/Expo Go, SecureStore, the native picker or share sheet; development Supabase was unreachable, so no real-project write was made |

October QA used an optimized Next build against an isolated synthetic Auth/REST fixture for financial writes. Separate PostgreSQL tests executed actual SQL/RLS/triggers with represented Supabase Auth claims. Anonymous production checks and some authorized signed-in read-only navigation were done separately. Do not describe fixture writes as real Supabase staging tests.

Speed evidence is limited: September/October production signed-in navigation samples ranged roughly 0.44–3.29 seconds to headings; first Bills was about 3.29 seconds vs 1.33 on repeat; first Analytics exceeded a tool wait but later loaded. Local October heading navigation was about 0.12–0.48 seconds with a synthetic backend. Public HTML samples were generally much quicker. These include automation overhead, small samples and caching differences; they are not Core Web Vitals, percentiles or a load test. Provider-loaded content can appear later than headings.

Historical zero-vulnerability web audits and November native advisories are snapshots, not a current security guarantee. Re-audit the actual lockfiles before release. The native SDK 57 audit previously had moderate tooling/tunnel issues; do not carry its exact count forward as an SDK 58 result.

## 10. Known gaps, risks and technical debt

### Immediate native work

- Confirm the explicit routing fix on the iPhone and cold-start restoration. Do not revert SDK 58 to the incompatible SDK 57 just because old QA files say 57.
- Exercise authenticated bucket contribution RPC and idempotent retry against development Supabase, not just zero-row availability probes.
- Test native date picker, amount caret/keyboard, modal safe areas, top success message, background/foreground refresh, transaction/bill edits and export to Files.
- Review multi-request native bill payment/reversal for atomic cross-device behavior.
- Update/check native callback allowlists for the new secure tunnel. Public links still target the Vercel origin.
- Review the observed Supabase `processLock` deprecation; no change has yet been made for it.
- Decide on signed development/TestFlight/App Store delivery later; Apple Developer membership and distribution setup are not confirmed.

### Web/public launch work

- Real iPhone Safari and Android touch scrolling/date controls remain unverified in the detailed final web QA. Owner was unable to test at the time.
- Measure authenticated first Bills/Analytics loads and database request volume; avoid claiming previous caching changes eliminated every delay.
- Realistic multi-user load testing and Core Web Vitals are not complete. Database concurrency tests do not cover the entire app under load.
- Reconfirm live Supabase environment/migrations and real two-user staging negative access tests. SQL test coverage is strong but not identical to a deployed provider configuration.
- Optional TradingView iframe was blank in the embedded test browser while the provider page worked separately; normal Safari/Chrome rendering needs confirmation. Consent gating was tested.
- A minor historical locale fallback rendered a deletion-request date in English; no specific later fix/real-browser confirmation is established here.
- Deletion requests have no notification worker, automatic erasure workflow, or verified operator review cadence. The user can access this feature, so an operational process is required.
- Backups/restoration, monitoring/incident ownership, email-provider configuration and provider account terms must be verified. The September Supabase dashboard was recorded as Free with no backups; this is historical, not a current subscription assertion.

### Privacy work intentionally postponed, not completed

`docs/privacy-launch-readiness.md` lists unresolved processor agreements/appropriate service terms, actual processing regions and transfers, backup/log/support retention, mailbox confidentiality, rights-request operations, risk assessment/processing records, and decisions about age scope/DPIA/DPO applicability. Its legal/provider research is dated September and must be rechecked before relying on current terms.

`npm run check:privacy` fails if the five disclosure fields are missing even when signup is open. Nonempty fields alone do not prove compliance. Ordinary users are isolated by RLS, but privileged Supabase administrators can access personal/financial records; the operator must treat that access responsibly. The app has no implemented collection of bank login credentials or national identity numbers; free-text descriptions can nevertheless reveal sensitive information.

### Enhancements discussed, not committed releases

- Reversible import batches/full undo (not just retry-safe import).
- Persistent reviewed/unreviewed transaction status.
- Automatic recurring bill schedules beyond deliberate month copying.
- Additional landing-page examples, use cases, three-step explanation and concise FAQ from the Spesía comparison.
- Custom domain `minfjarmal.is` after purchase/verification.
- Broader native/web feature parity and signed native distribution.

These are recommendations or deferred requests, not authority to build everything immediately. Automatic bank sync, paid subscriptions and currency conversion are not established roadmap commitments.

## 11. Practical verification and next steps

For the web, work from root with Node 22 and a development backend: `npm ci`, `npm run lint`, `npm test`, `npm run build`, then `npm run typecheck`; review `npm run audit:production`. Build/types must not race another Next process in the same directory. Read the SQL acceptance prerequisites before running `test:database`, `test:database:ownership`, or `test:database:imports`. Do not run a wildcard that pulls in old browser scripts.

For native, work from `mobile/`: matching Expo Go SDK, `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`; Expo Doctor for compatibility, then the normal tunnel preview. The phone cannot use the desktop's loopback address. Starting or stopping a preview is not deploying an app.

Recommended order, subject to the owner's next request:

1. Check out the GitHub handoff branch, configure the development environment and finish the pending iPhone route test.
2. Complete the native financial-write/share-sheet acceptance matrix with synthetic development data.
3. Reconfirm the web release candidate and live environment; finish phone browser and staging access checks.
4. Resolve the documented privacy/operations gaps before calling the service fully ready for public use.
5. Perform targeted performance measurements and fix demonstrated slow paths.
6. Schedule custom domain and signed app distribution separately when the owner is ready.

## 12. Source map and document precedence

- [README.md](README.md): web setup, scripts, architecture and environment rules.
- [docs/production-release-checklist.md](docs/production-release-checklist.md): release process; its old evidence section is not the latest release state.
- [docs/releases/2026-09-18.md](docs/releases/2026-09-18.md): initial verified web/migration release.
- [docs/qa/2026-10-07-final-review.md](docs/qa/2026-10-07-final-review.md): most detailed later web QA and 8–9 October production/email results.
- [docs/qa/2026-10-01-feature-speed-report.md](docs/qa/2026-10-01-feature-speed-report.md): measured speed and earlier issues; rounding/budget issues were later fixed.
- [docs/privacy-launch-readiness.md](docs/privacy-launch-readiness.md), [docs/account-data-operations.md](docs/account-data-operations.md): outstanding operational responsibilities and actual data-control behavior.
- [docs/bill-payment-deployment.md](docs/bill-payment-deployment.md): SQL contracts/testing prerequisites; later release records supersede its original “not deployed” status.
- [supabase/email-templates/README.md](supabase/email-templates/README.md): web callback/template rollout and rollback implications.
- [docs/design-research.md](docs/design-research.md), [docs/website-audit-implementation-2026-09-18.md](docs/website-audit-implementation-2026-09-18.md): design rationale and completed audit changes.
- [docs/qa/2026-11-03/typography-review.md](docs/qa/2026-11-03/typography-review.md): explicitly superseded font experiment, restored original typography.
- [mobile/README.md](mobile/README.md), [mobile/docs/qa/2026-11-23-github-handoff.md](mobile/docs/qa/2026-11-23-github-handoff.md): current native setup and publication checks. [The older QA note](mobile/docs/qa/2026-11-09.md) contains historical diagnostics; use section 3 of this handoff for the final redirect fix and pending device continuation.

When evidence conflicts, distinguish code behavior from deployment status and use later specific verification over an earlier plan. Reverify mutable external facts rather than silently choosing a convenient document. Keep new decisions/tests/deployments dated so the next handoff does not repeat this uncertainty.

## 13. Retrieval inventory and migration limits

The four root documents are intended to travel together. CLAUDE.md is the durable instruction entry point; PROJECT_CONTEXT.md explains the product and owner decisions; this file is the dated continuation record; INFRASTRUCTURE.md provides setup and service/data details. They complement the existing repository docs rather than replacing executable source or pretending to export every chat.

| Accessible source | What was recovered / limitation |
| --- | --- |
| Current finance conversation | Supplied owner requests, confirmations and clarifications, plus earlier work retained in this chat. This is not a complete transcript of every historical tool result. |
| Local repository | Manifests/lockfiles, routes, components, financial/auth helpers, SQL, config examples, native work, Git history and dated QA/release/design/operations notes. Live provider settings were not exported. |
| Earlier chat `019db725-d347-7a21-9fe4-4efe136205aa`, “Build personal finance app” | Original prompt metadata and latest three turns retrieved. Confirms original requested prototype stack, later Next/Supabase summary and old/new workspace path confusion. Older turns remain paginated and were not exhaustively retrieved. |
| Earlier chat `019ddb63-c6a7-7770-9473-481808f69889`, “Read folder” | Latest three turns retrieved. Records combined preview/release workflow and subsequent dashboard preview, plus the discovery that apparent Icelandic corruption was terminal rendering. Historical claims were not re-audited live. |
| Earlier chat `019e13d1-12d6-7343-910d-c3dcaef578e8`, preview “can you read the folder” | Latest three turns retrieved. Records development Supabase reachability trouble and later stopped-server status. It does not prove present server/database state. |
| Project/chat discovery | Finance project entries and relevant chats were located. General history discovery was partial, not an exhaustive export of all personal chats. An unrelated booking-app chat was excluded despite a superficially relevant title. |
| Uploaded files / artifacts | No complete original-project attachment inventory or attachment contents were retrieved. A current-chat artifact listing did not supply such an inventory. Local QA fixtures/screenshots and `data/2026.xls` exist; the latter's contents/origin were not examined for this package. Do not treat local file presence as proof that all uploads were recovered. |
| Project instructions | Workspace AGENTS.md was supplied/read and is imported by CLAUDE.md. Separate original ChatGPT Project custom instructions were not retrieved. Temporary tool/agent runtime instructions are not product requirements. |

The current workspace path contains `Meetings\Desktop`; an older chat used a path without `Meetings`. Use the actual checkout, not a stale absolute path. An early chat skipped local builds due to Windows/OneDrive problems; later dated web QA contains successful builds, so skipping builds is not a permanent project rule.

Not retrieved or not currently verified: full earlier conversations and uploads; current GitHub remote/protection/CI settings; current Vercel deployment/env; Supabase live schema/grants/Auth/provider/region/retention/backup state; DNS/domain ownership; SMTP service details; Apple distribution membership/configuration; exact iPhone model/iOS version; pending device acceptance. Refer to INFRASTRUCTURE.md section 10 before making operational readiness claims.

No new product roadmap was invented during this migration. Recommendations are labeled as such. No private credentials, password-reset tokens or real financial exports are included. The originally local-only native source is now published on `codex/ios-app-handoff` following the owner's explicit request. Use that branch and recreate private development configuration on the new machine.
