# Claude continuation — 23 November 2026

Work continued in a Linux cloud container from `codex/ios-app-handoff` (`46818f4`) on branch `claude/gallant-hamilton-3omyou`. The owner asked to finish the app without phone testing because Expo did not work on their network that day. Nothing was deployed, merged into `main` or published. No production project or real data was used.

## Changes

- **Bill payment undo fixed.** `deleteBillPayment` deleted the linked expense before the payment. `protect_linked_bill_expense` rejects that ("Unlink the bill payment before deleting this expense."), so undo would fail on any database with `bill-payment-integrity-update.sql` installed. The previous unit fixture silently nulled the link instead and hid the defect. Undo now removes the payment first, then deletes only the expense the app generated for that bill (deterministic ID). An existing expense linked on the website, such as an imported bank row, is preserved, matching the website's unlink. A retry after an interrupted undo finishes the cleanup; a stale undo after the bill was paid again changes nothing.
- **Unit fixture enforces the trigger.** `tests/finance-data.test.cjs` now rejects deleting a linked expense like the SQL does. Four regression tests were added (37 total).
- **Expo SDK 58 patch alignment.** `expo` 58.0.26, `expo-router` 58.0.32, `expo-file-system` 58.0.14 and `expo-web-browser` 58.1.0, as Expo Doctor's version check requires, installed with `expo install --fix` (no `--force`). These remain SDK 58 and compatible with Expo Go 58.x; the device run is still pending.
- **Browser acceptance test.** `tests/web-acceptance.cjs` (`npm run test:web-acceptance`); see the mobile README for scope and limits.
- **Removed unused code.** `components/savings-editor.tsx` was an older duplicate of `savings-manager.tsx` with no references.

## Verification performed (23 November, container)

| Check | Result |
| --- | --- |
| `npm test` | 37/37 passed |
| `npm run typecheck`, `npm run lint` | passed |
| Expo Doctor | 19/20; `reactnative.directory` is blocked by the container's network policy (metadata check only) |
| `expo export --platform ios` | Hermes bundle, about 4.6 MB, built with diagnostics off |
| Web acceptance (synthetic backend) | 10/10 passed |
| Mutation checks | With the old `/(auth)` redirect, the browser test showed the same "Unmatched Route" screen the owner reported. With the old undo order, the bill undo check failed. Both pass after the fixes. |
| Root SQL suites on embedded PostgreSQL 17.10 | 33 bill/savings, 11 ownership and 12 import checks passed, including atomic idempotent `add_savings_bucket_contribution`, protected linked-expense deletion (7) and unlink-then-delete (11) |

## Not verified

- **Physical iPhone:** no device or Expo Go run of this version. Startup, sign-in, dashboard, cold restart with SecureStore, the native date picker, the 1,000 kr. contribution with top confirmation, and export to Files through the iOS share sheet all still need the owner's phone.
- **Development Supabase project `bqpmkvgpedtasrbxtirs`:** unreachable from the container (the egress proxy could not connect, which is consistent with a paused or removed project). Whether the RPC and integrity migrations are installed there is unknown. `node scripts/check-dev-backend.cjs` was not run because `mobile/.env.local` is absent.
- **`processLock`:** upstream auth-js 2.119 says the option has no effect and will be removed in v3. It was left unchanged deliberately because changing session coordination warrants a device check.

## Starting a preview from a cloud container (for later)

SDK 58's default tunnel requires an Expo account login. Without one, `EXPO_FORCE_WEBCONTAINER_ENV=1 EXPO_TUNNEL_SUBDOMAIN=<fixed> expo start --tunnel --go --port 8081` uses Expo's account-less relay (`<subdomain>.boltexpo.dev`). In this container the relay's WebSocket bypasses the HTTPS proxy, so it did not connect, and the attempt was stopped at the owner's request. Starting the preview from the owner's own computer (`npm run start:tunnel`) remains the documented path.
