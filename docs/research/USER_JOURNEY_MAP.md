# Kiko — User Journey Map

**Version:** 0.1 | **Date:** 2026-10-19 | **Status:** Draft / hypothetical journeys, not validated by real user interviews
**Market:** Vietnamese-speaking language learners
**References:** USER_RESEARCH_SYNTHESIS.md, PERSONAS_AND_JTBD.md, FEATURE_PRIORITIZATION.md, PRD.md, PROJECT_SPEC.md, UI_SPEC.md

## 1. Purpose and scope

Map learner experience **before screen-level user flows**: triggers, goals, actions, potential pain points, emotions to investigate, UX opportunities and measurable outcomes. Focus on the first complete learning loop and two contrasting proto-personas.

**Evidence:** [E] external secondary research; [P] Kiko owner premise/current baseline; [H] hypothesis to test. Emotional states, frequency and preference below are **hypotheses**, not observed research findings. This map is a UX design aid, not approved feature scope.

## 2. Journey A — PP02: Content-led independent learner (primary design scenario)

**Scenario:** A Vietnamese-speaking learner chooses a permitted text/audio lesson, captures a phrase, reviews it later and returns to its source.

| Stage | User goal / question | User action (hypothesized) | Friction / emotional hypothesis | UX opportunity | State / exception | Evidence | Success signal |
|---|---|---|---|---|---|---|---|
| A1. Entry | Can I get to my learning content quickly? | Sign in, choose language | Login friction; uncertainty about access | Direct next action, remembered preference | Unapproved/expired session | P/H | Reaches library without assistance |
| A2. Find content | What should I study now? | Open own lesson or permitted catalog; optionally create | Empty library or choice overload | Resume card, create/open options | Empty/loading/failed/unsupported source | P/H | Opens appropriate lesson |
| A3. Understand | What does this sentence mean? | Read/listen, select segment | Missing meaning or unclear notation | Readable transcript, contextual playback | Untimed text, no audio, missing reading | P/H | Identifies target phrase |
| A4. Capture | How do I remember this later? | Select phrase, add meaning/reading, save | Context may be lost; duplicate confusion | Source sentence snapshot, clear save state | Duplicate, invalid selection, save failure | P/H (U03) | Saves phrase with correct source |
| A5. Practise | Can I recall it? | Open review, attempt answer, reveal, rate | Passive rereading or unclear progress | Retrieval-before-reveal, transparent feedback | No cards, retry, stale review | E04/E05 + H | Completes valid retrieval attempt |
| A6. Return | Where did I learn this? | Reopen saved phrase and original lesson | Lost source after editing/archiving | Source link and historical context | Source removed or version changed | P/H | Finds preserved original context |
| A7. Resume | What's useful next time? | Reopen app after a break | Overwhelming backlog; guilt from missed days | Resume lesson, manageable due queue | No due reviews, interrupted lesson | H | Finds next meaningful action |

**Opportunity statement:** Keep one connected learning context from source to recall. Validate whether users experience this pain in existing tools before treating it as market fact.

## 3. Journey B — PP01: Guided beginner (contrasting design scenario)

**Scenario:** A learner starts a language, wants a clear first action, completes a short lesson and understands what to do next.

| Stage | User goal / question | User action (hypothesized) | Friction / emotional hypothesis | UX opportunity | State / exception | Evidence | Success signal |
|---|---|---|---|---|---|---|---|
| B1. Entry | What is Kiko for? | Read value statement, sign in | Unsure what Kiko provides | Plain Vietnamese value proposition | Admission denied, connection error | H | Can explain the core purpose |
| B2. Orientation | Which language/goal should I pick? | Choose zh/ja/en, optional goal | Unsure of level; long questionnaire | Short, skippable/editable setup | No level known; change preference | E01 + H | Reaches learning without coaching |
| B3. First lesson | What should I do first? | Open short suggested/permitted lesson | Too many controls | Single primary action and short instruction | No suitable lesson, missing notation | H | Starts a meaningful activity |
| B4. Learn | What does this phrase mean? | Read/listen and inspect contextual support | Cognitive overload | Progressive disclosure, language-aware notation | Audio unavailable, missing translation | P/H | Understands the task |
| B5. Remember | Can I keep and practise it? | Save one item and complete recall | Unclear distinction between save and learn | Guided capture and first review | Save failed, no due cards | E04/E05 + H | Completes capture and recall |
| B6. Finish | Did I do enough? | See concrete actions completed | Streak or score may mislead | Explain what was done, next step | Partial lesson, interruption | H | Can state next action |
| B7. Return | How do I continue? | Reopen Kiko | Forgotten route, missed days | Continue card and short next activity | Previous lesson archived | H | Resumes without restarting onboarding |

**Critical comparison:** A and B should share lesson, vocabulary and review primitives. Test whether separate entry routes are necessary; do not assume a dual-mode product.

## 4. Cross-journey moments that matter

| Moment | Why it matters | Design rule | Validation question |
|---|---|---|---|
| First meaningful action | Establishes utility | Do not force extensive setup | Can users begin without help? |
| Contextual capture | Core Kiko differentiation hypothesis | Preserve source sentence/version | Can users find where a word came from? |
| First recall | Separates storage from learning | Prompt before reveal; honest state | Do users understand what was recalled? |
| Return after break | Continuity | Non-punitive resume | Can users find the next step? |
| Language switching | Prevent confusion | Per-language content and capabilities | Can users distinguish queues and notation? |
| Recording | Sensitive action | Explicit permission, local/saved status | Do users know when audio is recorded/stored? |

## 5. Emotion and friction map — assumptions to test

| Stage | Potential learner sentiment [H] | Potential trigger | What to observe |
|---|---|---|---|
| Entry | Curious / uncertain | Value unclear, admission restrictions | Explanation comprehension |
| Onboarding | Motivated / overwhelmed | Too many questions | Hesitation, abandonment |
| Content | Interested / stuck | Unsupported material, empty library | Time to first lesson |
| Capture | Satisfied / interrupted | Too many fields, duplicates | Capture success and errors |
| Review | Confident / discouraged | Difficult recall, unclear ratings | Interpretation and willingness to retry |
| Return | Ready / guilty | Long overdue queue or streak loss | Resume completion |

Do not use this as an empirical emotion chart until direct research supplies observations.

## 6. Touchpoints and UX requirements

| Touchpoint | Information needed | Interaction | Important states |
|---|---|---|---|
| Sign-in / access | Why access is limited; account state | Sign in / sign out | Pending, denied, expired |
| Learning home | Language, next activity, resume, due count | Continue / browse / review | New learner, nothing due, error |
| Library | Lesson title, language, source, status | Filter / open / create | Empty, loading, permission failure |
| Lesson workspace | Text/media, segment, notation | Play / select / save / shadow | Untimed, unavailable media, unsaved |
| Vocabulary capture | Phrase, source snapshot, meaning, reading | Edit / save / cancel | Duplicate, validation, saved, failed |
| Review | Prompt, reveal, due status | Recall / rate / next | Empty, retry, completion |
| Word detail | Meaning, notation, original context | Reopen source / edit / archive | Historical source unavailable |
| Progress / resume | Concrete activity, recall events | Resume / view details | Sparse data, missed days |
| Privacy / settings | Recording and AI data handling | Consent / delete / export | Permission denied, partial failure |

## 7. Service blueprint / backstage dependencies (design awareness)

| User-visible action | Required system behavior | UX consequence if unavailable |
|---|---|---|
| Open private lesson | Verify actor and ownership | Neutral not-found/denied; no foreign data |
| Save phrase | Validate language/owner, preserve occurrence snapshot | Show saved only after persistence succeeds |
| Submit review | Idempotent review event and due-state update | Avoid double-counting on retry |
| Record shadowing | Explicit browser permission and supported codec | Listening still available if microphone denied |
| Restore lesson context | Keep immutable history/version reference | Show preserved snapshot if source edited |
| Switch language | Scope content, review and capabilities | Never silently merge progress |
| Delete private content | Scoped authorization and eventual storage cleanup | Honest confirmation and deletion status |

## 8. Research tasks to validate this map

1. **Contextual observation:** Ask learners to show how they studied last week, captured vocabulary and revisited it. Record actual tools and breakdowns.
2. **Task test A:** Open a lesson, save a phrase with source, complete review, find original context.
3. **Task test B:** Start as a beginner, select a language, complete first short lesson, identify next action.
4. **Interruption test:** Simulate a failed save, unavailable audio and a return after several days.
5. **Comprehension test:** Ask participants what “saved,” “practised,” “due,” and “recalled” mean; ask what happens to microphone recordings.
6. Compare observed journeys with this draft; record counterexamples and revise screens and prioritization.

**Proposed exploratory sample:** 8–12 usability participants across the two scenarios, plus interviews and optional study diary as specified in USER_RESEARCH_SYNTHESIS.md. Do not report hypothetical completion rates as results.

## 9. Handoff to IA and User Flows

- **Navigation candidates:** Learning home, Library, Vocabulary, Review, Progress, Settings; writing and shadowing are contextual/secondary activities, not automatically top-level navigation.
- **Primary flows to diagram:** first-time entry; open/create lesson; capture vocabulary; review; return to source; resume; language switch.
- **Required exception flows:** account denied, empty library, invalid/duplicate phrase, save conflict, no due cards, unsupported media, microphone denied, interrupted/unsaved attempt.
- **Design order:** Map journeys → validate assumptions → INFORMATION_ARCHITECTURE.md → USER_FLOWS.md → low-fi wireframes.

## 10. Open decisions

- Choose primary pilot segment and pilot language (existing technical baseline zh/ja/en).
- Decide whether onboarding needs guided and content-first paths or one adaptive start.
- Confirm how saved vocabulary displays source context.
- Choose review labels and learner feedback based on comprehension testing.
- Confirm primary mobile navigation after task tests.

**Change control:** This document maps hypotheses for UX/UI. It does not change PRD scope, roles, database, deployment or backlog. Any scope change requires explicit owner approval.
