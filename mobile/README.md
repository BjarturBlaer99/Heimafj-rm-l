# Mín fjármál — mobile

Native finance app built with Expo SDK 58, React Native, Expo Router, TypeScript and Supabase. This is an Expo Go testing milestone. On 14 November the user confirmed Expo Go 58.0.5, revealing a mismatch with the previous SDK 57 project. The app is now upgraded to SDK 58; typecheck, lint, 30 unit tests, 20 Expo Doctor checks and an iOS bundle export pass. The upgraded app still needs a physical iPhone retest before claiming the recurring launch crash is resolved. Contribution and native export checks remain pending.

## Available workflows

- Dashboard balances and six-month cash-flow history.
- Transactions: choose a month, search, filter income/expenses, load more, create, edit and delete. Monthly totals include all records, including months with more than 1,000 transactions.
- Bills: choose a month, create/edit/delete unpaid bills, mark paid and undo payment. Payments link to expense transactions; linked expenses must be changed through Bills. Inactive bills are excluded from active totals.
- Savings: reorder buckets, choose which count toward housing and goals, add contributions with history, correct balances and create/edit/delete goals. Preferences and contributions use the same contract as the website. Goal progress compares each goal with the selected buckets' combined balance.
- Forms: Icelandic amount grouping, native date picker and confirmation messages at the top of the screen.
- Account: edit profile name, sign up/in/out, reset passwords through email links, export account data, open support/privacy information and request or cancel manual account deletion.
- Native authentication sessions use chunked encrypted SecureStore storage, with migration from the previous AsyncStorage entry.
- Data refreshes when a screen gains focus, the app returns to the foreground, or a financial change succeeds. Pull-to-refresh remains available. Light/dark system themes and reduced-motion support are included.

## Start on an iPhone

Run commands from `mobile/`:

```powershell
npm ci
```

If `.env.local` has not been configured, copy `.env.example` to `.env.local` and enter credentials for a **development** Supabase project:

```dotenv
EXPO_PUBLIC_SUPABASE_URL="https://YOUR-DEVELOPMENT-PROJECT.supabase.co"
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="YOUR-PUBLISHABLE-OR-ANON-KEY"
```

Use the publishable/anon key, never a service-role key. Keep `.env.local` out of version control. The existing development guard rejects the production project. These changes did not modify production database data or configuration.

The development schema must include `savings_bucket_entries` and the atomic `add_savings_bucket_contribution` RPC from `../supabase/savings-contribution-integrity-update.sql`, in addition to the website's base schema. Do not bypass the RPC with a client-side read/add/write: retries and concurrent contributions must not count money twice. The table health check does not prove that this RPC has been installed.

```powershell
npm run start:tunnel
```

1. Install an Expo Go version supporting **SDK 58** on the iPhone. The project's SDK and the SDK supported by Expo Go must match.
2. Scan the terminal QR code with the iPhone Camera app and open it in Expo Go.
3. Keep the computer, development server and internet connection running while testing.

The current tunnel address is printed in the terminal and can change after a restart. Use that address or QR code rather than a previously saved link. Restart Expo after changing environment variables.

### Authentication email redirects

In the development project's Supabase Authentication URL Configuration, allow both redirects for the current Expo tunnel host:

```text
exp://<current-tunnel-host>/--/auth-callback
exp://<current-tunnel-host>/--/reset-password
```

SDK 58's secure tunnel may use `exps://` and an `on.expo.app` host instead. Match the exact scheme and host returned by `authRedirectUrl`; do not reuse the old `exp.direct` address. Update the allowlist when the tunnel host changes, then request a fresh email. Open the link on the **same device and app installation that requested it**: PKCE needs its stored verifier. Native crypto support is included.

Future standalone builds use these scheme-based redirects instead:

```text
minfjarmal://auth-callback
minfjarmal://reset-password
```

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npx expo export --platform ios --output-dir dist-ios
node scripts/check-dev-backend.cjs
```

The current auth/finance/readiness suites cover validation, retries, account ownership, preferences, complete exports, encrypted storage migration and malformed links. See `docs/qa/2026-11-09.md` for the latest results. The backend check makes read-only `select=id&limit=0` requests to ten tables. This confirms endpoint/schema availability; it does not exercise authenticated writes.

The older `tests/iphone-smoke.cjs` captures the previous savings UI and is not a release check for this version. Its earlier fixture-based browser results must not be reported as current device or live-database validation. The user previously confirmed that the Expo Go preview opens on their iPhone; the new workflows still require an on-device walkthrough.

The companion web preview uses client rendering (`web.output: single`); the existing production Next.js website is a separate app.

App icons and splash assets are generated from `assets/images/min-fjarmal-mark.svg` by `scripts/generate-icons.cjs`. Regeneration uses `sharp`, available in the workspace tooling; generated PNG assets are included.

## Remaining release work

### Current crash isolation

`index.js` normally loads `expo-router/entry`. Only a development server explicitly started with `EXPO_PUBLIC_STARTUP_DIAGNOSTIC=1` loads `diagnostics/startup-entry.tsx` instead. This plain React Native screen is labelled `STARTUP TEST A` and has a counter. It does not initialize finance screens, auth/storage, navigation or custom fonts. Do not interpret this isolation build as a fixed app. The opt-in flag is set only in the preview process environment, not in `.env.local`; restart without it to restore the normal app. A regression test confirms production always selects the normal entry even if the flag is set.

The diagnostic preview also closed on the user's phone before the SDK mismatch was identified; its screen was not confirmed visible. After upgrading to SDK 58, the preview was restarted with diagnostic mode disabled to test the full app. If it still closes, collect the matching native iOS crash report and device/iOS versions before attributing the failure to a particular module.

On the physical iPhone, verify keyboard behavior, safe areas, recovery email links, foreground refresh and the create/edit/delete flows against the development project.

Also verify savings ordering and housing selections after a cold restart, a single contribution after a retry, and JSON export through the native share sheet. Account-deletion requests are stored for manual handling; this version does not automatically delete accounts or notify the operator.

SDK 58's Router no longer uses `query-string`, so the `decode-uri-component` dependency and override have been removed. The historical compatibility copy and its MIT license remain in `vendor/` for reference but are not installed. The regression test now exercises the installed Router's parser with Icelandic text and malformed percent escapes.

Bill payment and expense writes are recoverable across retries, but span multiple requests. Fully atomic behavior across devices requires a future database transaction/RPC.

No signed iOS build, TestFlight distribution or App Store release has been produced. The Windows workflow currently prepares the JavaScript bundle and serves Expo Go; it does not build a local native iOS binary.
