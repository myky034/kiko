# Kiko — User Research Synthesis

**Version:** 0.1 | **Date:** 2026-10-19 | **Status:** Draft — secondary research only
**Market:** Vietnamese-speaking learners, with international evidence.
**Purpose:** Turn market findings into UX design inputs. No Kiko user interviews or usability tests have yet been conducted.

## 1. Research questions
- Why and how do people start and continue learning languages?
- What tools and content do they use in actual study sessions?
- Where are comprehension, vocabulary capture, practice and review difficult?
- How do goals, proficiency, devices and language affect experience?
- What makes an experience enjoyable, useful and safe?

## 2. Evidence rules
- **External evidence:** published research, limited by sample, year and setting.
- **Owner premise:** the original Kiko product problem, not a verified population finding.
- **Hypothesis:** an untested learner need or proposed design effect.
- **Design opportunity:** a candidate solution, not an approved requirement.

## 3. Secondary evidence
| ID | Finding | Source | Limitation |
|---|---|---|---|
| E01 | Learners report varied goals and learning methods | Q&Me Vietnam survey, 2021 | Dated survey; not 2026 market size |
| E02 | Listening/speaking scores trail reading/writing within EF's Vietnam test sample | EF EPI 2025 | Self-selected participants, not representative |
| E03 | Multiple languages including English, French, Japanese, Korean and Chinese attract learners on Duolingo | Duolingo Language Report 2025 | Platform-specific global data |
| E04 | Distributed practice supports second-language retention | Kim and Webb, 2022 | Does not validate a particular Kiko scheduler |
| E05 | Retrieval practice and distributed practice are useful study methods | Dunlosky et al., 2013 | Not proof of Kiko learning outcomes |
| E06 | Educational AI should prioritize human agency and data protection | UNESCO guidance | Not proof of compliance or AI accuracy |

Sources:
- https://qandme.net/en/report/vietnam-language-learning-behaviors.html
- https://www.ef.com.vn/epi/
- https://blog.duolingo.com/2025-duolingo-language-report/
- https://doi.org/10.1111/lang.12479
- https://doi.org/10.1177/1529100612453266
- https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research

## 4. UX insight register
| ID | Insight / need hypothesis | Evidence status | Design opportunity | Validation priority |
|---|---|---|---|---|
| U01 | Learners have different goals | E01 | Optional, editable learning goal | High |
| U02 | Learners may combine tools and content sources | E01 + owner premise | Source-linked lesson and vocabulary capture | High |
| U03 | Context may be lost when saving words separately | Owner hypothesis; unvalidated | Preserve source sentence, lesson version and optional timestamp | High |
| U04 | Saving words alone does not demonstrate recall | E04/E05 | Prompt recall before revealing answer; due review | High |
| U05 | Beginners may need guidance while experienced learners want freedom | Hypothesis | Compare guided vs content-first onboarding | High |
| U06 | Speaking practice may benefit from a safe retry loop | E02 + hypothesis | Shadowing and understandable feedback | Medium |
| U07 | Returning after missed days may be stressful | Hypothesis | Gentle resume experience without punitive streaks | Medium |
| U08 | Language-specific writing/notation matters | Language characteristics | Capability-aware controls and honest fallback | Medium |
| U09 | Voice and AI processing require trust | E06 + existing privacy requirements | Explicit recording, transmission and deletion controls | High |

**Synthesis:** A candidate core experience is choose content → understand → capture with context → practice retrieval → review → resume. This is a design hypothesis, not an observed journey.

## 5. Proto-segments (not validated personas)
| Segment | Goal | Key question to investigate |
|---|---|---|
| Beginner | Learn with structure | How much guidance is necessary? |
| Content-led independent learner | Learn from chosen videos/text | Is context lost across tools? |
| Work-focused learner | Communicate confidently | Which situations and feedback help? |
| Exam-focused learner | Prepare for a target exam | Does Kiko need an exam track? |
| Hobby learner | Enjoy media, travel or culture | What makes practice intrinsically enjoyable? |
| Multilingual learner | Manage more than one language | How should progress and language capabilities be separated? |

Do not assign invented ages, income, behaviors or percentages to these segments.

## 6. Hypothetical user journey
| Stage | User question | Candidate UX | Edge case |
|---|---|---|---|
| Entry | What does Kiko do? | Clear value and privacy explanation | Account not permitted |
| Onboarding | Where do I start? | Choose goal/language or skip to learning | Unknown proficiency |
| Content | What should I study? | Suggested or user-provided permitted lesson | Unsupported format |
| Understand | What does this mean? | Read/listen with contextual notation | Missing explanation |
| Capture | What should I remember? | Save phrase and source sentence | Duplicate item |
| Practice | Can I recall or use it? | Retrieval, optional shadowing | Microphone denied |
| Review | What is due? | Review queue with honest state | Empty or overloaded queue |
| Return | Where was I? | Resume lesson and show meaningful progress | Several missed days |

## 7. UX principles
1. Make the first useful learning action quick.
2. Preserve the context of captured vocabulary.
3. Measure recall separately from time spent, streaks and clicks.
4. Offer guidance without assuming every learner needs the same path.
5. Show only supported capabilities for each language.
6. Make returning after a break feel manageable.
7. Keep private data private; be explicit about AI and recording consent.
8. Design for readable Vietnamese text, accessibility, mobile touch and keyboard use.

## 8. Design-ready vs unvalidated
**Ready for exploratory wireframes:** two onboarding alternatives; lesson workspace; contextual vocabulary capture; recall-and-review flow; resume experience; loading/empty/error/unsaved/permission states.

**Validate before final UX and development scope:** primary learner segment; initial language; real frequency of context loss; preferred onboarding; usefulness of speaking and handwriting; comprehension of progress labels; expectations for data and AI.

## 9. Validation plan
- Interview 15–20 consenting Vietnamese-speaking learners across goals and proficiency levels. Ask about their most recent real study sessions, not whether they like proposed features.
- Invite a subset to document seven days of actual study activity, tools, interruptions and review behavior.
- Test low-fi prototypes with 8–12 participants: guided vs content-first entry, save a contextual word, retrieve it later and resume learning.
- Capture task success, hesitation, errors, perceived effort and counterexamples. Small exploratory samples are not population estimates.
- Convert a hypothesis to a requirement only after evidence review and owner approval.

## 10. Open UX decisions
| Decision | Current status |
|---|---|
| Primary user segment | Open |
| Pilot language within existing zh/ja/en baseline | Open |
| Guided vs content-first vs hybrid entry | Prototype |
| Lesson-centric vs activity-centric navigation | Open |
| Review feedback method | Open |
| AI speaking, French/Korean, public sign-up, classes | Not approved as new MVP scope |

## 11. UX handoff
Next deliverables: proto-personas and JTBD → feature prioritization → user journey map → information architecture → user flows → low-fi wireframes → usability testing → hi-fi UI.

Related documents: RESEARCH_INSIGHTS.md, PRD.md, PROJECT_SPEC.md, UI_SPEC.md.
**Change control:** Research synthesis only. No new feature, schema, role, deployment or PRD approval is implied.
