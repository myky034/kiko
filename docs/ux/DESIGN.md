# Kiko — DESIGN.md

> Implementation spec for AI coding agents. Read this file **first**, then open the matching Hi-fi SVG for pixel-level detail.
> Kiko is a multi-language learning web app + mobile web (Japanese, Chinese, English; French planned).
> Brand direction: **"Quiet Bloom"** — calm, soft, human, a little playful. Logo = stylised "K" with two gradient petals.

> **Repository note (2026-10-21):** in this repository, `docs/DECISIONS.md` governs scope, sign-in, data and language decisions. Where this file differs on those — e.g. Apple/email sign-in, French, streaks, AI scores, subscriptions, live classes, level hierarchy, English-only copy — DEC-026 → DEC-031 apply. Visual tokens and components from this file are adopted (DEC-026), with the AA variants in DEC-031.

---

## 0. Source of truth and how to use this file

| Priority | Source | Use it for |
|---|---|---|
| 1 | This file (`DESIGN.md`) | Tokens, components, behaviour, data, rules. Wins on any conflict. |
| 2 | Hi-fi SVGs (`design/kiko-Hi-Fi-design/*.svg`, local and git-ignored) | Exact layout, spacing, copy, sizes. Open in browser/Figma and inspect. |
| 3 | Low-fi SVGs (`design/kiko_Low-Fi_design/*.svg`, local and git-ignored) | Original structure and intent; Hi-fi is derived from it with the same frame sizes and layer names. |
| 4 | Brand board (`Bảng giao diện ứng dụng học ngôn ngữ Kiko.png` — not in the repository) and `public/branding/*` | Palette, fonts, icon style, logo. |

Rules for the agent:
1. **Never hard-code colours, radii, shadows or font sizes** in components. Use the tokens in §3 (CSS variables / Tailwind theme).
2. Build **components first** (§4), then screens (§6). Every screen is a composition of the same ~25 components.
3. Hi-fi SVGs are static artboards: they show one state (e.g. a selected row, an open dropdown). Implement the real interaction states from §7.
4. SVG frame sizes are artboards, **not** fixed widths. Implement fluid layouts (§5).
5. When the design is ambiguous or inconsistent, follow §11 (known decisions) and list the assumption in the PR description.
6. Fonts are **not** embedded in the SVGs. Load them (§3.3).

Suggested stack (change only if the repo already has another): React + TypeScript, Tailwind CSS (theme = tokens below), `lucide-react` for icons, Plus Jakarta Sans + Inter + Noto Sans JP/SC via `next/font` or `@fontsource`.

---

## 1. Product context

Kiko combines: structured lessons (video, vocabulary, reading, listening, speaking with AI feedback, practice, review), a personal vocabulary bank with spaced-repetition flashcards, progress tracking and goals, a library of lessons by skill/topic/level, and (marketing copy) live classes with real teachers.

Primary user: self-learner (UI copy is English, with Vietnamese in lesson feedback — see §9).
Learning content model: **Language → Level (JLPT N5…N1, HSK 1…6, CEFR A1…C2) → Course → Lesson → Activities** (vocabulary, video, reading, comprehension, listening, speaking, practice, review).

---

## 2. Screen inventory

All screens exist as a **Desktop + Mobile** pair. Artboard sizes are from the SVG `viewBox`.

| # | Screen | Suggested route | Desktop artboard | Mobile artboard | Hi-fi files |
|---|---|---|---|---|---|
| 01 | Login | `/login` | 1080×961 | 394×961 | `kiko-login-{desktop,mobile}-hifi.svg` |
| 02 | Home | `/` | 1271×1064 | 345×1064 | `kiko-home-…` |
| 03 | Library | `/library` | 1182×998 | 312×998 | `kiko-library-…` |
| 04 | Lesson workspace — Vocabulary (cards) | `/lesson/:id/vocabulary` | 1174×962 | 365×963 | `kiko-lesson-vocab-…` |
| 04 | Lesson workspace — Vocabulary (list) | `/lesson/:id/vocabulary?view=list` | 1128×963 | 365×963 | `kiko-lesson-vocab-list-…` |
| 04 | Lesson workspace — Video | `/lesson/:id/video` | 1124×963 | 369×963 | `kiko-lesson-video-…` |
| 04 | Lesson workspace — Reading | `/lesson/:id/reading` | 1127×965 | 366×965 | `kiko-lesson-reading-…` |
| 04 | Lesson workspace — Speaking | `/lesson/:id/speaking` | 1129×963 | 365×963 | `kiko-lesson-speaking-…` |
| 04 | Lesson workspace — Practice | `/lesson/:id/practice` | 1131×968 | see file | `kiko-lesson-practice-…` |
| 04 | Lesson workspace — Review (flashcards) | `/lesson/:id/review` | 1126×963 | 367×963 | `kiko-lesson-review-…` |
| 05 | My Vocabulary — Card view | `/vocabulary?view=cards` | 1127×963 | 367×963 | `kiko-my-vocabulary-…` |
| 05 | My Vocabulary — List view | `/vocabulary?view=list` | 1129×964 | 366×964 | `kiko-my-vocabulary-list-…` |
| 06 | Progress | `/progress` | 1129×964 | 366×963 | `kiko-progress-…` |
| 07 | Profile | `/profile` | 1129×963 | 366×963 | `kiko-profile-…` |

Layer/group names inside each SVG match the section names used below (e.g. `Sidebar`, `Top bar`, `Course header`, `Word list`). Use them as component names.

---

## 3. Design tokens

### 3.1 Colour

```css
:root {
  /* brand */
  --sky: #7DD3FC;      --violet: #A78BFA;   --coral: #FCA5A5;   --amber: #FCD34D;
  --ink: #0F172A;      --mist: #F8FAFF;
  /* text */
  --text: #0F172A;     --text-body: #475569; --text-muted: #64748B;
  --accent: #6D4DE8;   /* links, active nav text, secondary actions (AA on white) */
  /* lines & neutral fills */
  --line: #E2E8F0;     --field: #CBD5E1;     --soft: #EEF2F8;   /* soft = progress track, neutral chip */
  /* semantic */
  --success: #3DBE7A;  --success-dark: #15803D; --success-bg: #E9F8F0; --success-border: #BFE6CF;
  --danger:  #E0525C;  --danger-bg: #FEEFF0;    --danger-border: #F8CDD1;
  --warning: #F59E0B;  --warning-dark: #9A5B05; --warning-bg: #FEF6E1; --warning-border: #FBE3A6;
  --info:    #4F86F7;  --info-dark: #2A63B8;    --info-bg: #EAF3FE;    --info-border: #BBD9F7;
  --tag-bg:  #E7E9FC;  --tag-text: #4B5BC9;     /* generic tags (e.g. "Daily life") */
  --level-bg: var(--success-bg); --level-text: var(--success-dark); /* level tag (HSK1, N5 in vocab cards) */
  --star: #F5B50A;     --star-bg: #FFF7DB;      --star-border: #F5D56B;
}
```

Tone palette (used by `IconTile`, thumbnails, goals): `sky #7DD3FC / deep #2A8FDB`, `violet #A78BFA / deep #7048E0`, `coral #FCA5A5 / deep #E0525C`, `amber #FCD34D / deep #C98A00`. Tile background = tone colour at **28 % opacity** with a 1 px inner stroke `rgba(255,255,255,.8)`; icon colour = deep tone.

Language colours (flag dot, level badge, progress bar): Japanese → violet (`#E7E9FC` bg / `#4B5BC9` text, bar = brand gradient), Chinese → coral (`#FEEFF0` / `#C73B45`, bar `#E0525C`), English → blue (`#EAF3FE` / `#2A63B8`, bar `#4F86F7`).

Skill colours (Progress/Library): Reading `#E0525C`, Listening `#F59E0B`, Speaking `#4F86F7`, Writing `#3DBE7A`, Vocabulary violet.

### 3.2 Gradients

| Token | Definition | Used for |
|---|---|---|
| `--grad-cta` | `linear-gradient(90deg,#4F86F7,#7C5CF0)` + overlay `linear-gradient(180deg,rgba(255,255,255,.3),transparent)` on the top half | Primary button, current-page dot, speaker button (active), 1/2/… selected page |
| `--grad-ring` | `linear-gradient(135deg,#4F86F7,#8B5CF6)` | Progress bars (default), donut rings, selected-item 2 px outline, avatar ring |
| `--grad-active` | `linear-gradient(90deg, rgba(125,211,252,.32), rgba(167,139,250,.30))` + 1 px inner stroke `rgba(255,255,255,.8)` | **Active/selected soft pill**: sidebar item, active tab/segment, selected row/card, active bottom-nav item |
| `--grad-keep` | `linear-gradient(135deg, rgba(125,211,252,.28), rgba(167,139,250,.24))` | "Keep learning!" card |
| `--grad-explain` | `linear-gradient(135deg, rgba(125,211,252,.16), rgba(167,139,250,.16))` | Example sentence / explanation boxes |
| `--grad-ok` / `--grad-no` | `#5BD394→#22A06B` / `#FCA5A5→#E0525C` | Correct / wrong answer dot |
| `--grad-bar-{sky,violet,coral,amber}` | sky `#7DD3FC→#4F86F7`, violet `#C4B5FD→#7C5CF0`, coral `#FCA5A5→#F47A9A`, amber `#FCD34D→#F59E0B` | Tonal progress bars (skills) |
| `--grad-bars` (chart) | vertical `#C4B5FD→#7C5CE0` | Study-activity bars (opacity .55–.95 by value) |
| `--grad-area` | vertical `rgba(139,92,246,.25)→0` | Area under line chart |
| `--grad-hero` | `linear-gradient(135deg,#BDE6FC,#C9BCFA,#FBC9C9)` | Progress hero, profile banner (profile uses `#D6EEFD,#E6E0FC,#FCE1E1`) |
| Logo gradients | see `public/branding/kiko-symbol-editable-vector.svg` | Logo only — use the SVG, don't rebuild |

**Page background ("soft mesh")** — every screen:
`linear-gradient(180deg,#EEF5FF,#F4EFFF)` + four blurred radial glows (absolute, non-interactive, `radial-gradient(circle, color/α, transparent 70%)`):
sky α.55–.6 top-left (r≈380), coral α.45 top-right (r≈320), violet α.45 bottom-right (r≈360), amber α.35–.4 bottom-left (r≈300). On mobile use r≈200–260 and opacity −10 %.

### 3.3 Typography

| Role | Family | Notes |
|---|---|---|
| Headings, body, buttons, labels | **Plus Jakarta Sans** (400/500/600/700/800) | Default `font-family` |
| Numbers, counters, stats, times, pagination, percentages | **Inter** (500/600/700/800), `font-variant-numeric: tabular-nums` | Use class `.num` |
| Japanese text | `'Noto Sans JP','Hiragino Sans','Yu Gothic'` | `lang="ja"` |
| Chinese text + **pinyin** | `'Noto Sans SC','PingFang SC','Microsoft YaHei'` | `lang="zh"`. **Pinyin must use the SC font** (Plus Jakarta lacks ǎ ǐ ǔ glyphs). |

Scale (px, desktop → mobile). Weight 800 is used for page/section titles and key numbers.

| Token | Size / weight | Examples |
|---|---|---|
| `display` | 28/800 (mobile 22) | Page title "Library", "Progress", "Profile" |
| `title-lg` | 22–26/800 | Lesson title, "My Vocabulary" |
| `title` | 14–16/800 | Card/section titles ("Continue Learning", "Weekly Goal") |
| `body` | 12–13/400–500 | Descriptions |
| `label` | 11–12/600–700 | Tabs, buttons, row labels |
| `caption` | 9.5–10.5/400–500 | Sub-lines, helper text |
| `micro` | 8.5–9/500–700 | Chart axis, tiny meta (never below 8.5) |
| `vocab-jp` | 17–24/800 | Word headings in cards |

### 3.4 Radius, spacing, elevation

- Radius: `xs 8` · `sm 10–12` (inputs, dropdowns, small cards) · `md 14` (rows, tiles) · `lg 16–18` (cards) · `xl 20` (frame/banner) · `pill 9999` (tabs, chips, badges, search on mobile).
- Spacing grid: **4 px base**; common gaps 8 / 12 / 16 / 24; card padding 14–18 (desktop), 10–14 (mobile); page gutter desktop 24–28 from sidebar, mobile 16.
- Card = `background:#fff; border:1px solid var(--line); border-radius:16–18px; box-shadow:0 2px 0 rgba(15,23,42,.035)` (the artboards use a 2 px offset ink shadow at 3.5–4 % opacity). Elevated (dropdown, tooltip, sheet) = `0 8px 24px rgba(15,23,42,.08)`.
- Primary button shadow: `0 4px 0 rgba(109,77,232,.13)` (soft violet drop).
- Glass panel (hero): `background:rgba(255,255,255,.62); border:1px solid rgba(255,255,255,.9); backdrop-filter: blur(8px)`.

### 3.5 Icons

Lucide, rounded caps/joins, `stroke-width` 1.75–2.2 (**1.8 inactive, 1.9–2 active, 2.2 for chevrons/small**). Sizes: 14 (chevrons, inline), 16–18 (buttons, rows), 20–22 (nav, top bar), 28 (feature). Colours: inactive `--text-muted`, active `--accent`, destructive `--danger`.
Lucide names used: house, book-open, graduation-cap, layers, copy, chart-column, user, settings, mic, headphones, file-text, pen-line, bell, search, calendar, clock, play, circle-play, star, bookmark, volume-2, ellipsis, chevron-{left,right,up,down}, arrow-right, arrow-up-down, sliders-horizontal, funnel, list, layout-grid, plus, pencil, check, circle-check, lock, target, trophy, flag, flame, camera, crown, mail, shield, shield-check, download, trash-2, globe, rotate-cw, rotate-ccw, triangle-alert, sprout, columns-3, hash, soup, utensils, plane, briefcase, flower-2, gamepad-2, hand.

---

## 4. Component catalogue

Heights/sizes are the Hi-fi desktop values; mobile differs where noted. "Active pill" = `--grad-active`.

### 4.1 App shell

**`AppShell`** — desktop: fixed left `Sidebar` (width **187–192**, white @72 % opacity, 1 px right border `--line`) + scrollable content on the mesh background. Mobile (<768): no sidebar; `BottomNav` fixed (height 63–76 + safe-area), top bar per screen.

**`Sidebar`** — logo (symbol 32 px + "Kiko" 25/800) at top-left; nav items 164×40, radius 12, icon 22, label 14/500 (active: 700 `--accent` + active pill); footer card **`KeepLearningCard`** (164×61–70, `--grad-keep`, sprout icon, "Keep learning!" 12/700, "Small steps, big progress." 9.5 muted).
Canonical nav (see §11-1): Home · Library · My Learning · Vocabulary · Flashcards · Progress · Speaking · Profile · Settings. Hi-fi artboards show a subset per screen; implement the full list once.

**`TopBar`** (desktop, right-aligned): bell 22 + coral 4 px dot with white 1.5 ring, avatar (28–30 px circle, `--grad-cta`, initial "L") + "Learner" 13/600 + chevron-down.

**`BottomNav`** (mobile) — 4–5 items: Home, Library/Vocabulary, Study (circle-play), Progress, Profile. Icon 18–20, label 9.5–10; active = active pill 46–48×26–28 behind icon + `--accent` label 700. White @94 % + top border + soft upward shadow; home-indicator bar 130×5 `--ink`.

**`StatusBar`** (mobile mock only) — do not implement; it is the OS status bar.

### 4.2 Buttons

| Variant | Spec |
|---|---|
| `Button.primary` | `--grad-cta` + shine, white text 12.5–14/700, radius 12–16, height 33–49, soft violet shadow. Pressed: scale .98 + remove shadow. |
| `Button.secondary` | White, 1 px `--field` border, text `--ink` 600, radius 12. |
| `Button.soft` | Fill `#E7E9FC`, text `--accent` 700, pill radius, optional 12 px leading icon (Edit, Add language, Change goal, View plans (soft variant)). |
| `Button.icon` | 34–44 square/circle white + `--field`/`--line` border, icon 18. |
| `Button.danger-row` | Text/icon `--danger` (Delete account). |
| `Link` | `--accent` 600–700, trailing `arrow-right` 14 ("View All", "View details"). |

### 4.3 Navigation controls

- **`Tabs`/`SegmentedControl`** — container: white, 1 px `--line`, radius 16, height 39–43; active item = active pill (radius 13). Text 11.5–12.5, active 700 `--accent`, inactive 500 `--text-body`. Optional 15 px leading icon. Mobile: horizontally scrollable pills (active pill + plain text).
- **`ViewToggle`** (List / Cards) — 2-segment pill, active = active pill with 700 text.
- **`Pagination`** — prev/next 24–28 square outline buttons; current page = `--grad-cta` 28–30×30 radius 9, white Inter 700; others plain Inter 500; "···"; last page boxed. "Rows per page" dropdown right.
- **`Stepper` (lesson sidebar "Lesson Content")** — vertical list of numbered steps with status icon: done (green check circle), partial (half ring), current (play/ring in accent), todo (empty circle), lock. Each: title 12.5/700 + subtitle 10 muted.

### 4.4 Inputs

- **`SearchInput`** — white, 1 px `--field`, radius 14 (mobile pill 12), height 34–43, leading search 20 `--text-muted`, placeholder 12–12.5 muted.
- **`Dropdown`/`Select`** — white, `--field` border, radius 12, height 34–47, value 11.5–12.5/500–600, trailing chevron-down 14 muted. Variant with floating mini-label (9/600 muted above value) used in Library filters. Optional leading flag (circle r 9–10).
- **`DropdownMenu`** (open) — white card radius 16, elevated shadow; row height 28–30; selected row = active pill + `check` icon `--accent`.
- **`TextField`** (login) — label above, field per Dropdown style; password has show/hide icon.
- **`Checkbox`** — 14×14, radius 4, border `--field`; checked = `--grad-cta` + white check.

### 4.5 Display atoms

- **`Chip`/`Tag`** — pill; generic tag `--tag-bg/--tag-text` 8.5–11/700; level tag green; padding 7–10 horizontal; height 18–24.
- **`StatusBadge`** — pill with 5 px dot + label 9–9.5/700: Learning (`--info-*`), Mastered (`--success-*`), Weak (`--warning-*`). Height 20–22.
- **`LevelBadge`** — N5 / HSK 1 / A2 per language colours (§3.1), radius pill.
- **`ProgressBar`** — track `--soft`, height 4–8, radius full, fill `--grad-ring` (or tonal). Min fill width = height (don't draw empty fill as a dot: skip fill when value = 0).
- **`DonutRing`** — track `--soft`, stroke 7–9, `--grad-ring`, round caps, start at 12 o'clock; centre number Inter 800 24–25 + caption 9–9.5. Sits on white circle @92 %.
- **`IconTile`** — square (22–67) radius 30 % with tone (§3.1) + Lucide icon at 50 %.
- **`Thumb`** (placeholder art for lessons/words) — rounded rect with 2-colour diagonal gradient, two translucent white circles, 1–2 logo petals and a centred translucent circle holding a Lucide icon. Replace with real images when available; keep the radius and the gradient fallback.
- **`SpeakerButton`** — circle 22–36; inactive white + `--line` border + `volume-2` in `--accent`; active/primary uses `--grad-cta` + white icon.
- **`StarButton`** — circle; on = `--star-bg` + `--star-border` + filled star `--star`; off = white + `--line` + muted star.
- **`Avatar`** — circle with `--grad-cta`, white initial; profile uses photo with 3–4 px gradient ring + camera badge.
- **`Flag`** — 18–26 px circle: jp = white with red disc, zh = red with yellow star, en = blue cross, fr = tricolour.
- **`Tooltip`** — white card radius 10, shadow, date 9.5 muted + dot + value 10.5/800.

### 4.6 Containers

- **`Card`** — see §3.4. Header pattern: title (14/800) + subtitle (10.5 muted) left, action (`Button.soft`/`Link`/`Dropdown`) right.
- **`ListRow`** — 49–56 high, icon tile/flag left, label 11.5–12/600–700, trailing value (muted) + chevron-right; divider 1 px `#EEF1F6` between rows.
- **`SelectedRow`** — active pill + 1.6–2 px `--grad-ring` outline inset 1 px.
- **`ExplainBox`** — `--grad-explain`, radius 12–14, white 1 px inner stroke, speaker button left, JP/romaji/translation lines.
- **`BottomSheet`** (mobile) — radius-top 22, white, upward soft shadow, 40×4 handle `--field`; footer action bar fixed inside the sheet (white, top border).
- **`Hero`** (Progress, Profile) — gradient art + petals + glass panel (§3.4).

### 4.7 Charts (pure SVG, no library required)

- **Bar chart (Study activity)** — 30 bars/30 days, width 11 (desktop) / 6.5 (mobile), radius 40 % width, gradient `--grad-bars`, grid lines dashed `#E9ECF2` (`2 3`), y labels Inter 9 muted, x labels every ~7 days; hovered bar opacity 1 + dashed guide + marker + tooltip.
- **Line/area (Vocabulary growth)** — stroke `#7C5CE0` 2 px round joins, area `--grad-area`, hovered point r4 with white 2 px ring and dashed guide.
- **Week dots (Weekly goal)** — done = 15–18 px green circle + white check; empty = 13–16 px ring `--field`.

---

## 5. Layout and responsive rules

- **Breakpoints:** `mobile < 768`, `tablet 768–1023` (use desktop layout with sidebar collapsed to icon rail 72 px), `desktop ≥ 1024`. Artboards: desktop ≈ 1130–1270 wide, mobile ≈ 312–394 wide.
- **Desktop shell:** sidebar 187–192 + content (padding-left 24–28, right 16–24). Max content width ≈ 1130; centre beyond that.
- **Two-column lesson workspace (desktop):** main column ≈ 640–720 + right rail ≈ 260–310 (Lesson Progress, Tools / Word detail). Mobile: single column; right-rail content moves to tabs or a bottom sheet.
- **Grids:** Library/Home card grids use 4 columns desktop (gap 14–16), 2 columns tablet, horizontal-scroll or 1–2 columns mobile. Use `grid-template-columns: repeat(auto-fit, minmax(210px, 1fr))` as a fallback.
- **Mobile pattern:** page title centred (17/800) or left (22/800), actions at top-right, filters as horizontally scrollable pills, cards full-width (gutter 16), primary action fixed above BottomNav where shown (lesson footer "Previous/Next").
- **Touch targets** ≥ 40 px on mobile (chips 32 high are allowed only inside scroll rows with 8 px gaps).
- **Scrolling:** whole page scrolls; sidebar fixed; mobile BottomNav fixed; lesson bottom sheets scroll internally.
- Never let text overflow: truncate with ellipsis for single-line labels, wrap for descriptions. Cards contain content; do not rely on fixed heights.

---

## 6. Screen specs

Common to all authenticated desktop screens: `Sidebar` + `TopBar` (except Home variants noted). Lesson workspace screens add a `Course header` and a two-column body.

### 01 Login
- **Desktop:** two panels. Left (brand panel): logo, headline "Learn **languages** your way" (gradient on "languages"), sub-copy, 4 feature rows (IconTile + title + description): Personalized learning path · AI speaking practice · Live classes with real teachers · Track your progress; soft illustration (hills, orb, petals). Right: language select (top-right, default English), card with "Welcome to Kiko", `Continue with Google / Apple / Email` (secondary buttons with brand logos — keep Google/Apple official glyphs), "or" divider, Email + Password fields, "Remember me" + "Forgot password?", primary **Sign in**, "Don't have an account? Sign up", legal line.
- **Mobile:** brand + language select on top, short hero, then white bottom sheet with the same form.
- **States:** field focus (2 px `--grad-ring` outline), error (danger border + message under field), loading button, social loading.

### 02 Home
Sections (desktop): Greeting ("Good morning!" + date + week strip Mon–Sun with today highlighted gradient dot and completed dots), **Continue learning** card (thumb, `Japanese • N5` chip, lesson title, description, progress bar + %, `Continue` primary + "View Lesson Details" link), **Today's plan** (4 tasks: Review Vocabulary 10 words · Speaking Practice 10 minutes · Listening Practice 1 lesson · Reading Practice; each IconTile + check circle), **Your Learning Progress** (donut 40 %, streak "7 days", skill bars Vocabulary/Reading/Listening), **Recommended for You** (4 lesson cards), **Browse by Topic** (6 tiles).
Mobile: same order, single column; topic tiles 2×3; BottomNav.

### 03 Library
Header: title, subtitle, **filters** (Search · Language · Level · Skill dropdowns · Reset). **Categories** row (All Content active, Vocabulary, Reading, Listening, Speaking — IconTile + title + sub-line; active = soft pill + ring). **Continue Learning** (one wide card with progress), **Browse by Skill** (4 cards with lesson counts + arrow), **Recommended for You** (4 lesson cards: thumb, bookmark button, language chip, title, description, type + duration), **Browse by Topic** (6 compact tiles, chevron).
Mobile: search + filter button, filter chips (All, Vocabulary, Reading, Listening, Speaking), Continue card (button full width), skill tiles 4-up, recommended as horizontal list rows (thumb left), topics 2-col grid.

### 04 Lesson workspace (shared)
- **Course header:** back link "Back to My Learning"; language chip `Japanese • N5`; lesson title (22–26/800); subtitle; step counter `n / 10` + progress bar.
- **Left rail:** `Lesson Content` stepper (6–7 steps; names vary per lesson, see files; current step highlighted with soft pill).
- **Main:** activity card (varies below). **Footer:** `Previous` (secondary) / `Next` (primary).
- **Right rail:** `Lesson Progress` (% + per-activity counts) and `Tools` (Dictionary, Notes, Translate, Text size / Record history, Report an issue) — each tool = icon + title + description row.
- **Mobile:** header compact (title + chip + `n / 10`), activity tabs row (Video · Vocab · Practice · Listening · Speaking), activity content, fixed Previous/Next.

**04a Vocabulary (cards):** auto-play toggle, counter `1 / 6`, large flashcard (word 40+/800, romaji, meaning, speaker, example box), thumbnails row of words, Prev/Next. **04b Vocabulary (list):** view toggle List/Cards, numbered rows (word, romaji, meaning, speaker, star) with selected row, right **word detail** (phrase/formal tags, meaning, usage, example, related words). **04c Video:** 16:9 player (poster, subtitles overlay, controls: play, time `0:42 / 5:28`, speed `1.00x`, CC, fullscreen), tabs Transcript / Key Vocabulary / Notes, transcript search + language select (JP + EN), rows with timestamp, JP, EN, play, bookmark; active row highlighted. **04d Reading:** "Read aloud" + speed select, passage card with furigana above kanji (use `<ruby>`), clickable words → popover with meaning, "Vocabulary in this passage" chips, collapsible Translation. **04e Speaking:** phrase counter `1/5`, big phrase + romaji, **Listen to model**, big mic button ("Tap to speak / Or press space bar"), "Your last attempt" player (waveform, `0:03 / 0:05`, speed), AI **Feedback** card (score 92 %, "What you did well", "Tips for improvement"), phrase list. **04f Practice:** exercise-type tabs (Multiple Choice, Fill in the Blank, Sentence Building, Listening), `Question 3 / 8`, question card with options A–D (states: default, selected, correct = green, wrong = red), Hint, **Correct feedback** banner + **Explanation** box, Practice Progress (answered/correct/wrong/remaining) and Question Navigator grid. **04g Review:** mode tabs (Weak Items (3), Mixed Review, Quiz Mode), flashcard (front: word + "Nhấn để xem nghĩa"; flips to back), 3 rating buttons (Quên rồi / Hơi nhớ / Nhớ rõ with face icons + schedule hint), options (auto-flip, pronounce, add note), progress, "Words in this lesson" filter + list.

### 05 My Vocabulary
- **Card view:** language tabs (Chinese/Japanese/English + add), **Study Now** primary, stats (Total · Learning · Weak · Mastered), filters (level, status, tags, source, sort), List/Cards toggle, 4-col card grid (thumb, star, word, reading, meaning, speaker, level + tag chips; selected card = ring), pagination, right **detail panel** (tabs Overview/Character/Examples/Notes).
- **List view:** status tabs (All Words, Saved, Weak Items, Mastered, By Lesson), filters (Language, Level, Status, Sort by, Filters button), stats row, **table** (checkbox, Word+romaji, Meaning, Tags, Status badge, Added date, speaker, more) with selected row, pagination + rows-per-page, right **word detail** (tabs Overview/Examples/Notes, meaning, usage, example, related words, status, added date, tags, actions Practice / Add to flashcards / more).
- **Mobile:** card view = single flashcard with prev/next, "Hiện nghĩa" primary, 3 rating buttons, quick example; list view = word cards + filter bar + **bottom sheet** word detail.

### 06 Progress
Header: title, subtitle, **Language dropdown** (open menu in artboard) + date range picker. Tabs: Overview · Study Time · Vocabulary · Skills · Achievements. Overview: **Hero** (language + level, donut overall %, glass panel with Words learned / Lessons completed / Study time), **Current level** card (progress to next level, level path N5→N1 with locked nodes), **Study Activity** bar chart, **Weekly Goal** (donut + week list), **Vocabulary Growth** line chart, **Skills Progress**, **Recent Achievements**, **Learning Path** (milestones: Hiragana ✓, Katakana (current), Basic Grammar, 300 Words, N5 Mock Test).
Mobile: tabs scroll (Overview, Study Time, Vocabulary, Skills), same cards stacked, weekly goal days in a row.

### 07 Profile
Banner (avatar + camera, name, email, `Learner` role badge, tagline, **Edit profile**). Cards: **Learning Languages** (rows: flag, name, level badge, progress `98 / 300 words`, chevron; `Add language`), **Learning Goals** (3 goals with IconTile, deadline, progress %), **Study Preferences** (Daily goal, Study reminder, Preferred study time, Learning mode, Interface language, Content level), **Subscription** (Free Plan, feature list, `View plans`), **Account & Security** (Email, Password, Sign in method, Two-factor), **Data & Privacy** (Download my data, Privacy settings, Delete account — destructive, confirm modal required).
Mobile: header with avatar left + settings icon, stacked cards each with a chevron into a detail page.

---

## 7. States and behaviour (not drawn in the artboards)

- **Interactive:** hover = border `--field` + slight lift (`translateY(-1px)`), buttons +4 % brightness; focus-visible = 2 px outline `--grad-ring`/`#4F86F7` with 2 px offset; disabled = 45 % opacity, no shadow; pressed = scale .98.
- **Selection:** single-select lists/cards use `SelectedRow`; multi-select uses `Checkbox` and a sticky bulk-action bar.
- **Loading:** skeletons use `--soft` with shimmer; charts show axis only. **Empty:** soft illustration (petals) + one-line explanation + primary action. **Error:** inline banner `--danger-bg` / `--danger-border`.
- **Audio:** `SpeakerButton` toggles to a playing state (animated waveform bars); only one audio plays at a time. Space bar triggers record in Speaking.
- **Flashcards:** tap/space flips (rotateY 180°, 250 ms). Rating schedules the next review (SRS intervals are backend concern).
- **Practice:** answer lock after check; feedback banner appears with 200 ms slide; correct → green, wrong → red + correct answer highlighted.
- **Motion:** 150–250 ms ease-out; respect `prefers-reduced-motion`. Petal "bloom" micro-animation on lesson completion is encouraged (brand note).
- **Dark mode:** not designed. Do not ship a half-implemented dark theme.

---

## 8. Data model (for realistic mocks / API contracts)

```ts
type Lang = 'ja' | 'zh' | 'en' | 'fr';
interface Learner { id: string; name: string; email: string; role: 'Learner'; avatarUrl?: string; tagline?: string; plan: 'free' | 'plus'; }
interface LanguageProgress { lang: Lang; level: string /* N5 | HSK 1 | A2 */; wordsLearned: number; wordsTarget: number; }
interface Lesson { id: string; lang: Lang; level: string; title: string; description: string; skill: 'vocabulary'|'reading'|'listening'|'speaking'|'writing'; topic: string; minutes: number; thumbnail?: string; steps: LessonStep[]; progressPct: number; }
interface LessonStep { key: 'vocabulary'|'video'|'reading'|'comprehension'|'listening'|'speaking'|'practice'|'review'; title: string; subtitle: string; status: 'done'|'partial'|'current'|'todo'|'locked'; }
interface Word { id: string; lang: Lang; text: string; reading: string /* romaji | pinyin */; meaning: string; level: string; tags: string[]; status: 'learning'|'mastered'|'weak'; saved: boolean; addedAt: string; audioUrl?: string; examples: Example[]; related: string[]; usage?: string; }
interface Example { text: string; reading: string; translation: string; audioUrl?: string; }
interface Goal { id: string; title: string; deadline?: string; progressPct: number; icon: 'target'|'trophy'|'flag'; }
interface StudyDay { date: string; minutes: number; }
interface Achievement { id: string; icon: 'flame'|'star'|'book-open'|'mic'; title: string; subtitle: string; date: string; }
```

Sample copy/data lives in the Hi-fi SVGs (e.g. lesson "Daily Greetings", words おはようございます / こんにちは / ありがとう…, Chinese 早上 / 你好 / 谢谢…). Use them verbatim for Storybook/mocks.

---

## 9. Content, i18n and accessibility

- **Language of UI:** English (as drawn). Lesson feedback in Practice/Review/Vocab-card mobile uses **Vietnamese** strings (e.g. "Đúng rồi!", "Giải thích", "Hiện nghĩa", "Quên rồi / Hơi nhớ / Nhớ rõ"). Put every string in an i18n catalogue (`en`, `vi`) — do not hard-code.
- **Dates/numbers:** `Oct 16, 2026`, `1,000`, durations `9h 20m`, `10 min`.
- **Contrast:** body text ≥ 4.5:1 (`--text-body` on white OK; `--text-muted` only for secondary ≥ 11 px); `--accent` for links. Don't use brand pastels (sky/coral/amber) for text.
- **Semantics:** nav = `<nav>`, tabs = `role="tablist"`, progress = `role="progressbar"` with `aria-valuenow`, icon-only buttons need `aria-label`, speaker buttons announce word + "play pronunciation", flashcard flip is a button with `aria-pressed`.
- **CJK:** set `lang` per text node; furigana via `<ruby><rt>`; never letter-space CJK; line-height ≥ 1.6 for passages.
- **Keyboard:** Space = record/flip, ←/→ = previous/next in lessons and flashcards, `/` focuses search.

---

## 10. Assets

| Asset | Where |
|---|---|
| Logo symbol (vector, editable) | `public/branding/kiko-symbol-editable-vector.svg` |
| Logo PNG 512/1024/2048, app icons light/dark | same folder (`kiko-symbol-*.png`, `kiko-app-icon-{light,dark}-1024.png`) |
| Brand board | `Bảng giao diện ứng dụng học ngôn ngữ Kiko.png` (not in the repository) |
| Logo rules | ≥ 24 px legible; needs a one-colour variant; no flags/Han characters as the main logo; may animate subtly when AI responds or a lesson completes |
| Illustrations / lesson art | placeholders (gradient + petals + icon). Replace later, keep the same crop ratios |

---

## 11. Decisions, deviations and open questions

Decisions made while converting Low-fi → Hi-fi (the Hi-fi wins; confirm with the designer if needed):

1. **Navigation** differed per low-fi screen (some had Vocabulary/Progress, others Speaking/Flashcards). Implement the union in §4.1 and highlight the current route.
2. **Progress screen data fixes:** weekly goal total corrected to 5.5 / 10 h (sum of daily hours); vocabulary growth axis 0–100 and ending at 98 words (matches "Words learned = 98"); level progress bar = 98/300 = 33 %.
3. **Progress → Learning Path card** shortened to fit the artboard (the low-fi overflowed the frame).
4. **Profile → goal "Learn 500 Chinese words"** deadline changed from *Mar 2026* (past) to **Mar 2027**.
5. **My Vocabulary → List view:** columns re-spaced; the Meaning column truncates at ~104 px (ellipsis), Tags at 2 chips max then `+n`.
6. Tiny low-fi text (7–8 px) was enlarged to ≥ 8.5 px; never go below.
7. Placeholders for photos (hero, avatars, lesson thumbs) are generic; real assets pending.

Open questions to resolve with the product owner: final list of languages/levels per language; whether "Live classes" exist in v1 (appears only on Login); subscription tiers/pricing; whether Writing is a v1 skill; offline support; notification settings screen (bell has no destination yet).

---

## 12. Suggested build order and acceptance checklist

1. Tokens (CSS vars + Tailwind theme), fonts, global background mesh.
2. Atoms: Button, Chip/Tag/StatusBadge, ProgressBar, DonutRing, IconTile, SpeakerButton, StarButton, Avatar, Flag, Checkbox, Inputs/Dropdown.
3. Shell: Sidebar, TopBar, BottomNav, Card, Tabs, Pagination.
4. Screens in this order: Login → Home → Library → Lesson workspace (Vocabulary, Video, Reading, Speaking, Practice, Review) → My Vocabulary → Progress → Profile.
5. Responsive pass at 1440 / 1280 / 1024 / 768 / 390 / 360 widths.
6. States pass (§7), then a11y pass (§9).

**Definition of done per screen**
- [ ] Visually matches the Hi-fi SVG at the artboard width (±2 px spacing, exact colours/gradients/typography via tokens).
- [ ] No hard-coded colours/sizes outside the token layer.
- [ ] Works fluidly between artboard widths; no overflow or clipped text.
- [ ] All interactive states from §7 implemented; keyboard accessible; strings externalised.
- [ ] Storybook story (or equivalent) for each new component with variants/states.

---

### Suggested `AGENTS.md` / `CLAUDE.md` pointer

```md
# Kiko
Before building any UI, read docs/ux/DESIGN.md. Use tokens only (no hard-coded colours/sizes). Compare against design/kiko-Hi-Fi-design/*.svg.
Stack: React + TS + Tailwind, lucide-react, Plus Jakarta Sans / Inter / Noto Sans JP & SC.
Run lint + typecheck + tests before finishing. Keep strings in the i18n catalogue (en, vi).
```
