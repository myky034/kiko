# Kiko — Product Requirements Document (research-informed draft)

**Status: DRAFT / NOT APPROVED** | 2026-10-19

## Product purpose
A personal-first language-learning companion for Vietnamese-speaking learners, connecting meaningful reading/listening content, contextual vocabulary, practice and later retrieval. Kiko's original fragmentation problem is an owner hypothesis awaiting user validation.

## Audiences to investigate
Beginner learners seeking guidance; content-led independent learners; work-focused learners; exam-oriented learners; hobby learners; multilingual learners. These are recruitment hypotheses, not validated personas.

## Baseline and boundaries
Existing project baseline remains zh/ja/en with private learning data and OWNER/LEARNER authorization. Do not silently broaden to French/Korean, open registration, teacher roles, payment or AI-dependent core learning. Existing acceptance criteria in PROJECT_SPEC.md remain controlling until explicit review.

## Core user journeys
1. Select language → create/choose permitted lesson → read/listen → capture contextual word/phrase → practise retrieval → review later.
2. Candidate prototype: choose goal and preferred guidance → complete a short guided lesson → review.
3. Candidate prototype: start from user-chosen content → capture context → review.
4. Candidate future AI flow: choose speaking scenario → opt in to microphone/provider processing → practise → inspect uncertain feedback → retry/delete.

## Research-informed requirements for review
| ID | Requirement candidate | Status | Acceptance evidence needed |
|---|---|---|---|
| PRD-R01 | Preserve source sentence, lesson version and optional media timing with captured vocabulary | Proposed | Correct after editing lesson, reload and export |
| PRD-R02 | Separate saved/practised/due/retrieved states | Proposed | Accurate history; no proficiency inferred from clicks |
| PRD-R03 | Offer retrieval attempt before answer reveal and spaced review | Proposed | Versioned scheduler and delayed recall pilot |
| PRD-R04 | Prototype guided and content-first onboarding | Experiment | Usability results across learner types |
| PRD-R05 | Allow low-pressure re-entry after missed sessions | Experiment | Qualitative response and cohort behavior |
| PRD-R06 | Language-specific capabilities and explicit unsupported fallbacks | Proposed design | zh/ja/en matrix; no invented handwriting/pronunciation support |
| PRD-R07 | Optional AI feedback with explicit data transmission, uncertainty and limits | Deferred | Provider/consent/security review and expert validation |
| PRD-R08 | Private data access, export, deletion and safe account isolation | Existing invariant | Security integration tests and policy review |

## Nonfunctional constraints
Private-by-default; deny-by-default RBAC and ownership; no unrestricted URL fetching; licensed content; clear microphone consent; responsive and accessible UX; bounded AI/media costs; durable versioned learning history; no unverified learning outcome claims.

## Measures and validation
Instrument first meaningful action, contextual capture completion, review attempt, delayed recall, return after break and D7/D30 cohort retention. Measure learning outcomes separately from session time and streaks. Recruit 15–20 interviewees and 8–12 prototype participants as exploratory samples, not population estimates.

## Open decisions
- Do observed users need guided onboarding or free exploration?
- Which language and learner goal should be prioritized for pilot?
- What minimal source formats can be supported legally and reliably?
- Which review algorithm and feedback rubric are appropriate?
- What explicit evidence is sufficient to promote a proposed requirement into MVP?

## Traceability
See RESEARCH_INSIGHTS.md for evidence, PROJECT_SPEC.md for baseline requirements, UI_SPEC.md for prototype UX, DATA_MODEL.md and ARCHITECTURE.md for candidate changes, ACCESS_CONTROL.md and TEST_PLAN.md for safeguards and validation.

**No change to approved implementation scope is implied by this draft.**
