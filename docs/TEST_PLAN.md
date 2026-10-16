# Kiko — Test Plan

**Version:** 1.0 — Proposed | **Updated:** 2026-10-16  
**Status:** Plan only. No application tests have been executed or passed on the basis of this document.

## 1. Purpose and references

Verify Kiko's Chinese (zh), Japanese (ja), and English (en) learning flows, privacy, data integrity and recoverability. Read PROJECT_SPEC.md, ARCHITECTURE.md, ACCESS_CONTROL.md, UI_SPEC.md, DATA_MODEL.md, IMPLEMENTATION_PLAN.md and AGENTS.md. Resolve conflicting draft requirements before asserting expected behavior. This plan does not authorize writes to shared/production environments, paid AI calls or public deployment.

MVP covers private access, lessons/readings, vocabulary/decks, media/subtitles, shadowing, handwriting zh/ja, review, progress, export/restore and cleanup. Pronunciation scoring, AI conversations, automated dictation and full offline sync are deferred unless separately specified. Testing must verify their disabled state, not invent functional results.

## 2. Strategy and levels

| Level | Coverage | When |
|---|---|---|
| Unit | Parsing/validation, scheduling, scope decisions, Unicode offsets, stroke normalization | Each affected change |
| Integration | Real PostgreSQL constraints/transactions, runtime identities, storage/auth adapters | When boundary changes |
| End-to-end | User flows across UI/API/persistence for three languages | Relevant slice and release candidate |
| Manual device | Microphone, codec, player timing, pointer/touch, keyboard, responsive | Spike and integrated release candidate |
| Security/privacy | Cross-owner, roles, storage, imports, caches, secrets | Each affected surface and release gate |
| Recovery | Partial failures, export/restore, backup drill | Before MVP release and after recovery changes |

Framework selection remains open. Possible choices such as a TypeScript unit runner, browser automation and disposable PostgreSQL are proposals, not installed tools. Derive actual commands from package manifests and CI. A database substitute does not establish parity for RLS, extensions, pooling or the actual deployed PostgreSQL configuration; record what was tested against the real stack.

## 3. Environments and test identities

- Local/test database and storage must be disposable and isolated from shared/production. Verify target without printing secrets before mutations.
- CI uses synthetic data and scoped credentials, never production backups or private recordings.
- Preview uses isolated resources and private audience. No production secret exposure to untrusted PRs.
- Production smoke is read-only unless a narrowly scoped synthetic write and cleanup are explicitly authorized.

| Actor | Role/state | Purpose |
|---|---|---|
| A | Active OWNER + LEARNER | Personal owner workflow |
| B | Active LEARNER | Cross-owner isolation |
| C | Active OWNER only | No implicit learner/private bypass |
| D | Suspended LEARNER | Revocation |
| E | Authenticated, unapproved | Admission enforcement |
| Anonymous | No session | Unauthorized boundary |

Fixtures: one small lesson per language; identical surface in zh/ja with different readings; English IPA and multiword phrase; Japanese mixed kana/kanji; Chinese script variants; Vietnamese translations; supplementary Unicode/combining characters; timed and untimed segments; malformed subtitles; permitted small audio; missing stroke dataset; safe malicious HTML/ZIP test payloads. Use generated/synthetic audio or licensed samples, not real private voice data.

## 4. Case conventions and severity

Each case records ID, preconditions, actor, inputs/actions, expected result, actual result, environment/version, evidence and cleanup. IDs below are test specifications, all initially NOT RUN. Automation does not replace manual steps requiring physical devices.

- Blocker: unauthorized disclosure/write, secret leak, unbounded destructive behavior, unrecoverable corruption, broken sign-in/core flow.
- Major: required learning flow broken, wrong schedule/history, failed restore or inconsistent ownership.
- Minor: nonblocking UX/layout issue with a viable workaround and no privacy/integrity impact.

Do not downgrade a security finding because production initially has one user. Defect record includes reproduction, impact, affected scope, fix and regression evidence, without secrets.

## 5. Functional and integration matrix

| ID | Area / steps | Expected result | Trace |
|---|---|---|---|
| AUTH-01 | Anonymous opens each protected UI/API | Denied; no protected payload | FR01, 006 |
| AUTH-02 | E logs in at provider | Kiko remains inaccessible | FR01, 006 |
| AUTH-03 | C requests own learning endpoint | No Learner permission; Owner admin still works | Access Control, 006 |
| AUTH-04 | A/B change profile with role/state/owner fields | Privileged fields rejected; no escalation | 006 |
| AUTH-05 | Suspend B while session open | Next protected request and signed-link issuance denied | 006, 022 |
| AUTH-06 | Concurrent attempts remove last active Owners | At least one active Owner remains transactionally | 006 |
| AUTH-07 | Bootstrap invoked by arbitrary first visitor | No Owner assignment | 006 |
| ISO-01 | B uses A's IDs for read/write/delete/export | Not found/denied; no disclosure or change | All private FRs |
| ISO-02 | B lists/searches/counts with broad filters | Only authorized rows/counts before pagination | 007–009 |
| ISO-03 | Link own word/deck/attempt to foreign parent | Rejected by service and applicable DB invariants | 007–009 |
| ISO-04 | Direct database/storage API with client credentials | Actual grants/policies still block bypass | 022 |
| LES-01 | Create/open/edit/archive zh/ja/en lessons | Correct language, persistence and state | FR02, 008 |
| LES-02 | Blank title, unknown language, unsafe markup | Validation; no script execution | FR02/04 |
| LES-03 | Change language after dependencies exist | Blocked or controlled copy; no relabel corruption | FR02 |
| CAT-01 | B opens draft vs published catalog | Draft denied; published allowed | 010 |
| CAT-02 | Owner publishes own selected content | No recordings/progress/private notes copied | 010 |
| CAT-03 | Owner tries publishing B's private lesson | Denied despite catalog permission | 010 |
| CAT-04 | Published revision edited/retired | New version; existing history preserved | 010, 012 |
| VOC-01 | Select zh/ja text and English phrase | Exact surface and source snapshot saved | FR04/05, 009 |
| VOC-02 | IPA/kana/pinyin; missing/multiple readings | Correct notation; absent data not fabricated | FR05 |
| VOC-03 | Same surface across languages/meanings | No automatic cross-language merge | FR05 |
| VOC-04 | Unlink deck/archive word | Unlink preserves word; archive removes active review | FR05/09 |
| SUB-01 | Import valid SRT/VTT with preview | Correct text/times and atomic publication | FR03, 012 |
| SUB-02 | Partial-null/negative/reversed/out-of-duration times | Invalid values blocked with row errors | FR03 |
| SUB-03 | Untimed text, overlap, malformed/oversize file | Read-only untimed flow; overlap warning; invalid import not published | FR03/04 |
| SUB-04 | Edit transcript after recording/word capture | Historical snapshot unchanged | FR03/06 |
| MED-01 | Reserve/upload/finalize correct file | Ready metadata/file; quota consistent | FR03/07, 011 |
| MED-02 | Spoof MIME/size/purpose, foreign key/reservation | Rejected; no unauthorized object publication | FR07 |
| MED-03 | Upload success then DB failure; retry finalize | Same attempt, recoverable, no duplicate | FR07 |
| MED-04 | Overwrite after verification, concurrent quota | Substitution blocked; quota not exceeded by race | FR07 |
| MED-05 | Expired reservation, orphan object, cleanup retry | Eventual cleanup/reconciliation with visible failure | FR12 |
| SHD-01 | Play/select/loop/speed in three sample lessons | Correct sentence and verified player behavior | FR06, 013 |
| SHD-02 | Listen-repeat and speak-along, save/replay | Correct mode, one active recorder, preserved take | FR06/07 |
| SHD-03 | Micro denied/disconnected/unsupported codec | Listening works; honest fallback and resource cleanup | FR06 |
| SHD-04 | Navigate/logout/switch actor with unsaved take | Explicit handling; no silent loss or cross-account upload | FR07 |
| SHD-05 | Network failure, retry, close/reopen supported local draft | Local vs saved explicit; no false durability claim | FR07 |
| WRT-01 | zh/ja view/trace/free-write/undo/clear/save | Matching dataset and correct normalized replay | FR08, 015 |
| WRT-02 | Missing dataset, en context | Labeled fallback; no false correctness/stroke support | FR08 |
| WRT-03 | Pointer cancel/resize, invalid/oversize point payload | Valid local state; server rejects malformed data | FR08 |
| REV-01 | Reveal then each rating at boundary steps | Approved algorithm/version and due times | FR09, 016 |
| REV-02 | Same event retried/concurrently submitted | Single event/effect; stored result returned | FR09 |
| REV-03 | Same key different payload; stale card version | Conflict; no schedule overwrite | FR09 |
| REV-04 | UTC/day boundaries, timezone change, archived card | Correct grouping; instants stable; excluded inactive items | FR09 |
| PRO-01 | Compare activities/counts by language | Unique resources vs attempts labeled accurately | FR10, 017 |
| PRO-02 | Tab open idle; merely open lesson | No invented minutes/completion/proficiency | FR10 |
| EXP-01 | Export A with words/history/audio | Valid version/manifest/files, no B/secrets/signed URLs | FR11, 018 |
| IMP-01 | Restore export into empty learning profile | IDs remapped, relationships/audio intact, roles unchanged | FR11, 019 |
| IMP-02 | ZIP traversal/symlink/bomb, unsupported schema | Safely rejected within bounded resources | FR11 |
| IMP-03 | Retry/failure midway/nonempty target | No duplicate/visible partial state; merge blocked | FR11 |
| DEL-01 | Delete recording/archive lesson/word | No unintended cascade; history policy followed | FR12, 020 |
| DEL-02 | Storage deletion fails; old signed URL | Retry available; new access blocked; expiry limitation honest | FR12 |
| OPS-01 | Backup restore drill in isolated environment | DB + media linked and usable; measured recovery | 021 |
| OPS-02 | Worker lease expires/retry/revocation | Bounded retry, no unauthorized new external transmission | 021/022 |

## 6. Security and privacy checks

- IDOR/ownership: enumerate every entrypoint, nested reference, count, batch and artifact; reject mixed-authority batch atomically by default.
- XSS: imported text, captions, notes, names and generated output never execute script/unsafe markup.
- SQL/shell/path injection: parameterized access, no untrusted command interpolation, bounded filesystem extraction.
- CSRF/session: verify configured browser mutation protections, cookie flags, origin/redirect policy; CORS alone insufficient.
- SSRF: if a URL adapter exists, reject private/link-local/metadata IPs, bad schemes/ports, redirects and unsafe resolved targets; do not activate arbitrary fetching for tests.
- Secrets: inspect Git diff/build configuration with redaction; no service/AI key in browser bundle, logs, artifacts or env example. No command dumping all environment values.
- Cache/local state: logout/switch A→B, request replay, shared-cache paths; no foreign content/draft leakage.
- Prompt injection: lesson/AI output requesting access changes remains inert content.
- Role control: no Owner all-access bypass, no import/profile role assignment, last-owner race covered.
- External transmission: integration disabled/no consent/quota reached means no paid request or private-data upload.

Record exact scope of checks. Automated dependency/secret scanners are supporting evidence, not proof the application is secure.

## 7. Device, accessibility and performance

Create a tested-device matrix after P0 with OS/browser/version/input/audio format and outcomes. Until measured, desktop Chrome/Safari and mobile browsers are candidates, not a promise of support.

Manual checks: microphone prompt only on action; denial path; headphone/loa interaction; playback speed/loop; stop/dispose on navigation; touch scrolling only locked in drawing region; pointer cancellation; keyboard/focus; compact/wide/zoom; Vietnamese accents/IPA/zh/ja; long captions; reduced motion and semantic labels. Aim for WCAG 2.2 AA in design, do not claim compliance without appropriate review. Drawing needs alternative instructions/path; do not claim complete nonvisual equivalence.

Proposed performance goals from architecture: small metadata API p95 <1s excluding external calls/upload; local loop timing goal <250ms on selected devices. Measure with dataset size, concurrency, environment, network and sample count recorded. No invented latency results. RPO <=24h/RTO <=1 day are recovery targets to verify against actual infrastructure, not achieved guarantees.

## 8. Failure injection and consistency

Inject failures only in authorized disposable environments: before/after file upload, before DB commit, after response lost, during worker lease, while quota is concurrently reserved, and during import publication. Assert no false Saved, no visible partial import, no orphan ownership bypass and safe retry. Test DB transaction rollback and file cleanup independently; they are not one atomic system transaction. Do not simulate failure by disabling production security controls.

## 9. CI and release gates

Proposed CI: lockfile install → lint/typecheck → unit → DB/storage/auth integration where available → build → relevant browser smoke/security checks. Real script names are selected at bootstrap; never mark missing checks passed. Do not silently skip provider-specific checks because local mocks passed.

Release gate:

- All required MVP acceptance criteria have evidence or an explicit reviewed scope change.
- No open Blocker; no unresolved Major affecting privacy/integrity/core learning/recovery.
- Cross-owner/role/revocation/storage paths verified with synthetic actors.
- Three-language smoke and target-device writing/recording pass.
- Export/restore and operational backup restoration have recorded results/limitations.
- Secrets/config/audience and migration target reviewed; deployment/migration separately authorized when necessary.
- Known minor limitations documented; pilot plan ready.

## 10. Evidence and reporting

Use a test-results file or CI artifacts per task; this plan remains expectations, not a live assertion all cases passed. Suggested fields:

```text
Task / test IDs:
Commit or source revision:
Date, environment, DB/runtime/browser versions:
Commands actually executed:
PASS / FAIL / BLOCKED / NOT RUN counts:
Manual device results:
Sanitized evidence links:
Failures, limitations, cleanup and next action:
```

No screenshots/fixtures with real secrets, private voice or unrelated data. Retain failing evidence with safe redaction, add regression test when fixed. Re-run relevant checks after changes; avoid repeated full suites with no new reason. Test and artifact retention are deployment decisions still open.

## 11. Traceability and implementation order

P0 tasks 002–004 establish device/provider evidence. Tasks 006–007 test auth/invariants before personal data. Tasks 008–010 cover first slice. Tasks 011–014 test media partial failure. Tasks 015–017 cover writing/review/progress. Tasks 018–022 cover transfer/recovery/security. Tasks 023–025 require release evidence and pilot. Refer to IMPLEMENTATION_PLAN.md for individual task criteria; do not move security testing exclusively to the last phase.

| Version | Date | Change |
|---|---|---|
| 1.0 Proposed | 2026-10-16 | Initial Kiko test strategy, cases, release gates and evidence rules |
