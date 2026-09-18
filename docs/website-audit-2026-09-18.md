# Mín fjármál: website and product audit

Reviewed 18 September 2026. Research and recommendations only; this audit does not change or deploy the website.

## Assessment

The current design has a recognizable identity: restrained colors, editorial headings, aligned financial figures, and consistent navigation. The largest remaining opportunities are trustworthy data states, fewer repetitive steps, and clearer guidance for new users.

Keep the existing Icelandic identity, light and dark themes, success feedback, visible scrolling sections, and fade-in motion. Recommendations below preserve the preference for open information and editing controls rather than accordions.

## Scope and evidence

- Read current official product pages and documentation from Mercury, Lunch Money, Copilot, Monarch, and YNAB. These are useful references, not an objective ranking or evidence that any particular design improves conversion.
- Inspected the localhost landing page, login, and public demo in the browser. Reviewed the current source for authenticated dashboard, transactions, imports, bills, savings, settings, and data actions.
- The local authenticated preview redirected to login, so authenticated findings in this audit are source-based, not completed end-to-end session tests.
- No production performance benchmark, real iPhone Safari test, customer interviews, or security assessment was performed. The findings apply to the current working tree; production may differ.

## What other products do well

| Reference | Observed pattern | Useful application here |
| --- | --- | --- |
| [Mercury transactions](https://mercury.com/blog/updated-transactions-page) | The chart and transaction table share filters; the ledger supports grouping, saved views, and bulk category edits. | Keep the active period and totals consistent. Make records easy to scan and allow batch corrections. |
| [Lunch Money CSV import](https://support.lunchmoney.app/guides/import-via-csv) | A staged import flow covers mapping, settings, transaction review, and saved import configurations. | Let users inspect every imported row and remember a bank-file layout for the next upload. |
| [Lunch Money rules](https://support.lunchmoney.app/setup/rules) | Reusable rules operate on imported and manually entered transactions. | Offer understandable merchant-to-category rules that reduce repeated work. |
| [Copilot quick start](https://help.copilot.money/en/articles/11157550-quick-start-guide) | Setup introduces transactions, budgets, recurring payments, and goals as connected tasks. | Guide users through their first useful month with a short, visible checklist. Do not imply that Copilot's US bank connections are available in Iceland. |
| [Copilot recurring payments](https://help.copilot.money/en/articles/3783837-editing-recurrings) | An existing transaction can be linked to a recurring payment. | Let a user match an imported expense to a bill instead of creating another expense. |
| [Monarch transaction review](https://help.monarch.com/hc/en-us/articles/5528707082516-Reviewing-Transactions) | Transaction review is an explicit workflow. | Distinguish imported records awaiting review from records the user has checked. |
| [YNAB targets](https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC?mobile-help=true) | Dated targets translate a future amount into periodic saving requirements. | Explain how much to save each month to reach a goal, with visible assumptions. |
| [Copilot settings](https://help.copilot.money/en/articles/11062072-settings-overview) | Settings include practical account and data controls beyond appearance. | Make help, export, and account-management options easy to find. |

## Priority 1: make displayed figures dependable

### 1. Distinguish unavailable data from zero

**Confirmed in source:** transaction and goal reads discard query errors and return empty arrays. Savings bucket reads return zero-valued fallback buckets on errors. Savings totals are rendered before the unavailable-state message. Depending on the screen, a failed read can therefore look like no transactions, no goals, or no savings.

Evidence: `lib/data.ts:67–81`, `lib/data.ts:120–144`, `app/(app)/savings-goals/page.tsx:35–38`.

**Recommendation:** return explicit success/error states. Show an unavailable indicator and retry action for a failed read. Use zero only after a successful read establishes zero. If retaining previous figures during a refresh, label them as previous data.

**Acceptance check:** simulate a failed transaction and savings read; neither screen should display a new authoritative zero balance or invite first-time setup as though the account were empty.

### 2. Make month and custom date ranges unambiguous

**Confirmed in source:** transactions default to the current month, while the query also applies the From and To fields. These constraints intersect. For example, an August custom range with September still selected returns no matching records even if August has transactions.

Evidence: `app/(app)/transactions/page.tsx:50`, `lib/data.ts:70–76`.

**Recommendation:** provide a clear choice between a month and a custom range, then display the effective period beside the totals. Preserve the selected period when navigating between summaries and records. This can use visible controls without a collapsed panel.

**Acceptance check:** an August range returns August records without requiring the user to discover and clear an unrelated September filter. Summary links retain the same period.

### 3. Resolve currency semantics

**Confirmed in source:** settings allow a three-letter currency code. The dashboard uses that preference, while transactions, bills, and savings use ISK. The formatter changes the suffix without converting the numeric value.

Evidence: `app/(app)/settings/page.tsx:44`, `app/(app)/dashboard/page.tsx:31`, `app/(app)/transactions/page.tsx:55`, `app/(app)/bills/page.tsx:23`, `app/(app)/savings-goals/page.tsx:19`, `lib/format.ts:1–8`.

**Recommendation:** establish ISK as the explicit supported currency for the current product, or implement consistent currency storage and display rules throughout. A display preference must not suggest that existing amounts were converted.

**Acceptance check:** the same record has the same currency and amount in every screen, and changing a preference cannot silently relabel ISK as another currency.

### 4. Make recording bill payments accurate

**Confirmed in source:** marking a bill paid creates a new expense and uses the scheduled due date as the expense and payment date. An expense already imported from a bank file cannot be selected as that payment. Recording it again can double-count spending; the audit did not establish that this has occurred in an actual account.

Evidence: `lib/actions.ts:259–280`.

**Recommendation:** let the user link an existing expense or explicitly create a new one, with the actual payment date visible and editable. Later add a deliberate “copy last month's selected bills” action with duplicate protection, followed by recurring schedules if needed. This adapts the transaction-linking pattern documented by [Copilot](https://help.copilot.money/en/articles/3783837-editing-recurrings).

**Acceptance check:** importing a payment and then marking its bill paid can result in exactly one expense. A payment made after its due date records the actual date.

## Priority 2: reduce work in the most frequent flows

### 5. Complete the import review experience

**Confirmed in source:** imports can contain up to 1,000 rows, but the visible preview shows the first 25. The preview limit is disclosed, yet users cannot inspect the remaining rows or correct categories individually there. Invalid dates, invalid amounts, and non-expense rows are skipped without a detailed per-reason review. The importer intentionally accepts expenses; it is not a general income-and-expense importer.

Evidence: `components/csv-importer.tsx:499–510`, `components/csv-importer.tsx:724–749`.

**Recommendation:**

- State the supported transaction types before file selection.
- Provide a paginated or scrollable review of all accepted and excluded rows, with specific exclusion reasons.
- Allow per-row category corrections and show likely duplicates for review.
- Save reusable file mappings and optional merchant category rules.
- Show the final imported, skipped, and duplicate counts. Consider reversible import batches as a separate enhancement; do not promise undo until storage and recovery support it.

The staged review and saved mapping patterns are supported by [Lunch Money's import guide](https://support.lunchmoney.app/guides/import-via-csv); category automation is documented in its [rules guide](https://support.lunchmoney.app/setup/rules).

**Acceptance check:** a 100-row file can be reviewed completely, one incorrect category can be corrected without changing every row, and a second file in the same format does not require repeating the mapping.

### 6. Make transaction records compact while keeping them open

**Confirmed in source:** each transaction has a display row followed by a full editing form that repeats the same information. On mobile this becomes a stacked sequence of repeated fields. The structure is confirmed; its effect on task time has not been measured.

Evidence: `app/(app)/transactions/page.tsx:31–42`, `app/(app)/transactions/page.tsx:94–101`.

**Recommendation:** use one compact, always-visible editable record. Give description/category, date, amount, and save state consistent positions. Keep all editing fields accessible in the scrolling page. Add bulk category changes once the individual-row layout is clear. [Mercury's ledger](https://mercury.com/blog/updated-transactions-page) is a useful reference for shared filters and bulk actions, not a requirement to copy its exact interface.

Related navigation issue: income currently loads across months, while its transaction link defaults to the current month. Recent dashboard records link by description search, so repeated descriptions can resolve to multiple records. Preserve time scope and use stable transaction IDs or anchors.

Evidence: `app/(app)/income/page.tsx:17`, `app/(app)/income/page.tsx:43`, `app/(app)/dashboard/page.tsx:107`.

## Priority 3: help people understand and complete setup

### 7. Align the demo, homepage, and real product

**Confirmed in browser and source:** the demo uses the older three-card dashboard and “Eftir mánuðinn” language. The current authenticated dashboard uses a different hierarchy, “Afkoma mánaðarins,” and a separate unpaid-bills section.

Evidence: `components/demo-app.tsx:99–150`, `app/(app)/dashboard/page.tsx:63–89`.

**Recommendation:** render the demo from the same screen components with sample data. Keep the clear sample-data label. On the homepage explain the actual steps: create an account, enter or import supported records, check categories, and view the month. State the current cost, supported imports, and whether bank synchronization exists using verified product facts.

Add an open first-month checklist with direct actions: first import or entry, category review, first bill, and one savings goal. [Copilot's quick start](https://help.copilot.money/en/articles/11157550-quick-start-guide) provides a useful sequence, adapted to this product's manual/import workflow.

**Acceptance check:** the demo matches the real dashboard, and a new visitor can explain how their data gets into the app before signing up.

### 8. Add useful data and help controls

**Confirmed in source and public navigation:** settings offer profile, appearance, categories, password changes, and sign-out. Public and app footers do not offer a dedicated help or privacy destination. There is no visible export or account-deletion-request flow in the reviewed settings.

Evidence: `app/(app)/settings/page.tsx`, `app/page.tsx`, `components/app-footer.tsx`.

**Recommendation:** add a clearly visible “Gögn og aðstoð” area: export records, import guidance, contact/help, an accurate explanation of data handling, and an account-deletion request or supported deletion flow with clear consequences. These are product-transparency improvements, not findings of a security or legal violation. [Copilot settings](https://help.copilot.money/en/articles/11062072-settings-overview) are a useful reference for practical data controls. Never borrow another company's security claims or certifications.

### 9. Turn savings targets into an actionable plan

**Confirmed in source:** goals show target amounts and dates without calculating a required monthly contribution. The screen displays eight history entries, fetched from the latest twenty entries across all savings buckets. A bucket with older activity can consequently be described as having no contribution when none appears in that limited result.

Evidence: `lib/data.ts:148–153`, `app/(app)/savings-goals/page.tsx:54`, `app/(app)/savings-goals/page.tsx:84–97`.

**Recommendation:** fetch the actual latest entry for each bucket and provide access to the full history. For dated goals, show the monthly contribution needed from the remaining amount and remaining contribution periods. Make assumptions explicit, including the current month's inclusion and whether investment growth is excluded. Handle overdue and already-met goals separately. [YNAB's targets](https://support.ynab.com/en_us/getting-started-with-targets-ryAEP08xC?mobile-help=true) show the value of translating a goal into periodic contributions.

## Performance and motion follow-up

The demo currently awaits market and property data before rendering its main client screen (`app/demo/page.tsx:12`). That is a potential dependency to remove or stream separately; this audit does not quantify its production cost.

Before further performance work, measure authenticated navigation in a production build, separating route response, rendering, and animation timing. Keep the requested fades, respect reduced motion, and verify that visible controls, keyboard focus, and financial figures do not feel delayed by the entrance effects. Confirm responsive behavior on a real iPhone Safari session as a separate check.

## Recommended implementation order

1. Error states, period filters, currency consistency, and correct bill-payment recording.
2. Full import review and compact, open transaction editing.
3. Shared demo screens, first-month setup, and practical data/help controls.
4. Savings contribution planning, complete history, and recurring-bill conveniences.

This order addresses correctness before expanding the product, then concentrates effort on importing, reviewing, and understanding a month of finances.
