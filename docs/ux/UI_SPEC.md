# Kiko — UI Specification

**Version:** 1.0 — Proposed baseline  
**Updated:** 2026-10-16  
**Target:** Responsive personal-learning web; Chinese zh, Japanese ja, English en.  
**Status:** Interaction specification for review; not approved final visual design or an implemented interface.

## 1. Alignment and decisions

Read with PROJECT_SPEC.md, ARCHITECTURE.md, ACCESS_CONTROL.md, DATA_MODEL.md and IMPLEMENTATION_PLAN.md. Owner and Learner are separate roles; the personal account has both. UI permission checks improve navigation, while server/database/storage enforce access.

Confirmed: name Kiko, three languages, vocabulary/reading/conversation/handwriting/shadowing. Proposed: Vietnamese UI *(superseded 2026-10-21: English UI, DEC-029; visual design “Quiet Bloom”, DEC-026)*, responsive web, visual tokens and layouts below. Colors, logo, component library and supported-device matrix are not selected. No design preference from another project is automatically imported into Kiko.

## 2. Experience principles

- One lesson links reading/listening, phrase capture, shadowing, writing where supported, and review.
- Distinguish local draft from server-saved data; never claim a recording is saved before finalization.
- Show missing data, unsupported features and errors honestly; no fabricated scores or proficiency.
- Keep language selection visible; do not mix Chinese/Japanese readings or default English accent silently.
- Learning controls remain simple; technical provider/configuration detail belongs in settings or error diagnostics when useful.
- Do not overload MVP with dashboards, social mechanics, subscription flows or AI chat placeholders. *(2026-10-21: streaks, goals, levels, achievements, AI conversation/pronunciation and a subscription screen are now in scope after the core loop — PROJECT_SPEC FR14–FR23, DEC-038; placeholders stay labelled.)*

## 3. Information architecture and routes

Routes are proposed contracts, not proof they exist. Resource IDs must still be authorized server-side. Filters may be in URL; private text, signed links and credentials must not.

| Route | Screen | Access |
|---|---|---|
| /sign-in | Sign in | Anonymous; authenticated users redirected appropriately |
| /access-denied | No Kiko access | Unapproved/suspended; no protected content |
| / | Home | Active Learner; Owner-only gets administration entry |
| /library | Lessons | Learner private + published catalog, visibly separated |
| /lessons/new | New private lesson | Learner |
| /lessons/:id/edit | Private lesson editor | Owning Learner |
| /lessons/:id | Learning workspace | Owning Learner |
| /catalog/:id | Published catalog lesson | Learner or Owner per policy |
| /vocabulary | Words and decks | Owning Learner |
| /vocabulary/:id | Word details | Owning Learner |
| /writing | Handwriting | Learner; zh/ja capabilities |
| /review | Review session | Owning Learner |
| /progress | Progress | Owning Learner |
| /settings | Preferences and own data | Active actor; sections gated separately |
| /admin/catalog | Catalog management | Owner |
| /admin/access | Account access and roles | Owner |
| /admin/system | Integrations, quota, operational metadata | Owner |

Shadowing is a mode inside the lesson workspace, not a separate copy of the lesson. No public content pages in MVP. Private IDs outside the actor scope get a neutral not-found screen without exposing a foreign title.

## 4. App shell and navigation

Desktop: compact side navigation, top bar with Kiko, current language/filter and profile. Main content uses constrained reading width; media/writing workspace may be wider. Separate Learning and Administration navigation so Owner is not confused with personal ownership.

*(2026-10-21: navigation now follows the Hi-fi — sidebar Home, Library, My Learning, Flashcards, Speaking, Profile, Settings; mobile Home, Library, My Learning, Profile — DEC-033.)* Mobile: top language/profile controls; bottom navigation for Home, Library, Review and More. More contains Vocabulary, Writing, Progress and Settings; do not put every destination into a crowded bottom bar. Within learning, a compact persistent control bar must not obscure subtitles or touch drawing.

Language selector supports zh/ja/en; library/progress may offer All. Inside a lesson, language is a label, not a control that mutates the lesson's target language. Preserve filters when navigating back. Shared catalog and personal content have explicit labels.

## 5. Responsive behavior

Proposed breakpoints: compact <768px, medium 768–1199px, wide >=1200px. Verify these against actual devices; they are layout choices, not browser support guarantees.

| Area | Wide | Compact |
|---|---|---|
| Library | Grid/list with inline filters | One-column cards and filter drawer |
| Workspace | Player/text plus transcript panel | Player then transcript; switchable word panel |
| Word capture | Side panel | Bottom sheet/full-screen on small height |
| Writing | Character panel beside square writing surface | Surface full available width, controls below |
| Editor | Form and preview | Step sections; preview tab |
| Review | Centered card | Same flow, controls reachable by thumb |
| Admin tables | Full table | Stacked rows or intentional horizontal scroll |

Layout must remain usable with zoom and onscreen keyboard. Do not rely on hover, drag-only actions or fixed heights hiding content. Keep touch scrolling outside writing surface.

## 6. Proposed visual foundation

Use restrained surfaces and clear text contrast. Exact palette and typography remain open; implement tokens rather than scattered raw values.

| Token group | Required tokens / starting proposal |
|---|---|
| Color | background, surface, text, muted-text, border, primary, focus, success, warning, error |
| Spacing | 4, 8, 12, 16, 24, 32, 48px scale |
| Radius | small 8px, panel 16px as proposals |
| Typography | UI body 16px; transcript ~20–24px; character enlarged responsively |
| Layout | Reading max-width; workspace max-width; shell/control heights |
| Motion | Short state transitions; reduced-motion alternative |

Choose fonts with Chinese, Japanese, Vietnamese and IPA coverage; language-aware fallback and lang attributes. Never use decorative fonts for primary learning text. Reading/phonetic text can wrap without clipping. Initial release may be light theme only; dark theme is not implied. Do not add glass/animated effects before legibility and performance are verified.

## 7. Reusable components

LanguagePicker, ScopeBadge (Personal/Catalog), LessonCard, WordCard, TranscriptRow, PronunciationText, TranslationToggle, MediaControls, RecordingStatus, WordCapturePanel, CharacterCanvas, ReviewCard, EmptyState, InlineError, SaveIndicator, ConfirmDialog, ImportPreview, PermissionBoundary, Pagination and JobStatus.

Components support loading/disabled/error states. Icons have accessible labels. Destructive actions use explicit verbs and target names when safe. Do not use color as the only indicator of permission/state/recording.

## 8. Screen contracts

### UI01 — Sign-in and denied

Show only configured login methods; no fake Google/email buttons. No public registration by default. Unapproved identity shows access unavailable and sign-out; do not claim credentials are wrong when application admission is the issue. Expired sessions preserve safe unsaved local drafts with a clear reauthentication path; never expose secret values in diagnostics.

Acceptance: keyboard usable; auth errors do not leak account existence beyond provider behavior; browser permissions are not requested here.

Slice 1 (2026-10-17, DEC-018): one action — *Đăng nhập bằng Google*. After Google returns, an unapproved or suspended account lands on `/access-denied`; only known error codes are shown on `/sign-in` (cancelled, failed, configuration). Onboarding (`/onboarding`) asks for learning languages and timezone only (DEC-003).

### UI02 — Home

> 2026-10-21: layout follows the Hi-fi with labelled placeholders where data does not exist yet (DEC-033); no fake streaks or scores still applies. Real streaks/goals arrive with FR18 (DEC-038).

Current language, continue learning, due cards, recent activity and quick create. Empty state: create first lesson/add words. Owner-only sees admin landing rather than failing Learner queries. Do not show fake streaks, time studied or achievement scores. Counts label unique words vs practice attempts.

### UI03 — Library

> Current scope (DEC-020, DEC-023): personal lessons only — no Catalog tab yet. Topic filter uses `tags`.

Personal/Catalog tabs or equivalent clear separation; language, status and topic filters; search scoped server-side; pagination. Personal cards show title, language, text/media type, state and updated date. Catalog lists published revisions only for Learner.

Actions: open, edit/archive own content; catalog copy-to-private if permitted. No action to edit catalog original for Learner. Changing filters retains accessible focus and does not silently change language of open content.

### UI04 — Lesson editor/import

> Current scope (DEC-021, DEC-022): text lessons; one textarea where each non-blank line is one “đoạn”, kept verbatim; counters use code points with each line break = 1; over-limit input is rejected with line numbers, never truncated.

Fields: title, target language, source information, tags/level optional; text/media source; transcript editor and optional translation/speaker. Staged import → validation → preview → save draft/publish. Show supported file limits before file selection. No blanket promise to accept any YouTube URL.

Each subtitle row has original text, optional translation, start/end when relevant. Errors point to exact row/field; warnings such as overlap are distinct from blockers. Text without timing supports reading but cannot enable sentence playback. Language locked once dependencies exist; offer controlled copy instead.

Editing a published transcript creates a new draft revision. Show active version and draft state; publishing explains history remains on prior snapshots. Confirm navigation with unsaved changes. Auto-save, if added, must use version/conflict handling and clear save status; it is not required MVP.

### UI05 — Learning workspace

Top: title/language/scope. Body: media or reading text, transcript/caption panel, optional translation/readings. Current media segment marked with text/icon as well as color. Click a timed row seeks/plays; untimed rows remain readable. Manual text selection offers Save phrase. Do not hijack browser selection or trigger a save automatically.

Word panel: selected surface, editable meaning/reading, source sentence, target deck, add-to-review checkbox unchecked unless a deliberate preference is defined. Duplicate warning offers open existing or keep distinct; no silent merge. Close panel preserves selection or warns if dirty.

Catalog reading is allowed, but practicing produces private attempts/words. Missing translation/reading says unavailable or allows manual entry in own copy; never generate silently. Report source unavailable without losing saved words.

### UI06 — Shadowing mode

Show selected sentence, optional translation, playback controls, mode selector (Listen then repeat / Speak along), record/stop, duration, playback of own take and save/discard. One recording at a time. Hide pronunciation score entirely until a validated feature exists.

| State | UI behavior |
|---|---|
| idle | Listen or start recording |
| permission_request | Explain pending browser prompt; cancel if possible |
| recording | Visible red indicator + text + timer; Stop primary |
| local_ready | Listen, re-record, save or discard; Local only badge |
| uploading | Progress if measurable, otherwise indeterminate; no fake percentage |
| saved | Saved confirmation, history entry |
| upload_failed | Retain take; retry or discard with clear error |
| permission_denied | Listening still works; guidance without repeatedly forcing prompt |
| unsupported | Explain unavailable recorder/format and available alternatives |

Navigation/account switch while recording or with unsaved take requires explicit stop/save/discard decision. Never upload under a different account. Listening comparison alternates sample and take; synchronized waveforms are not MVP. Suggest headphones for speak-along. Supported speed values depend on verified player.

### UI07 — Vocabulary/decks/details

Filter target language and deck; word details show readings by notation/locale, meanings, examples and source snapshots. Create/edit/archive; unlink deck is distinct from delete word. Same spelling across languages remains separate. English IPA, Japanese kana/furigana and Chinese pinyin have distinct display components.

Actions: study, add review card/direction, practice linked zh/ja characters when available. For en, offer future spelling/writing only if implemented, not a disabled misleading stroke feature.

### UI08 — Handwriting

Choose zh/ja; character, reading/meaning/context and source dataset information. Modes: view stroke animation, trace, hide guide/free write. Square surface, undo stroke, clear, show/hide guide, save self-rating. Pointer interactions limited to surface; support mouse/finger and tested stylus.

When missing dataset, allow labeled free writing; do not show correct/incorrect claims. English handwriting strokes are unsupported, so omit this feature from en context with a short explanation when reached directly. Save attempts labels Self-assessment, not AI score. Resize/pointer-cancel must not corrupt drawing or secretly submit incomplete strokes.

### UI09 — Review

Choose all/one language and deck if supported; due count; front → reveal → Quên/Khó/Nhớ. Buttons disabled before reveal and during pending submission. Send stable event ID for retry; timeout displays Retry without generating a new event. Stale card response reloads safely with explanation, not double rating.

Session ends with actual reviewed count, remaining due count and return action. No cards due has useful navigation, not fake empty flashcards. Keyboard shortcuts are discoverable and inactive in editable inputs; avoid browser-conflicting shortcuts.

### UI10 — Progress

Language and time filters; actual counts for unique items, review events, recordings/writing attempts and recent lessons. If active study time is not reliably measured, do not display minutes. Do not combine language counts into a proficiency score or infer test level. Empty state explains how activity is recorded.

### UI11 — Settings/data transfer

Preferences: interface language when supported, timezone, active languages, script/locale preferences when implemented. Personal data: usage, export scope, job status, download expiry, import preview, validation errors and restore confirmation. Restore supported only into empty learning profile MVP; account/roles are not replaced.

Deletion confirms target and scope, distinguishes archive from permanent delete. No generic Delete all until policy and implementation exist. Display private-file handling in plain language; do not expose storage keys or provider credentials.

### UI12 — Owner administration

Separate Catalog, Access, System. Owner-only may use this without Learner screens. Account list limited to identity/state/roles; no link to another user's recordings or progress. Role changes show before/after and last-owner restrictions. Catalog draft/publish/retire respects revisions and provenance.

System shows integration enabled state, limits and minimized operational job/error metadata. Secret fields support secure write-only replacement, never read-back. Masked placeholder must not accidentally overwrite the secret on save. No arbitrary permission editor MVP; no impersonation. Expensive/public/security-sensitive changes follow review/confirmation policy of the application.

## 9. Interaction and error standards

- Form validation near fields plus summary for long imports; keep entered values after failure.
- Generic foreign-resource not found; never include private titles in denied states.
- Save state: Unsaved / Saving / Saved / Failed; actual server confirmation determines Saved.
- Conflict: explain newer version, preserve local draft and offer reload/compare as implemented; no silent overwrite.
- Network: preserve local work when feasible, no permanent-storage guarantee; retry safe operations with same idempotency ID.
- Toasts supplement persistent errors, not replace them. Recording state must remain visible.
- Archive is reversible visibility change; hard delete uses explicit confirmation and cannot imply instant signed-link revocation.
- No intrusive notifications or microphone prompt without user action.

## 10. Accessibility and privacy

Target WCAG 2.2 AA as a design goal, not a compliance claim. Verify contrast, visible focus, semantic controls, headings, keyboard navigation, reduced motion and screen-reader labels. Touch targets aim at least 44px for main learning controls. Modal/sheet focus returns to trigger; Escape does not discard dirty work silently. Drawing has text instructions and alternate learning path; do not falsely claim full nonvisual equivalence of handwriting.

Use appropriate lang attributes for mixed scripts. Translations/readings are toggles with state. Playback/recording controls have names and keyboard actions. Do not autoplay loud media on page load. Private thumbnails/previews and browser titles must not leak foreign/private content through shared caches. No external analytics carrying learning text/audio by default.

## 11. UI acceptance and implementation order

| Stage | Screens | Relevant plan tasks |
|---|---|---|
| Foundation | Sign-in, shell, denied, language picker | 005–007 |
| First usable slice | Library, editor, reading, word capture/details | 008–010 |
| Media | Transcript editor, player, shadowing and failure states | 011–014 |
| Practice | Writing, review, progress | 015–017 |
| Data/ops | Export/import, admin, settings and deletion | 018–022 |

Before release test compact/wide layouts, zoom/keyboard, all three scripts/IPA, long text, empty/missing data, permission-denied, offline failure, local-only recording, concurrent review conflict and account switching. Use actual device evidence for pointer/audio; screenshot appearance alone does not verify recording.

## 12. Open decisions

Visual identity/colors/logo; component/font choice; UI language; target devices/browsers; exact breakpoints after testing; supported media/speeds; recording retention; confirmations and administration UX. Design only implemented capabilities. Changes to learning scope or privacy require aligned spec and access-control updates.

| Version | Date | Change |
|---|---|---|
| 1.0 Proposed | 2026-10-16 | Initial UI screen/interaction contracts for Kiko |

---

## Research-informed UX proposals (2026-10-19)

Do not replace approved visual tokens or existing screens. Prototype two entry routes before implementation: (A) guided start with goal, language, self-reported level and short first lesson; (B) content-first start using a permitted text/media lesson. Measure task completion, confusion, time to first meaningful action and preference by learner type. Avoid mandatory placement tests without evidence.

Show contextual vocabulary with source sentence/segment, pronunciation notation where supported, retrieval prompt before revealing an answer, and clear review state. Distinguish saved, practised, due and demonstrated recall; never label a learner fluent based on activity counts. Give an easy return path after missed days; streaks and notifications must be optional and non-shaming.

Test Vietnamese explanations, screen-reader labels, keyboard focus, reduced motion, touch writing, microphone denial and small screens. Respect the existing dark glass design direction while maintaining text contrast and low visual distraction. AI feedback should state uncertainty and permit retry/correction; no invented pronunciation accuracy.

All new screens and states are **prototype candidates**, not accepted delivery scope. Refer to `RESEARCH_INSIGHTS.md`.
