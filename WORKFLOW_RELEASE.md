# Customer photography workflow

This release extends customer photography requests through quotes, recorded payments,
resource allocation, preparation and delivery. Rental checkout and online payment
providers are not part of this release. Existing booking approval remains an intake
decision, never a promise that a date or costume has been reserved.

## Rollout order

1. Back up the MongoDB data volume and verify a restore into an isolated environment.
   Do not remove or recreate the production data volume as part of this change.
2. Deploy additive code with `CLIENT_WORKFLOW_ENABLED=false`. Existing intake and
   internal screens remain available. Do not populate ownership links by matching
   names or phone numbers automatically.
3. During an agreed maintenance window, opt into the replica-set overlay:
   `docker compose -f docker-compose.yml -f docker-compose.workflow.yml up -d --build`.
   The overlay reuses `mongodb_data`, creates a persistent internal-auth keyfile,
   and initializes a single-member `rs0` only if no replica set exists. It refuses
   to reconfigure a differently named set. A single-member set supports transactions
   but does not provide database high availability.
4. Verify MongoDB is a writable primary and the backend can commit a transaction.
   Keep the feature disabled if either check fails. A successful ping alone is
   insufficient. Preserve the keyfile volume along with future database backups.
5. Reconcile active legacy schedules: identify assigned photographers and precise
   times; enter garment quantities by size and their receive/return dates. Unknown
   existing usage must block confirmation rather than be treated as zero stock.
   Use the existing schedule editor's **Đối soát trang phục theo kích cỡ** section
   for unlinked schedules. Enter each selected style and size once, with the actual
   quantity; the receive/return interval must include the shoot date. Workflow-linked
   schedules use proposal/consent actions in the service detail instead.
6. Configure the bank-transfer instructions used by the customer portal and verify
   them with the studio. Do not invent bank details or publish example credentials.
7. Run the tests below, then set `CLIENT_WORKFLOW_ENABLED=true` and recreate backend
   using both Compose files. Smoke-test with a designated test customer before
   wider use. Do not run production seed scripts for this smoke test.

The base Compose file is deliberately not switched automatically. After verifying
the replica-set rollout, create an empty `.workflow-replica-enabled` file in the VPS
repository root. The deployment workflow detects this local, git-ignored marker and
continues applying the overlay on subsequent deploys. Keep the application feature
disabled until acceptance passes. Never roll back the database by deleting its data
directory or remove the marker as an application rollback mechanism.

## Required acceptance scenarios

- A guest retains their selected package, concept, garment references and form data
  through login, refresh and retry; one successful submission creates one request.
- The customer accepts a specific quote version. Changing that version requires new
  consent without discarding any money already recorded for the service.
- Underpaid deposit, missing garment sizes, unavailable garments, or a photographer
  collision prevents confirmation. Two simultaneous confirmations cannot both reserve
  the same final unit or photographer time interval.
- Member intake works before a Schedule exists; a shared link never returns the
  roster. Closing or rotating the link prevents further anonymous submissions.
- Change/cancellation is a proposal and consent flow. Existing resources remain held
  until the approved change commits. An unsuccessful reschedule leaves the original
  allocation intact. A cancelled service with money due back remains visible for
  reconciliation.
- Legacy schedule, costume and transaction endpoints cannot bypass new invariants.
  Linked documents cannot be hard-deleted; cancellation never deletes delivered files.
- A customer can request changes to a particular delivery version and accept the
  current version. Completion requires acceptance and financial reconciliation.
- Another customer, a shared-link visitor, an unrelated photographer and an
  accountant cannot perform actions outside their role/ownership scope.

## Verification

Use only a dedicated local database for automated tests. Existing integration and
browser test harnesses enforce a local host and replace the database name with their
isolated test database. The workflow transaction tests also require a replica set.
CI starts its own ephemeral MongoDB replica set; no deployment credentials are used. Independent HTTP/transaction audits run with `node --test ops/tests/*.cjs`. Before rollout, set `MONGO_URI` explicitly and run `node ops/audit-workflow-readiness.cjs`; this command is read-only and exits with code 2 when legacy data or the topology still needs attention.

Run backend/frontend unit and contract tests, Mongo integration tests, TypeScript
builds, and browser tests. Verify mobile width 360px, keyboard focus and error/retry
states on the booking and service-detail screens. A build is not evidence that
transaction isolation or the complete customer journey has passed.

## Recovery and monitoring

Monitor command failures (especially 409 conflicts and transaction-readiness errors),
services awaiting refunds, and requests stalled awaiting a studio/customer action.
Do not log passwords, member tokens, banking secrets or full class rosters.

For an application issue, disable workflow writes and preserve all persisted quotes,
payments and allocations. Do not release resources merely by switching a flag off.
Review any failed external notification/Drive operation independently of the committed
business transaction; retries must not create another payment or schedule.
