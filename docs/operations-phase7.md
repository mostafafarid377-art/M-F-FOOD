# Operations and release runbook (Phase 7)

This is a proposed runbook, not proof of production readiness. Migrations must not be applied, functions deployed, Paymob enabled or live data changed without explicit approval. Assign named operators, escalation contacts, RPO/RTO and data-retention periods before release; none are currently verified.

## Configuration and secrets

Use a dedicated Supabase project for staging and separate provider sandbox accounts. Verify the destination project identity in an authorized console before any command. Browser builds require `VITE_SUPABASE_URL` (HTTPS) and `VITE_SUPABASE_ANON_KEY` (public publishable key or anon JWT); both are public in the bundle and must never be service-role or secret keys. `VITE_BASE_PATH` is `/M-F-FOOD/` for repository Pages and `/` at the root; `VITE_ROUTING_URL` is optional and, if used, must be an approved HTTPS routing service. Understand and disclose that the service receives route coordinates. A missing or invalid Supabase configuration produces a service-unavailable screen in production, not demo checkout.

Set public build variables through the approved CI environment. Run `npm run validate:production-env` there without printing the values; it checks syntax, not project identity, reachability or effective privileges. Inspect the deployed artifact and URLs separately in staging. The existing Pages workflow has not been modified to invoke this validator: a real release requires an independently approved deployment configuration review. Never place secret values in command history, screenshots, logs, issues, browser code, Git or PR comments. Do not commit `.env` files. Restrict access to CI variables, Supabase and provider dashboards; review exposed historical artifacts and rotate only under an approved incident process.

The Edge runtime uses Supabase URL, anon and service-role keys, and Paymob server-side secret/public/integration/HMAC configuration. The service-role and Paymob secret/HMAC must be stored only in the approved server-side secret store. Do not publish their values. The intention endpoint is intentionally paused; no configuration flag should be treated as permission to unpause it.

## Backup and recovery

1. Record the project, operator, database version, migration version, backup time, encryption/access policy, retention, and agreed RPO/RTO. Confirm what the provider's backup includes: database, auth, storage, Edge secrets, CI configuration and external provider records may need separate protection. Never assume a database backup contains all of these.
2. Verify an encrypted, access-restricted backup and any required point-in-time recovery capability before a proposed change. Protect backup keys separately and test off-site retention per policy.
3. Restore into a **separate isolated project**, with external webhooks, cron, payments and outbound integrations disabled. Verify the project identity, then validate roles, policies, extensions, functions, relationships, representative row counts and application reads. Do not run the development seed on production or populated projects.
4. Record restore duration and recovered point, compare representative orders, cash payment records, profiles and protected data with authorized sources, and document discrepancies. Rehearse regularly; provider backup status alone is not a restore test.
5. Rollback planning must consider application/database compatibility, new constraints and writes after backup. Coordinate a maintenance window and export evidence; do not blindly restore a backup over live data or delete rows. Restoration or migration rollback needs explicit approval and a tested plan.

## Incident response and payment reconciliation

- Triage with an incident owner and protected communication channel. Preserve timestamps, request IDs, relevant audit references and versions; restrict access. Do not capture tokens, private webhook bodies, full personal addresses, card numbers or CVV.
- Contain via authorized access controls and service isolation. Paymob remains paused; do not start a new attempt or fulfill an unpaid online order. Involve security, operations and the payment provider. Preserve evidence before any approved credential rotation or recovery action.
- For a pending/processing historical payment, compare its internal payment/order ID and provider order/transaction IDs against the provider dashboard and verified signed callback. Check amount in piastres, currency, integration, order ownership, status and duplicate event history. A browser redirect is not payment proof. Existing claimed sessions should continue through the finish/webhook path; callbacks may need retry if they race the provider response. Do not manually mark an online payment paid. Escalate mismatches, ambiguous provider creation, refunds, voids and partial/child events for controlled reconciliation; the current implementation does not automate them.
- Assess impact and notification duties under applicable policy/law, fix root cause with review, then record timeline, corrective actions and recovery verification without exposing personal data or secrets.

## Location and privacy

A driver must explicitly start browser GPS sharing. The app sends the most recent position while the assigned delivery is on the way; it does not invent locations or ETAs. The database stores one current `delivery_locations` row per order, rather than a route history. Existing delivery/order transitions delete that row on relevant cancellation, reassignment or completion paths; a stalled active job can retain its last row indefinitely. No scheduled expiry is currently implemented or verified. Decide an approved stale-location TTL and a secure, audited cleanup mechanism before release; account for database backups and provider logs. Saved destinations and delivery contact details have separate persistence and require their own approved retention/deletion policy. Limit access through RLS and operational roles, test revocation and erasure, and disclose OpenStreetMap tiles and any configured routing/navigation provider to users.

## Staging checklist

- [ ] Verify isolated project and restore; record backup/restore results and rollback procedure.
- [ ] Apply migrations **only to approved staging** in order; inspect actual RLS/grants, role memberships, SQL function ownership, indexes and Realtime publication. Test new paginated RPC embedding through real PostgREST.
- [ ] Exercise current and old cash order paths, idempotency, server pricing, limits, ownership, staff deactivation, direct API calls, and unpaid-online fulfillment/dispatch denial.
- [ ] Confirm old pending/processing Paymob records can reconcile with approved synthetic sandbox callbacks; verify HMAC, amount/currency, associations, duplicate handling and refusal of unauthorized paid updates. Do not perform real transactions.
- [ ] Verify auth login, logout, recovery, account switch, WebSocket reconnect, permissions and physical GPS lifecycle. Exercise large datasets, page boundaries, filters, realtime changes and aggregate totals.
- [ ] Test root and Pages base, both languages and directions, keyboard navigation, screen readers, focus, contrast, touch targets, browser/device layouts and maps. Record issues; no accessibility conformance is claimed.

## Proposed production release checklist (requires separate explicit approval)

- [ ] Close every blocking review and staging issue; verify PR checks at the exact commit; obtain required independent approvals.
- [ ] Record approved versions, change window, on-call owners, customer communication, database and provider status, RPO/RTO and verified backups.
- [ ] Verify actual project identity and secret/configuration placement without exposing values. Approve migration/deployment order and a tested rollback/recovery plan; do not run seed.
- [ ] Keep Paymob paused, verify COD and existing callback reconciliation, observe errors, role access, database and Realtime metrics; establish a go/no-go and rollback authority.
- [ ] Conduct post-release monitoring, reconcile uncertain payments, document outcomes and schedule backup restore and access reviews.
