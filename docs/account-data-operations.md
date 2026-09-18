# Account data operations

The website exports account data and records deletion requests. It does not automatically delete accounts or send notification emails.

## Support contact

Set the server environment variable `SUPPORT_EMAIL` to the verified, monitored support address. Help and Settings expose that address as a contact link. Do not use an invented address. Without configuration, Help links to the existing project page and the request remains stored on the account.

## Reviewing deletion requests

The authenticated server action stores `user_metadata.account_deletion_request` through Supabase Auth. An active request contains `status: "requested"` and `requested_at`. Cancellation clears that metadata key. The operator must review these requests in Supabase Auth's Users administration (or an authorized server-side user listing). There is no background worker or notification queue in this version.

For each request, verify the account ID and request with the account owner through the registered contact before an irreversible deletion. Metadata is editable by the account holder and must not be used to authorize changes to anyone else's account. Offer an export before deletion. Use the existing Supabase administration process to delete the verified Auth user; the schema's foreign keys cascade removal of that user's application data. Follow the actual provider retention settings for backups and logs; the product makes no guarantee of immediate backup erasure.

Do not test actual account deletion against a real user during UI QA. The request/cancellation flow can be tested against the isolated in-memory preview and mocked Auth API.

## Exports

`GET /api/data/export?format=json` returns all supported application tables scoped to the verified user, plus limited account details. `format=csv` returns all transactions. Reads are paginated beyond PostgREST's default row cap. Any failed table/page causes the complete download to fail rather than silently omit records. Responses are private and not cacheable. CSV cells protect spreadsheet consumers against formula interpretation.

Device-local theme, onboarding acknowledgments, mapping presets and merchant rules are not part of server exports. No service-role key is required or exposed to the browser.
