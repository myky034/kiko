# Kiko UI Design System — Soft Learning System v1.0

> Status: Proposed · Source of truth: Kiko's **first light/pastel hi-fi mockup** · Updated: 2026-10-16  
> Applies to: marketing site, learner web app, responsive mobile app.  
> Does **not** adopt the later dark/visionOS glassmorphism concepts.

## 1. Design direction

**Product promise:** Learning a language should feel approachable, calm, and rewarding.  
**Keywords:** Bright & Friendly · Warm & Playful · Learning First · Gentle Motivation.  
**Principles:**
1. Learning content is primary; decoration must not compete with reading or exercises.
2. Show one clear primary action per section.
3. Prefer spacious layouts, solid readable surfaces, soft pastel accents and rounded corners.
4. Use encouraging, everyday Vietnamese microcopy; avoid grandiose marketing claims.
5. Represent completion, correctness, errors and locked states with both text/icons and color.
6. Responsive/mobile-first, keyboard accessible and motion-reduced by preference.

## 2. Colors

The HEX values below are **proposed normalized tokens inspired by the first mockup**, not sampled or verified source-file colors.

| Token | Value | Purpose |
|---|---|---|
| primary | `#7568DA` | Main CTA, active navigation |
| primary-hover | `#6254C7` | Hover/pressed |
| primary-soft | `#F0EDFF` | Selected backgrounds |
| blue | `#4776F5` | Secondary accents |
| accent-lavender | `#EAE4FF` | Supportive decoration |
| accent-mint | `#DDF6F0` | Review, encouraging surfaces |
| accent-peach | `#FFE9D6` | Warm highlights |
| accent-yellow | `#FFF0BF` | Friendly highlights |
| background | `#F8F9FD` | App canvas |
| surface | `#FFFFFF` | Cards, panels, lesson content |
| foreground | `#20243A` | Primary text |
| muted-foreground | `#667085` | Secondary text |
| border | `#E7EAF2` | Dividers and outlines |
| success | `#198568` | Correct/completed |
| warning | `#B66A12` | Attention |
| destructive | `#C83E50` | Error/destructive |

**Distribution guideline:** approximately 70% neutral/white, 20% lavender/blue, 10% contextual accent; never rely on pastel-on-white for essential text. Validate actual foreground/background contrast to WCAG 2.2 AA (4.5:1 normal text, 3:1 large text and key UI indicators).

## 3. Typography

- Primary UI font: **Inter**, Vietnamese glyph coverage required.
- CJK fallback: `"Noto Sans CJK JP", "Noto Sans CJK KR", "Noto Sans CJK SC", sans-serif` as appropriate for Japanese, Korean and Chinese text.
- Optional distinct display typeface only for marketing headings, never for long-form learning content.
- Display: 40–48px / 1.15 / 700; mobile 32–36px.
- Page title: 28–32px / 1.2 / 700.
- Section title: 20–24px / 1.3 / 600.
- Body: 16px / 1.5 / 400.
- Supporting text: 14px / 1.5 / 400.
- Small labels: 12–13px only where nonessential; do not use tiny text for exercises.
- Preserve language-specific line breaking and ruby/furigana when applicable.

## 4. Layout, spacing, radii, elevation

**Spacing scale:** `4, 8, 12, 16, 24, 32, 48, 64px`.  
**Desktop:** max content width 1200–1280px, page padding 32px, sidebar ~240px.  
**Mobile:** 16–20px horizontal padding, bottom navigation, touch targets at least 44×44px.  
**Section gap:** 32px desktop / 24px mobile.  
**Card padding:** 20–24px desktop / 16–20px mobile.  
**Grid gap:** 16–24px desktop / 12–16px mobile.

| Token | Radius |
|---|---:|
| radius-sm | 8px |
| radius-md | 12px |
| radius-lg | 16px |
| radius-xl | 20px |
| radius-2xl | 24px |

Cards use white surfaces, subtle borders and light shadows; avoid heavy gradients or glass on long reading surfaces.  
Card shadow: `0 4px 18px rgba(35,40,80,.045)`.  
Floating shadow: `0 12px 36px rgba(35,40,80,.10)`.

## 5. Component inventory

### Buttons
- Variants: primary, secondary, outline, ghost, destructive.
- Sizes: sm 36px, md 44px, lg 48px; mobile key CTAs 48–52px.
- States: default, hover, focus-visible, pressed, loading, disabled.
- Only one dominant primary CTA per functional region.
- Example labels: **Tiếp tục học**, **Ôn tập ngay**, **Xem chi tiết**.

### Learning cards
- Types: CourseProgressCard, ContinueLessonCard, ReviewDueCard, PracticeRecommendationCard, LiveClassCard, MetricCard.
- States: loading, empty, active, completed, locked, error.
- Required slots: title, supporting text, status/progress, action.
- Do not communicate locked or completed state by color alone.

### Navigation
- Desktop sidebar: Dashboard, My Courses, Practice Hub, Vocabulary, Progress, Settings.
- Mobile bottom navigation: Home, Learn, Practice, Progress, Profile (adapt to actual MVP scope).
- Active item: primary text/icon and soft lavender background; visible keyboard focus.
- Keep language switcher separate from interface locale.

### Inputs, tabs and overlays
- Inputs with persistent labels, helper/error text and explicit focus state.
- Lesson tabs: Học / Từ vựng / Ngữ pháp / Luyện tập / Tổng kết.
- Modal only for focused tasks; avoid lengthy lessons inside dialogs.
- Toast for transient feedback; persistent inline alerts for actionable errors.
- Flashcard: front/back, reveal, review rating and progress counter.

## 6. Screen-specific guidance

| Screen | Visual priority | Key layout |
|---|---|---|
| Landing desktop | Kiko mascot + hero message | Two-column hero, one CTA, four highlights, testimonials, footer |
| Dashboard desktop | Continue learning | Sidebar, daily goal, review due, weekly progress, recommendations |
| Dashboard mobile | Resume lesson | Single-column cards, thumb-friendly actions, bottom nav |
| Lesson Player | Video/dialogue content | Large media, tabs, vocabulary side panel on desktop |
| AI Speaking | Conversation and mic | Big microphone, message thread, feedback and replay |
| Progress | Comprehensible charts | Solid chart panels, completion/performance/mastery separated |
| Live Class | Teacher video | Large video, participants, chat, accessible controls |
| Vocabulary Review | One flashcard | Four ratings: Quên mất / Khó / Bình thường / Dễ |
| Community | Readable feed | Post, replies, questions and challenges |
| Profile | Learner information | Language goals, preferences, notifications, security |

**MVP scope note:** AI speaking, live classes and community may be phased after the core Hybrid Learning MVP; their inclusion in the design inventory does not imply implementation in MVP.

## 7. Brand illustration and photography

- The **first mockup** uses a friendly, soft 3D chibi Kiko character, cream hoodie, lavender accents and gentle expressions.
- Maintain a character sheet for welcome, learning, encouragement, celebration and review reminders.
- Limit mascot use in dense reading and quiz screens.
- Use licensed/consented real imagery for teachers and learners; avoid artificial stock-photo smiles.
- Keep illustration style, light direction and color palette consistent.

## 8. Motion

| Interaction | Duration |
|---|---|
| Card hover | 150–200ms |
| Button press | 100–150ms |
| Tab switch | 180–220ms |
| Flashcard flip | 300–400ms |
| Completion feedback | 250–400ms |
| Modal transition | 180–250ms |
| Progress animation | 300–500ms |

Use restrained easing and respect `prefers-reduced-motion`. Never animate continuously merely for decoration.

## 9. Accessibility, responsive and internationalization

- Target WCAG 2.2 AA, with verified text/UI contrast and visible focus rings.
- All controls keyboard-operable; buttons and icons need accessible names.
- Audio/video lessons need captions/transcripts where appropriate.
- Respect mobile safe areas and prevent bottom navigation from covering content.
- Test Vietnamese diacritics, French accents, Japanese kana/kanji and Korean hangul.
- Distinguish **interface language** from **learning language**.
- Provide skeleton/loading, empty, offline, error, locked, active and completed states.

## 10. Tailwind / shadcn CSS tokens

Place in the application's global stylesheet and adapt to the installed Tailwind/shadcn version; these are **raw CSS values**, not a claim that the repo already uses this token naming.

```css
:root {
  --background: #f8f9fd;
  --foreground: #20243a;
  --card: #ffffff;
  --card-foreground: #20243a;
  --primary: #7568da;
  --primary-hover: #6254c7;
  --primary-foreground: #ffffff;
  --primary-soft: #f0edff;
  --secondary: #f1f3fa;
  --secondary-foreground: #333752;
  --muted: #f4f5f9;
  --muted-foreground: #667085;
  --border: #e7eaf2;
  --success: #198568;
  --warning: #b66a12;
  --destructive: #c83e50;
  --accent-mint: #ddf6f0;
  --accent-peach: #ffe9d6;
  --accent-lavender: #eae4ff;
  --accent-yellow: #fff0bf;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --shadow-card: 0 4px 18px rgba(35, 40, 80, 0.045);
  --shadow-floating: 0 12px 36px rgba(35, 40, 80, 0.10);
}
```

Example:
```tsx
<button className="min-h-12 rounded-xl bg-[var(--primary)] px-5 font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
  Tiếp tục học
</button>
```

## 11. Design review / acceptance checklist

- [ ] Palette matches the **first pastel concept**, not later dark-glass explorations.
- [ ] All primary text, supporting text and controls meet contrast targets.
- [ ] Consistent spacing, radius, typography and focus styles.
- [ ] One visually dominant action per section.
- [ ] Loading, empty, error, disabled, locked and completed states designed.
- [ ] Kiko mascot remains visually consistent across screens.
- [ ] Desktop, tablet and mobile layouts reviewed.
- [ ] Exercise, flashcard, progress and quiz interactions are unambiguous.
- [ ] No excessive shadows, gradients or ornamental animations.
- [ ] Tokens/components can map to Tailwind CSS + shadcn/ui.

## 12. Suggested Figma handoff structure

- `00 Foundations` — color, typography, spacing, radii, elevation
- `01 Components` — buttons, inputs, navigation, learning cards, tabs, flashcards
- `02 Desktop Screens` — main 10-screen inventory
- `03 Mobile Screens` — responsive adaptations
- `04 Interactions & States` — variants and flows
- `05 Developer Handoff` — tokens, annotations, responsive rules

**Document authority:** This file defines Kiko's proposed *visual design system*. Product behavior, security and data contracts remain governed by the respective project specs and implementation documents. Any future visual redesign should update this document explicitly rather than silently mixing concepts.
