# Kiko — Proto-Personas & Jobs To Be Done (JTBD)

**Version:** 0.1 | **Date:** 2026-10-19 | **Status:** UX discovery draft, not validated personas
**Primary market:** Vietnamese-speaking language learners
**Inputs:** USER_RESEARCH_SYNTHESIS.md (U01–U09), RESEARCH_INSIGHTS.md, PRD.md, PROJECT_SPEC.md

## 1. Purpose and evidence discipline

Define actionable learner archetypes and jobs for **exploratory UX design**, without inventing interview quotes, age, income, population size or validated user behaviors. These are **proto-personas**, based on external research, the product owner's problem statement and explicit hypotheses. They are not profiles of actual research participants.

Evidence tags: **E** external published research; **P** project-owner premise; **H** unvalidated hypothesis. The six archetypes may overlap: one person can be a beginner, hobbyist and multilingual learner simultaneously.

## 2. Proto-persona cards

### PP01 — Guided Beginner (S1)
- **Situation:** Wants to begin a new language but may not know what to study first. [H; U01, U05]
- **Goal:** Make progress through manageable, understandable steps.
- **Potential friction:** Too many entry choices; unexplained vocabulary/notation; unclear completion.
- **JTBD:** When I start learning a language and don't know where to begin, help me take a small, suitable first lesson so I can feel oriented and continue independently.
- **UX needs to test:** Short guided entry, editable language/goal, sample lesson, clear next action, optional skip.
- **Success signal:** Completes first meaningful learning action without assistance; can explain what to do next.
- **Risks:** Long placement tests and forced goal selection create unnecessary friction.
- **Evidence:** E01 supports varied goals; guided-entry preference is H.

### PP02 — Content-led Independent Learner (S2)
- **Situation:** Learns through personally interesting text, video or audio and may switch between tools. [E01 + P + H; U02, U03]
- **Goal:** Understand meaningful content and remember phrases in context.
- **Potential friction:** Word saved without original sentence; difficult return to lesson; duplicate capture.
- **JTBD:** When I encounter a useful phrase in content I chose, help me save its meaning and source context so I can practise it later without rebuilding the lesson.
- **UX needs to test:** Content-first entry, selection/capture, original sentence and optional timestamp, source return, review queue.
- **Success signal:** Captures and later finds a phrase with its source context without guidance.
- **Risks:** Import rights, unsupported formats, complex editing.
- **Evidence:** Tool mixing E01; context-loss problem is P/H, not observed.

### PP03 — Work-focused Communicator (S3)
- **Situation:** Wants to understand and speak in practical work scenarios. [E01 + H; U01, U06]
- **Goal:** Practise relevant expressions and speak with less hesitation.
- **Potential friction:** Little chance to repeat speech; uncertain recognition feedback; privacy concerns with recordings.
- **JTBD:** When I need to practise a real work conversation, help me rehearse short, relevant utterances and retry safely so I can prepare for that situation.
- **UX needs to test:** Scenario selection, listen-repeat/shadowing, self-listening, explicit microphone action, feedback limitations.
- **Success signal:** Completes a practice loop and understands what the tool can/cannot assess.
- **Risks:** Mistaking transcription similarity for pronunciation quality; unconsented external AI processing.
- **Evidence:** E02 indicates a possible research direction only; demand for this exact workflow is H.

### PP04 — Exam-focused Learner (S4)
- **Situation:** Has an external exam, target proficiency or deadline. [H]
- **Goal:** Understand what remains to practise and track relevant skills.
- **Potential friction:** Generic progress does not map to exam requirements.
- **JTBD:** When I prepare for an assessment, help me see what I've practised and what still needs work so I can allocate study time deliberately.
- **UX needs to test:** Goal/skill filters, transparent activity and recall indicators.
- **Success signal:** Can identify next relevant practice without mistaking activity for a certified exam score.
- **Risks:** Unsupported exam-alignment claims. Dedicated exam tracks are **not** current MVP scope.

### PP05 — Interest-driven Learner (S5)
- **Situation:** Learns for enjoyment, travel, entertainment or culture. [E01 + H]
- **Goal:** Stay curious while building usable knowledge.
- **Potential friction:** Mandatory curricula, irrelevant content and punitive streaks.
- **JTBD:** When I have a little free time and find something interesting, let me learn from it without committing to a rigid schedule so I can keep the experience enjoyable.
- **UX needs to test:** Topic/content choice, short sessions, gentle resume, optional reminders.
- **Success signal:** Finds a meaningful learning activity and voluntarily resumes after a break.
- **Risks:** Assuming enjoyable interactions prove language acquisition.

### PP06 — Multilingual Learner (S6)
- **Situation:** Studies or switches between two or more languages. [P + H; U08]
- **Goal:** Keep content, scripts and progress clearly separated.
- **Potential friction:** Confusing readings, language-specific exercises and merged statistics.
- **JTBD:** When I switch my learning language, show the correct content and practice tools so I can continue without losing context or mixing progress.
- **UX needs to test:** Language switcher, per-language home/review, notation and writing capability fallbacks.
- **Success signal:** Can switch languages and identify the correct lesson, review queue and supported exercises.
- **Risks:** Unsupported features appearing available; cross-language data mixing.

## 3. JTBD prioritization for UX prototypes

| JTBD ID | Job statement (condensed) | Persona(s) | Evidence | UX prototype priority |
|---|---|---|---|---|
| J01 | Start a suitable first learning activity | PP01, PP05 | E01 + H | High |
| J02 | Learn from chosen content | PP02, PP05 | P + H | High |
| J03 | Save and retrieve words with context | PP02, PP06 | P + H | High |
| J04 | Recall what was learned at the right time | All | E04/E05 for principle; Kiko UX untested | High |
| J05 | Resume learning after interruption | PP01, PP05 | H | Medium |
| J06 | Rehearse speech safely | PP03 | E02 + H | Medium |
| J07 | See skill-oriented progress | PP04 | H | Medium |
| J08 | Switch languages without confusion | PP06 | P + H | Medium |

Priority is **design-research priority**, not authorization to add functionality to the MVP.

## 4. Key situations and forces

| Trigger | Desired progress | Competing behavior | Anxiety / obstacle |
|---|---|---|---|
| Just decided to learn | Complete one manageable lesson | Search for a course/video | Not knowing level or next step |
| Finds a useful phrase | Preserve meaning and context | Screenshot, notes or flashcard app | Capture takes too long |
| Forgets vocabulary | Successfully recall and reuse | Reread notes passively | Review feels repetitive |
| Has a short break | Practise a small useful task | Scroll content or postpone | Setup time exceeds available time |
| Returns after days away | Resume without guilt | Abandon old study plan | Backlog/streak pressure |
| Wants speaking practice | Try, listen and retry | Speak alone or use another tool | Recording/privacy or inaccurate feedback |

These are **candidate interview prompts**, not observed behavioral frequencies.

## 5. Cross-persona UX requirements to explore

- **Onboarding:** Allow choosing a language and goal; compare a guided start with a content-first start. No mandatory long questionnaire.
- **Learning workspace:** Clear source text/media, context-linked capture, supported pronunciation notation, honest missing-data states.
- **Review:** Retrieval before answer reveal, distinguish saved/practised/due/recalled, avoid invented proficiency scores.
- **Progress:** Show concrete activity and recall evidence, not only streak or minutes.
- **Return:** Offer a clear resume action and manageable review queue.
- **Privacy:** Explicit microphone consent and separate opt-in for sending data to AI; visible saved/unsaved states.
- **Language support:** Existing technical baseline zh/ja/en. French/Korean are future research candidates, not approved MVP languages.
- **Accessibility:** Vietnamese UI copy to test, mobile touch, keyboard, captions, contrast and reduced motion.

## 6. Proto-persona to screen / flow mapping

| Proto-persona | Primary journey | Candidate screens | Test scenario |
|---|---|---|---|
| PP01 | Guided first lesson | Entry, onboarding, lesson, completion | Find first useful action without assistance |
| PP02 | Content → capture → review | Library, lesson workspace, word detail, review | Save phrase then find its source |
| PP03 | Listen → record → retry | Lesson, shadowing controls, recording state | Practise with microphone denied and allowed |
| PP04 | Goal → practice → progress | Goal preferences, progress, review | Interpret what progress does and does not mean |
| PP05 | Explore → short session → resume | Content discovery, lesson, home/resume | Return after simulated missed days |
| PP06 | Switch → study → review | Language selector, library, review | Switch without mixing content or history |

## 7. Research validation: what would change these personas?

**Interview plan:** 15–20 consenting Vietnamese-speaking learners, recruited across actual goals and study methods. Ask about the last three real sessions, specific tools, interruptions, saved phrases, review habits and frustrations. Avoid leading feature questions.

**Prototype test:** 8–12 participants across at least beginner and independent-content workflows. Compare guided vs content-first starts; test context capture and retrieval. Observe task completion, hesitation, errors and interpretation of progress. Small samples are exploratory, not representative.

**Decision rules:**
- Keep or revise a proto-persona only when repeated real behaviors or meaningful contrasting patterns emerge.
- Split personas only when different needs lead to materially different flows.
- Merge personas if they share the same jobs and interaction requirements.
- Record counterexamples and update the insight-to-design traceability.
- Do not treat willingness to use a hypothetical feature as evidence of real use.

## 8. Open decisions and UX handoff

1. **Primary design hypothesis:** Start with PP01 (guided beginner) and PP02 (content-led learner) as contrasting prototypes, **not** as proven largest market segments.
2. Validate whether these require two distinct entry modes or one adaptable entry.
3. Choose one initial language from zh/ja/en for prototype content; don't silently change the language release scope.
4. Produce FEATURE_PRIORITIZATION.md next, then USER_JOURNEY_MAP.md, INFORMATION_ARCHITECTURE.md and USER_FLOWS.md.
5. Preserve current PRD and Project Spec authority until the owner approves any change.

**Status:** No direct user research completed; all proto-personas and JTBD require validation before final design decisions.
