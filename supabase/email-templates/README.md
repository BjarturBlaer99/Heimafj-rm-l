# Email-link rollout

Deploy the callback code before changing these templates in Supabase Authentication → Emails. Until then leave the live templates unchanged. Changing templates first would send links the old production callback cannot process.

1. Apply `../import-deduplication-update.sql` before deploying the new importer. It adds a nullable key and unique index; it does not rewrite existing transactions.
2. Deploy the web app normally so Vercel builds with its production environment. Do not deploy the synthetic local `.next` build.
3. Set the **Confirm sign up** subject to `Staðfestu netfangið þitt — Mín fjármál` and body to `confirm-signup.html`.
4. Set the **Reset password** subject to `Veldu nýtt lykilorð — Mín fjármál` and body to `reset-password.html`.
5. Keep Site URL at `https://minfjarmal.vercel.app`. These templates deliberately use the production Site URL, never an arbitrary return URL.
6. Request new signup and recovery emails. Open each in a different browser/device from the request. Confirm signup opens the dashboard and recovery opens `/reset-password`; the account owner must enter and submit their new password. Confirm a reused link is rejected.

The callback still accepts old PKCE links, which require the original browser's verifier. New templates verify a single-use email token directly, as documented by [Supabase's Next.js guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs). [PKCE limitations](https://supabase.com/docs/guides/auth/sessions/pkce-flow) explain why code exchange fails in a different browser. Actual inbox delivery and completing the new flow must be verified after deployment; unit tests alone do not certify them.
