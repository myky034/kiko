# Kiko — Access Control Specification

**Version:** 1.0 — Proposed implementation baseline  
**Updated:** 2026-10-16  
**Scope:** Authentication, RBAC, ownership, resource visibility, database, storage, jobs, and administrative operations.  
**Languages:** Chinese (`zh`), Japanese (`ja`), English (`en`).

## 1. Status and sources

This document operationalizes the Kiko design discussed in the conversation: **RBAC plus resource ownership**, with `OWNER` and `LEARNER`. The initial personal account holds both. The original Project Spec v1.0 grouped Owner/Learner; align that section with this matrix before implementing authorization. `ARCHITECTURE.md` describes the proposed server-first data boundary; `AGENTS.md` describes agent working rules.

Permission identifiers, account lifecycle, revision checks, and catalog lifecycle below are proposed concrete rules for implementation review, not evidence that the system already enforces them. Authentication provider and deployment configuration remain unselected. Where unavailable, deny the action rather than adding an implicit permission. No real identifiers, emails, credentials, or tokens belong in this document.

## 2. Principles

1. **Deny by default:** every operation needs an explicit permission and authorized resource scope.
2. **Server authority:** derive identity from a verified session; roles, ownership, and account state come from trusted server data.
3. **Ownership is required:** a role is not permission to access all rows of that type.
4. **Separate administration from learning:** `OWNER` configures Kiko but cannot automatically inspect others' private learning data.
5. **Private by default:** a personal lesson, recording, attempt, deck, or export never becomes shared implicitly.
6. **Least privilege:** worker, runtime database, migration, and integration credentials have different duties.
7. **Every path counts:** apply policy to lists, joins, batch operations, downloads, signed URLs, exports, imports, background jobs, and caches.
8. **UI is not enforcement:** hiding a button does not secure an endpoint.
9. **No client role/owner trust:** reject mass assignment and cross-owner nested references.
10. **No language privilege:** zh/ja/en are content attributes, not security roles.

## 3. Actors and account lifecycle

### 3.1. Interactive actors

| Actor | Definition | Access |
|---|---|---|
| Anonymous | No valid session | Sign-in and explicitly public application assets only |
| Authenticated but not allowed | Provider identity exists; Kiko account not active/allowed | Safe access-denied screen and sign-out; no learning data |
| Active Learner | Allowed account with `LEARNER` | Own learning resources and published shared catalog |
| Active Owner | Allowed account with `OWNER` | Administration and shared catalog management; no personal-data bypass |
| Active Owner + Learner | Both roles | Union of the above, preserving ownership restrictions |
| Suspended/removed account | Kiko access disabled regardless of provider login | No protected operations or new signed links |

Suggested Kiko states: `pending`, `active`, `suspended`, `removed`. A provider-created user is not automatically active. Public registration is disabled by default. Account admission and bootstrap behavior must be implemented deliberately.

### 3.2. Service actors

| Identity | Permitted duty | Prohibited shortcut |
|---|---|---|
| Web runtime | Authorized application use cases | Expose privileged keys to browser |
| Job worker | Execute a valid, scoped persisted job | Accept arbitrary SQL, owner changes, or URLs as commands |
| Cleanup worker | Expired staging/objects selected by policy | Browse recordings for unrelated purposes |
| Migration identity | Approved schema changes in the target environment | Used by normal web requests |
| Backup/restore operator | Approved disaster recovery with protected access | Interactive product role that reads everyone's content |

Service credentials may technically have broader platform access. Record and minimize this capability; it does not create a product permission or consent to use it. Operational access to storage/backups must be restricted separately from RBAC.

## 4. Roles

### LEARNER

Creates and studies personal content; manages their own vocabulary, decks, recordings, writing attempts, review history, and exports. May read published shared lessons/catalog and make a private copy where licensing permits. Cannot change another account's access, system settings, quotas, or shared catalog originals.

### OWNER

Manages account admission, role assignments under invariants, system configuration, provider settings, quota policy, and shared catalog. Does not automatically inherit Learner permissions or another learner's private data. The first personal account receives both roles through a controlled bootstrap.

No wildcard `*`, `superadmin`, `isOwner => allowAll`, or undocumented support impersonation in MVP. Content Editor/Admin are future proposals requiring a new policy review.

## 5. Resource classification

| Class | Examples | Read | Write |
|---|---|---|---|
| Private learning | Personal lessons, segments, vocabulary, decks | Active owning Learner | Active owning Learner |
| Private activity | Recordings, writing/review attempts, progress | Active owning Learner | Active owning Learner with operation rules |
| Shared published catalog | Curated lessons, readings, approved dictionaries/strokes | Active Learner; Owner for management | Owner through catalog workflow |
| Shared catalog draft | Unpublished revisions | Owner | Owner |
| Account administration | State, role assignments, access records | Owner with restricted projection | Owner subject to invariants |
| System configuration | Nonsecret integration status, quota configuration | Owner | Owner |
| Secrets | Provider credentials, signing keys | No read-back through product UI/API | Authorized secure secret configuration only |
| Export/import artifacts | ZIP packages, staging objects | Requesting owning Learner | Controlled transfer workflow |
| Operational metadata | Job status, error code, usage counters | Owning user for their job; Owner gets minimized operational view | System handlers |

MVP has no public user content, peer sharing, shared private decks, or cross-user collaboration. Published catalog means shared inside Kiko, not publicly accessible on the internet. Do not label shared objects as ownerless personal records.

### 5.1. Shared catalog lifecycle

Proposed states: `draft → published → retired`; editing published content creates a draft revision. Learners read published revisions only. Existing attempts/private copies retain snapshots when a revision changes or retires.

Publishing a personal lesson is **not** a visibility-field toggle on arbitrary private data. The owning Learner must explicitly request copying selected content into a separate catalog draft and also possess `catalog.write` to perform that action in MVP. Exclude recordings, attempts, progress, private notes, and unintended metadata. Check source rights before publication. An Owner cannot publish another learner's personal lesson.

## 6. Permission registry and role mapping

Permission IDs are stable application contracts; scope is checked separately. There is no permission editor in MVP. Store role assignments in the database and role-to-permission mappings in version-controlled code.

| Permission | LEARNER | OWNER | Scope / restriction |
|---|---|---|---|
| `profile.read_self` | Yes | Yes | Own safe profile |
| `profile.update_self` | Yes | Yes | Own allowed preference fields; no role/state/owner mutation |
| `lesson.read_private` | Yes | No | Own lessons and transcript descendants |
| `lesson.write_private` | Yes | No | Own create/edit/archive |
| `lesson.delete_private` | Yes | No | Own, explicit irreversible-delete flow |
| `vocabulary.read_private` | Yes | No | Own vocabulary/readings/occurrences/decks |
| `vocabulary.write_private` | Yes | No | Own; related records same owner/language |
| `vocabulary.delete_private` | Yes | No | Own; history/dependency rules apply |
| `recording.read_private` | Yes | No | Own ready recordings |
| `recording.create_private` | Yes | No | Own valid lesson context and quota |
| `recording.delete_private` | Yes | No | Own recordings only |
| `writing.read_private` | Yes | No | Own attempts |
| `writing.create_private` | Yes | No | Own attempt, supported character/context |
| `writing.delete_private` | Yes | No | Own under history policy |
| `review.read_private` | Yes | No | Own cards/events |
| `review.manage_private` | Yes | No | Own cards, scheduling actions through service |
| `review.submit` | Yes | No | Own card; version and idempotency checks |
| `progress.read_private` | Yes | No | Own summaries only |
| `catalog.read_published` | Yes | Yes | Published revisions; Owner may manage without Learner |
| `catalog.read_draft` | No | Yes | Catalog only |
| `catalog.write` | No | Yes | Catalog draft/revision; no access to others' private sources |
| `catalog.publish` | No | Yes | Validated draft and provenance |
| `catalog.retire` | No | Yes | Preserve referenced history |
| `transfer.export_self` | Yes | No | Own permitted data/file bytes |
| `transfer.restore_self` | Yes | No | Own empty learning profile, validated staging |
| `integration.use_personal` | Yes | No | Enabled feature, account quota and permitted data flow |
| `integration.configure_system` | No | Yes | Secure configuration; secrets not returned |
| `quota.read_self` | Yes | Yes | Own usage summary, no content disclosure |
| `quota.configure` | No | Yes | Policy/limits; race-safe enforcement |
| `access.read_accounts` | No | Yes | Minimal account identity/state/roles, not learning content |
| `access.manage_accounts` | No | Yes | Admit/suspend/remove under lifecycle rules |
| `access.assign_roles` | No | Yes | Fixed registry; last-owner protection |
| `system.configure` | No | Yes | Explicit allowed nonsecret settings |
| `operations.read_metadata` | No | Yes | Minimized job/usage/error metadata, no prompts/audio/text |
| `audit.read_admin` | No | Yes | Security/admin metadata, bounded queries |

No direct generic permission to set arbitrary review schedules, edit immutable events, read secrets, edit foreign owner IDs, or bulk dump every user's data. User-facing account export is distinct from operator disaster-recovery backups.

## 7. Scope rules by resource

### 7.1. Personal ownership

Private resources must have an immutable owner identity except through a separately approved future transfer feature. New resources use the session actor, not an owner value accepted from the client.

- Lesson → transcript version → segment belongs to the lesson owner.
- A vocabulary occurrence linking a private segment requires the same owner and target language. Catalog references need published read permission and preserve a source snapshot.
- Deck and vocabulary membership must have matching owner and language.
- Recording/attempt must belong to the actor and refer to an accessible source; history keeps a snapshot if source changes.
- Review card and event inherit the learner owner; event submission validates card ownership and version.
- Export/import/job/staging/reservation are scoped to the initiating owner.

Where practical use composite keys/foreign keys or equivalent constraints for ownership consistency. A valid parent ID and a valid child ID do not imply a valid authorized relationship.

### 7.2. Lists and batch operations

Apply owner/scope filters **before** pagination, aggregation, search, counts, and joins. Do not fetch all rows and filter in the browser. Batch mutations validate every item; default atomic rejection if any item is forbidden, avoiding partial results unless explicitly specified. Search suggestions and errors must not leak foreign titles or counts.

### 7.3. Archived, deleted, and retired content

Archived personal content remains readable by its owner and is excluded from active study queues by default. Deleted/tombstoned content is not retrievable through ordinary read or download endpoints. Retired catalog content disappears from discovery; existing attempts/copies preserve permitted snapshots without granting access to new unpublished revisions.

## 8. Authorization request flow

Every protected application boundary follows:

1. Verify provider session/token using a supported server mechanism; decoding alone is insufficient.
2. Resolve Kiko account and require active/allowed status.
3. Load trusted roles and current authorization revision.
4. Resolve explicit action permission; fail closed if missing or unknown.
5. Load the resource through an actor-scoped query, including authorized parent/context.
6. Evaluate resource state, quota, language/relationship constraints and concurrency requirements.
7. Perform a guarded transaction or scoped storage/job operation.
8. Return a minimized response; audit security-relevant events without sensitive payloads.

Illustrative pseudocode, not a prescribed library:

```text
actor = requireVerifiedActiveActor(request)
requirePermission(actor, "recording.read_private")
recording = repository.findReadyRecording(id, ownerId = actor.id)
if recording is absent: return NOT_FOUND
return storage.issueShortReadAccess(recording.storageKey)
```

No `OWNER` bypass belongs in this path. Central policy helpers should be called from REST handlers, Server Actions, background enqueue/finalization, and other entrypoints. Internal helpers must not accidentally become an unguarded public API.

### 8.1. Error policy

- Invalid/missing session: unauthenticated, with sign-in flow.
- Authenticated but disallowed/suspended: access denied, no protected data.
- No permission for a known action: forbidden.
- Private resource not in actor scope: not found, without revealing a foreign resource exists.
- Validation errors only after safe scope resolution where necessary; no foreign field values in errors.
- Job callbacks/webhooks require separate service verification; anonymous access is never inferred from a valid-looking job ID.

## 9. Account admission, roles, and revocation

### 9.1. Bootstrap

The first Owner is established by an explicit trusted deployment/operator bootstrap, bound to an approved provider subject. Never give Owner to the first arbitrary visitor. Bootstrap must be one-time/idempotent and unavailable as an unauthenticated production route. Assign both roles to the approved personal account; keep real identity values outside source control.

### 9.2. Role administration

- Fixed role names only; reject unknown roles.
- Require current `access.assign_roles`; client role fields never authorize the request.
- Record actor, target account, old/new roles, timestamp, and outcome.
- Prevent removal/suspension of the last active Owner, including races across two requests; enforce transactionally.
- Owner cannot grant a permission that is not defined by a role in the deployed registry.
- Do not expose a generic SQL/function endpoint to administer access.
- Reauthentication for high-risk settings/role grants is recommended; select provider capability before implementation.

### 9.3. Revocation semantics

Proposed baseline: check active account and `authorization_revision` against current trusted state on every protected request; no cross-request role cache until invalidation behavior is defined and tested. Role/state changes increment the revision transactionally.

After committed suspension/revocation, new requests and signed-link requests are denied; active browser sessions should clear protected UI/state on the next response. Existing in-flight operations require recheck before committing sensitive changes where feasible. Already downloaded data cannot be recalled. Already issued signed links can remain valid until expiry; disclose and minimize that window. Disable provider sessions as an additional supported step when warranted; do not assume provider logout alone revokes all application access.

## 10. Database enforcement and RLS

Proposed default: browser calls Kiko server for business data; server uses scoped repositories. Direct browser data API access is not needed for MVP. If exposed later, test its policies independently.

- Enable restrictive RLS for exposed personal tables, with both read/use and insert/update ownership checks.
- Block direct client role/account-state writes.
- Use separate policies for published catalog reads and Owner catalog writes; never `owner OR authenticated` on private tables.
- Privileged server/worker connections may bypass RLS; service-layer authorization and owner filters remain required.
- Prefer least-privilege runtime DB roles and separate migration credentials.
- Do not assume provider JWT roles automatically equal Kiko application roles; define a verified mapping or trusted database lookup.
- Database functions must validate caller scope/permissions. If privileged/security-definer functions are required, restrict execution grants, qualify objects, fix search path, and prevent caller-controlled role/context.
- With pooled connections, do not leak identity through persistent session settings. Transaction-local context must be reset automatically and tested.
- Check NULL behavior explicitly in scope constraints and test invalid rows.

Exact SQL is intentionally deferred until auth/database topology and schema are approved. Do not copy illustrative policies into production without integration tests using real runtime roles.

## 11. Storage and media controls

Private buckets by default. Stable object keys in database; no durable signed URLs as identifiers.

| Operation | Required checks |
|---|---|
| Reserve upload | Active Learner, create permission, owner context, MIME/size/purpose, available quota |
| Upload | Short-lived grant scoped to reservation/key; no arbitrary listing or overwrite |
| Finalize | Same owner/reservation, actual object type/size, immutable key, quota, idempotency |
| Read/download | Resource permission, owner/catalog state, asset ready, short-lived grant |
| Delete | Owner delete permission, dependency policy, pending-delete transition, cleanup retry |
| Export file bytes | Same owner and export scope, permitted source rights |

Storage key prefixes are organizational hints, not authorization on their own. Unpredictable IDs are not access control. Published catalog assets still need a deliberate read policy; personal audio is never made public to make a player work.

Prevent verify-then-overwrite races using non-overwritable unique upload objects or a controlled finalization copy to an immutable final key, according to provider capability. Validate direct SDK/storage routes, not only API wrappers. Reject foreign key references in finalize. URL expiry is configurable and must be selected before rollout; suggested short windows are proposals, not guarantees of immediate revocation.

## 12. Workers, integrations, and AI

- Enqueue requires the initiating actor's relevant permission and resource scope.
- Persist owner, job type, allowed resource IDs, configuration version, and idempotency key server-side.
- At execution, recheck account state, resource accessibility, feature status, and quota. A revoked account's pending personal job must not transmit new private data.
- Before sending externally, enforce the approved provider/data-flow policy. System-level enablement is not blanket permission to send every learner's recordings.
- Apply bounded retries and recheck before final writeback; revoked or deleted resources produce cancelled/safe terminal results.
- An external request already sent cannot necessarily be recalled; cancellation semantics must say so.
- Owner operational screens expose status/error code/usage only, not private prompts, subtitles, model conversation, or recordings.
- Provider/webhook callbacks verify signature/identity and bind to the original job; callback payload cannot change owner or scope.

AI outputs, imported lessons, external pages, and transcripts are untrusted data. They cannot grant permissions, select a different account, request secrets, or trigger administrative actions.

## 13. Export, restore, and deletion boundaries

`transfer.export_self` exports only the actor's learning profile and permitted files. Administrative account data, secrets, foreign records, and temporary signed URLs are excluded. Export artifacts belong to the actor, expire, and are not publicly hosted.

`transfer.restore_self` restores learning data into an empty learning profile. Imported roles, account states, auth subjects, owner IDs, system configuration, and provider credentials are ignored/rejected. IDs are remapped to the authenticated actor. Archive path/size/schema and relationship validation are mandatory. Restore is not a privilege-assignment mechanism.

Account suspension/removal is separate from permanent personal-data deletion. Owner account management does not implicitly grant bulk private-content deletion. A future operator deletion procedure requires an explicit policy, approval, audit, backup-retention disclosure, and affected-scope verification. MVP self-service resource deletion follows the owning Learner's permissions and confirmation flow; immutable review events are not editable through generic CRUD.

## 14. Sessions, caches, and browser boundaries

- Use secure provider-supported session handling, appropriate HttpOnly/Secure/SameSite behavior, CSRF/origin controls and exact redirect allowlists for the chosen flow.
- CORS, obscure IDs, frontend route guards, and signed-in UI are not backend authorization.
- Never publicly cache private responses or media. Shared-cache keys cannot omit identity/scope/revision where relevant.
- Logout/account switch clears in-memory query caches and protected UI. Handle unsaved local recordings explicitly; do not silently upload them under the next account.
- Local persisted drafts/recordings are namespaced by account and protected from automatic cross-account restore. Define retention/cleanup; do not promise browser storage is a secure vault.
- Real-time subscriptions, if added, require per-channel access and revocation behavior; no global feed of private activity.

## 15. Audit and observability

Audit account admission/suspension, role changes, integration/limit changes, catalog publication, export/restore requests, and significant authorization failures. Include actor identifier, operation, target class/identifier where needed, timestamp, result, request ID, and revision. Do not include tokens, secrets, audio, lesson text, signed URLs, or complete import payloads.

Owner audit access is a minimized administrative view, not a way around private-content restrictions. Logs/backups need infrastructure access policy and finite retention. Rate-limit noisy failure logs without losing meaningful security signals. Define retention duration before production; it is not yet chosen.

## 16. Verification matrix

Use synthetic fixtures: account A = Owner+Learner; B = Learner; C = Owner only; D = suspended Learner; E = authenticated but unapproved. Never use real recordings for these checks.

| Test | Expected result |
|---|---|
| Anonymous lists lessons or requests recording URL | Denied, no protected payload |
| E signs in at provider | Still no Kiko data |
| B reads/edits/deletes A's lesson by ID | Not found; no change |
| B links own vocabulary to A's private segment | Rejected |
| B adds foreign or other-language word to deck | Rejected |
| C requests B's recording/export/progress | Denied despite Owner role |
| C reads published catalog/admin metadata | Allowed within projection |
| A studies own content | Allowed via Learner role |
| B accesses catalog draft/unpublished revision | Denied |
| A publishes own selected content to catalog | Allowed after validation; private activity excluded |
| A tries to publish B's personal lesson | Denied |
| B submits role/owner fields through profile/import | Rejected; no privilege change |
| Two requests remove the last Owners concurrently | At least one protected Owner remains |
| D requests signed URL or submits review | Denied |
| Roles revoked while client stays open | Next protected request observes revocation |
| Revoked actor's queued AI job starts | No new private transmission |
| B finalizes A's reservation or arbitrary storage key | Denied |
| File replaced between verification and finalization | Cannot publish substituted bytes |
| Direct data/storage SDK call bypasses web UI | Still blocked by actual grants/policies |
| Batch contains own and foreign IDs | Entire mutation rejected under default policy |
| Export contains foreign relation or role metadata | Validation fails/test catches leakage |
| User logs out then another logs in | No cached/local cross-account data appears |
| Subtitle/AI output asks to grant Owner | Treated as content; no action |
| Two review submissions retry/stale version | No double event/schedule overwrite |

Tests must cover API/Server Actions, database/runtime role, storage policies, exports, workers, and caches used by the implementation. Passing UI tests alone is insufficient. Add regression tests for every authorization fix.

## 17. Implementation checklist

- [ ] Confirm provider session verification, allowlist binding, and bootstrap flow.
- [ ] Align Project Spec, architecture, role registry, and this matrix.
- [ ] Persist account state, role assignments, authorization revision.
- [ ] Implement centralized permission and scope helpers without Owner bypass.
- [ ] Guard every entrypoint and nested relationship; reject privileged fields.
- [ ] Enforce DB invariants and actual RLS/grants for exposed paths.
- [ ] Secure private storage reservation/finalize/read/delete flows.
- [ ] Recheck job scope/revocation and external-transmission rules.
- [ ] Isolate caches, local drafts, exports, and import staging by actor.
- [ ] Audit administrative actions with redacted payloads.
- [ ] Run the synthetic-user verification matrix and retain evidence.
- [ ] Document known limits such as signed-link expiry and in-flight requests.

## 18. Open decisions and change control

**Status 2026-10-17 (see DECISIONS.md):** auth provider/method selected (Supabase Auth, email OTP); runtime/database privileges implemented as `kiko_app` with column-level grants and SECURITY DEFINER admission; revocation checks account state and revision on every request; Owner bootstrap is the operator script `scripts/kiko-admin.mjs` (no web route). Still open: storage semantics, admission UX beyond the script, role changes and last-Owner protection.

Before implementation, select auth provider/method, exact session/revocation mechanism, runtime/database privileges, storage expiry and overwrite semantics, and Owner bootstrap procedure. Before broader access, decide account admission UX, data retention/deletion, sharing consent, quota defaults, and support operations.

A new role, public sharing feature, impersonation capability, automatic personal-content publication, direct browser DB access, or private-data operator access requires updating this document and relevant tests before rollout. Default to deny while requirements remain unspecified. This policy is independent of AI model/editor choice and must be enforced by application/infrastructure controls.

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-16 | Initial Kiko access-control specification: Owner/Learner RBAC, ownership, catalog scope, enforcement, revocation, storage/jobs, and tests |
