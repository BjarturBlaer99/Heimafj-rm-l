# Mín fjármál — product context and decision record

Prepared **23 November 2026**, Atlantic/Reykjavik. This document explains the product and the reasons behind its current behavior. Read [CLAUDE.md](CLAUDE.md) for implementation rules, [HANDOFF.md](HANDOFF.md) for dated status and pending work, and [INFRASTRUCTURE.md](INFRASTRUCTURE.md) for systems and data contracts.

## Evidence and scope

**Owner requirement** means explicitly requested in the supplied conversation. **Implemented** means supported by inspected source, not necessarily freshly tested or deployed. **Recorded result** means a historical QA/release or conversation result. **Proposed** means a next step, not an agreed or shipped feature. Live infrastructure and real-device behavior were not rechecked for this document. Do not turn these distinctions into an unconditional claim that the service is ready for public use.

The available conversation describes many iterations but does not contain every earlier assistant action. Additional local finance chats were partially retrieved; source files, Git history and repository notes provide stronger evidence of the present implementation. No complete export of the original ChatGPT Project, its custom instructions or its uploaded attachments was available. See the retrieval inventory in HANDOFF.md.

## Purpose, audience and scope

Mín fjármál is an Icelandic personal-finance website and a developing iPhone companion. It helps people record and understand income, spending, monthly plans, bills and savings in one place. The owner wants a professional financial product that reads as if a real person with financial knowledge wrote it, works smoothly on phones, and can eventually be offered publicly.

The original build request described a single-user React/TypeScript/Tailwind app with Prisma and SQLite. That is historical intent, **not the current architecture**: the inspected product uses Next.js and Supabase with separate user accounts and ownership protections. No documented multi-person household sharing, delegated adviser access, business accounting or organization administration is established.

The product currently supports ISK, manual records and reviewed expense-file imports. It is not an automatic bank feed, payment service, brokerage, tax filing tool or multi-currency conversion product. There is no implemented paid-subscription checkout. The owner's question about an app-related subscription is not evidence of a customer subscription business model; pricing and monetization remain unspecified.

The operator supplied the name **Bjartur Blær Gunnlaugsson** and public support/privacy address **bjarturbbg@gmail.com**. Do not invent a company, registration number, certifications or additional support channels. Contact configuration is in [lib/privacy-config.ts](lib/privacy-config.ts).

## What the owner consistently values

| Requirement | Product implication and rationale |
| --- | --- |
| Professional appearance, without a generic AI-generated feel | Use clear hierarchy, restrained colors, consistent spacing, deliberate typography and useful financial information. Avoid decorative filler, fabricated trust claims and empty marketing copy. |
| Natural, financially precise Icelandic | Explain the actual result in familiar language. Distinguish recorded amounts, plans, estimates and external observations. Do not mechanically translate English interface patterns. |
| Fast navigation while signed in | The repeated complaint concerned switching between authenticated sections. A fast landing page alone does not resolve it. Measure first and repeat private-page transitions. |
| All important content visible while scrolling | Keep primary data, forms and sections open; avoid hiding them in accordions. Ordinary select inputs are still appropriate where they select a value. |
| Visible fade-in animations throughout | Preserve the visual rhythm while keeping scrolling, keyboard focus, anchor navigation and reduced-motion use functional. Content must not remain hidden when animation initialization fails. |
| Mobile proportions and centered date inputs | Safari on iPhone was explicitly identified. Desktop device emulation is useful but is not a substitute for real Safari acceptance. |
| Thousands separators while typing | Amount fields should display familiar Icelandic grouping without changing the intended amount or losing the caret. |
| Success messages at the top | Confirmation should be immediately visible after saving a transaction, savings change or another action; avoid the former bottom-right placement. |
| Review appearance before production | Many iterations were previewed locally and published only after an explicit deployment request. A new design request is not itself a production release instruction. |
| Complete authorized work | Investigate and finish within scope; do not repeatedly ask permission for routine reversible changes. Explain actual blockers and distinguish passed checks from deferred checks. |

## Design decisions and reversals

Research recorded in [docs/design-research.md](docs/design-research.md) and [docs/website-audit-implementation-2026-09-18.md](docs/website-audit-implementation-2026-09-18.md) used products such as Mercury, Copilot, Monarch, Wise, Lunch Money and YNAB as references for clearer ledgers, monthly context, navigation and planning. These are design references, not permission to copy their branding, assets or claims.

The owner later referenced Spesía. The conversation identified Feature Deck and F37 August as the reference fonts and discussed licensing. Free alternatives Fraunces/Jost were tried; the owner ultimately requested the old typography again. The restoration is recorded in [the typography review](docs/qa/2026-11-03/typography-review.md). Current web styling uses an Inter/system body stack and Georgia/serif headings. Do not reintroduce either experiment or imply that commercial font licenses were purchased. Exact font loading should be checked in the current CSS rather than inferred from a font-family name.

Carbon icons were also tried and then explicitly reverted. Current web source uses Phosphor; the native app uses its own Material Icons implementation. The two products need not use identical library code.

The current visual direction uses light paper/surface tones, dark text, blue accents, restrained borders and financial tables/charts. Dark mode is implemented. Reuse tokens and shared components from [app/globals.css](app/globals.css), [tailwind.config.ts](tailwind.config.ts) and [components/ui.tsx](components/ui.tsx), instead of introducing a competing design system.

Financial amounts should align consistently and use tabular numerals. Success, warning, unavailable and sample-data states should have explicit words, not color alone. Keep labels associated with controls, readable contrast, visible focus and adequate mobile touch targets. These are ongoing implementation requirements, not a claim of a completed accessibility certification.

Specific copy decisions to retain:

- Use **“Innskráning”** for the login label requested by the owner.
- Use **“Sýnigögn”** at the top of the demo, rather than greeting “Test.”
- Use neutral sample identities such as **Test User**, not Alex. Never include real account data in the public demo.
- Write concise, action-specific confirmations only after a successful operation. A failed or partial operation must not show a success message.
- Avoid saying that a displayed cash-flow result is the user's bank balance, that sample properties are live listings, or that a calculation guarantees an investment outcome.

## Core financial concepts

### Transactions, monthly views and plans

Transactions store a positive amount plus an explicit income/expense type, a calendar date, an optional category and note. Shared validation and formatting must preserve this separation; formatted strings are not database amounts. Icelandic grouping uses periods, decimal input can use a comma, and display uses ISK/kr. Preserve the tested rounding behavior, including negative summary values and half-króna cases.

Dashboard and monthly views summarize **recorded income minus recorded expenses**. This is cash flow for the chosen period. It does not establish a bank balance because opening balances, all accounts and automatic bank synchronization are not modeled. Unpaid bills represent separate commitments and must not be silently counted as already-recorded expenses.

The transaction ledger supports search, periods, editing, deletion and categorization. Date filters need consistent inclusive/exclusive boundaries and sensible empty states. Calendar dates should not move a day because of timezone conversion. Categories belong to an account; the database must also reject cross-account references.

Budgets represent plans, not actual spending. Months without a plan show **“Engin áætlun”**, not a misleading “over budget” result. That misleading historical behavior and asymmetric rounding were found in speed/feature QA and subsequently fixed; they are not unresolved bugs simply because an old report mentions them.

### File import: automatic exclusions and one final action

The owner explicitly requested a simpler import flow: duplicates are excluded automatically, and after reading/reviewing the file the user needs one final import button. The implemented web importer is for **expenses**, not a general multi-type bank synchronization engine.

The intended flow is:

1. Select a CSV/Excel file. Parsing happens in the browser; the original file is not uploaded for permanent storage by this flow.
2. Resolve column mapping and review parsed rows. Invalid rows and duplicates show exclusion reasons. Parsed rows can be sent to the authenticated server for checks; do not describe the entire workflow as offline.
3. Automatically exclude existing and within-file duplicates. Valid rows are ready for one final action, with optional category corrections rather than a required second approval stage for every row.
4. Import all selected valid rows, including those on other review pages. Show the actual outcome at the top and refresh the affected financial data.

The current limit is 1,000 rows per batch. Review pagination must not silently reduce the imported set to the visible page. Mapping presets and merchant/description rules are optional device-local preferences scoped by user; they are not a server-hosted bank integration.

Duplicate detection normalizes the identifying date, amount and description, including case/whitespace differences. Stable request IDs and a user-scoped database import key protect retries and concurrent imports; the server checks again before writing. This is deliberate because a disabled button alone cannot prevent duplicate writes. Existing manual transactions still matter to preflight checks, while intentionally identical manual entries remain allowed. Do not install a global uniqueness constraint on all transactions or erase historical duplicates automatically.

Source: [components/csv-importer.tsx](components/csv-importer.tsx), [lib/import-parser.ts](lib/import-parser.ts), [lib/import-review.ts](lib/import-review.ts), [lib/import-actions.ts](lib/import-actions.ts), [supabase/import-deduplication-update.sql](supabase/import-deduplication-update.sql).

### Bills and recorded payments

Bills are month-specific commitments connected by a series identifier. Copying a month is deliberate; it is not an automatic recurring billing scheduler. A bill's due day and the actual payment date are different facts.

The web can link a bill payment to an existing expense or explicitly create a new expense. This avoids counting the same payment twice when it was already imported from a bank file. SQL protects ownership, amount/date consistency and conflicting transaction links. Web unlinking preserves the expense, because removing the bill association does not mean the money was never spent.

The native implementation currently has different pay/undo behavior and multiple requests. Do not assume complete atomicity or identical undo semantics; that is pending review. See HANDOFF.md and [mobile/lib/finance-actions.ts](mobile/lib/finance-actions.ts).

### Savings must reflect the person's circumstances

The owner gave a concrete example: someone who already bought a home may not want private pension savings included in housing savings. Therefore the user can choose bucket ordering and membership in housing/goal totals. These are presentation preferences, **not movements of money**. Changing membership must not change balances or delete contributions.

There are four persisted bucket types: private pension, housing savings, shares and funds. Preserve the actual database enum strings, including `serignarsparnadur`; renaming a misspelled identifier requires a coordinated migration, not a copy edit. Default housing membership includes pension and housing, preserving older-account behavior. Default goal membership includes all four. Invalid preference metadata falls back safely rather than hiding balances.

Bucket balances/history and separate savings goals/contributions are distinct database concepts. A contribution to a bucket must atomically record history and update its balance; retries with the same request must not add it twice. A balance correction must not masquerade as a new contribution. Goal estimates divide the remaining amount over the current month through the target month, rounded up, without assumed investment growth. Met, overdue, undated and unavailable plans have distinct states.

Sources: [lib/savings-preferences.ts](lib/savings-preferences.ts), [lib/savings-plan.ts](lib/savings-plan.ts), [lib/savings-data.ts](lib/savings-data.ts), [supabase/savings-contribution-integrity-update.sql](supabase/savings-contribution-integrity-update.sql).

## Public financial information and trust

Inflation, policy rates, FX and housing indicators are public information, separate from the user's private ledger. Missing policy-rate/inflation displays were an early recurring issue. Provider requests should time out and fail visibly without blocking the core account dashboard indefinitely.

Market failures show unavailable states. The housing loader has a separately labeled sample fallback; its sample status must survive into the UI. Property examples/calculators are not a verified live property listing feed. TradingView embeds require the user's choice and provider attribution, and must not receive personal financial records. No stock API subscription or provider service-level agreement is established by these docs.

## Account controls, privacy and launch expectations

The user asked for privacy readiness before public launch, supplied operator/contact details, and later explicitly requested opening signup while postponing privacy work. Both decisions must be preserved accurately: signup is an independent operator switch, and opening it **does not mean privacy work is complete**. Do not silently restore an obsolete privacy-based signup gate or claim legal certification.

The app provides a privacy page, account export, a deletion request and cancellation. JSON export covers all ten owned financial tables plus limited account metadata including savings preferences; CSV export covers transactions. Exports must fail as a whole if a page cannot be read, protect against spreadsheet formula injection, and avoid shared caching.

Deletion requests are metadata for a manual operator process. There is no established automatic deletion worker or notification email. The operator needs to review and fulfill requests through a documented process. User-editable Auth metadata cannot grant access rights. RLS isolates ordinary users, but a privileged Supabase administrator can access stored personal financial records. The product is not end-to-end encrypted against its operator.

Provider agreements, actual regions, transfer safeguards, retention, backup recovery and handling of rights requests require verified operational facts. [docs/privacy-launch-readiness.md](docs/privacy-launch-readiness.md) and [docs/account-data-operations.md](docs/account-data-operations.md) track these gaps. This package records existing requirements and gaps; it is not a new legal assessment.

## Native companion and remaining product decisions

The owner's chosen near-term native goal was **“ready to test on my iPhone”**, using Expo Go. A signed App Store release was not established. The app includes major finance/account screens, but web file import and the complete market/property experience are not established native features.

Repeated full Expo Go exits led to SDK compatibility work. After the SDK 58 upgrade, the owner reported that the app stayed open but showed Unmatched Route. A local guard/route fix has regression coverage; a phone retest is still outstanding. Do not confuse that progress with completed native acceptance. The 1,000 kr. contribution/date/top-message and export-to-Files tests were repeatedly deferred, not passed.

Domain purchase (`minfjarmal.is`) and signed distribution are deferred. Monetization, household sharing, bank synchronization and a full native parity roadmap have not been agreed. Persistent import history/undo and automatic recurring transactions are possible improvements mentioned in audit work, not promises or completed features.

On 23 November the owner requested publishing the iPhone app to GitHub for the Claude migration. Its source, assets, lockfile and tests are now on `codex/ios-app-handoff`, starting with commit `1963654`. This is a source-code handoff, not an App Store or production-web release. The four migration documents accompany the branch. Private environment configuration must be supplied separately.

The next priorities are evidence-driven: check out the handoff branch and configure the development environment; finish route and financial-write acceptance on the development project; recheck the web candidate and real phone behavior; close operational privacy gaps; then measure remaining authenticated navigation delays. Detailed acceptance tasks and historical test limits are in HANDOFF.md.
