# Kiko — Research Insights & Product Decision Register

**Date:** 2026-10-19 | **Status:** Secondary-research synthesis; hypotheses pending user validation | **Market focus:** Vietnam, with international evidence.

## Research purpose
Improve Kiko for the project owner and a broader audience of Vietnamese-speaking language learners. This is not a commercialization or competitor-displacement plan. No market size, willingness to pay, exam-score improvement, or product-market fit is claimed.

## Evidence register
| ID | Finding / hypothesis | Evidence status | Implication | Validation |
|---|---|---|---|---|
| R01 | Language goals vary across work, communication and interests | Q&Me Vietnam language-learning survey (2021), older/nonrepresentative | Optional learning goals in onboarding | Fresh interviews/survey |
| R02 | Some Vietnamese learners combine self-study and online formats | Q&Me 2021; sample limitations | Observe actual cross-tool workflows | Seven-day diary |
| R03 | EF EPI 2025 sample reports lower listening/speaking scores than reading/writing | EF EPI 2025; self-selected test population | Investigate listening/speaking needs | Task-based learner interviews |
| R04 | Distributed practice supports second-language retention | Kim & Webb (2022) meta-analysis | Evaluate spaced review | Delayed recall pilot |
| R05 | Practice testing and distributed practice are useful learning techniques | Dunlosky et al. (2013) review | Retrieval before reveal | Review task tests |
| R06 | AI chatbots may support L2 practice, with quality limitations | Research reviews; context-dependent | Optional explainable feedback, human correction | Language expert evaluation |
| H01 | Learners lose context across tools | Owner hypothesis, unvalidated | Source-linked capture | Observe real workflow |
| H02 | Guided and content-first starts serve different needs | Design hypothesis, unvalidated | Prototype alternatives | Comparative usability test |
| H03 | Gentle progress feedback increases meaningful return | Design hypothesis, unvalidated | Non-punitive return experience | Cohort testing |
| H04 | A single language capability model eases multilingual learning UX | Technical design hypothesis | Capability registry review | Architecture spike |

## Sources and limitations
- Q&Me, Vietnam language learning behaviors (2021): https://qandme.net/en/report/vietnam-language-learning-behaviors.html — not a 2026 population estimate.
- EF English Proficiency Index: https://www.ef.com.vn/epi/ — volunteer test takers, not representative of all Vietnamese learners.
- Duolingo Language Report 2025: https://blog.duolingo.com/2025-duolingo-language-report/ — platform-specific global trends, not Vietnam market share.
- Kim & Webb (2022), spaced practice meta-analysis: https://doi.org/10.1111/lang.12479
- Dunlosky et al. (2013), improving students' learning: https://doi.org/10.1177/1529100612453266
- UNESCO, guidance for generative AI in education: https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research

Do not infer that any feature causes higher retention or better scores without controlled testing. Secondary research cannot establish Kiko's customer segments, willingness to pay, or usability.

## Discovery plan and decision gates
1. Conduct 15–20 exploratory interviews across learner goals; ask for recent examples and actual tools, not opinions about proposed Kiko features.
2. Observe 7-day study diaries from a smaller consenting subset.
3. Test 8–12 participants on guided vs content-first prototype and context capture → retrieval.
4. Define first-action completion, capture/review completion, delayed recall, D7/D30 retention, return after a break, perceived effort and privacy issues; pre-register thresholds before pilot.
5. Reconcile insights and negative evidence. Only validated needs become accepted PRD requirements.

## Proposed product direction — NOT ACCEPTED SCOPE
Personal-first, privacy-first, content-linked learning, with possible guided entry for beginners. Maintain zh/ja/en technical baseline; French/Korean and other languages are future research candidates. AI speaking, live classes, community, gamification, pricing and public registration are not newly approved.

## Change control
These docs contain research-informed **proposals**, not implementation authorization. No DB migration, production change, access expansion, new task creation or feature claim is implied. Review findings with the owner, then explicitly approve or reject each PRD change.
