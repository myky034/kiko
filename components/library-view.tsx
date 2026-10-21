import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ChevronDown,
  Clock,
  FileText,
  Hash,
  Headphones,
  LayoutGrid,
  Layers,
  Mic,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageBadge, LessonStatusBadge, LessonThumb } from "@/components/lesson-parts";
import { Alert, buttonClass } from "@/components/ui";
import { LIBRARY_PLACEHOLDERS, type SkillKey } from "@/modules/content/library-placeholders";
import { topicsOf } from "@/modules/content/topics";
import type { LessonSummary } from "@/modules/content/types";
import { mediumDate } from "@/modules/i18n/dates";
import { en } from "@/modules/i18n/en";
import { getLanguage, listLanguages } from "@/modules/language/registry";

const copy = en.library;

export type LibraryQueryView = { language?: string; status?: string; tag?: string };

export type LibraryViewProps = {
  /** The page of lessons for the current filters (newest first). */
  lessons: readonly LessonSummary[];
  /** "Load more" link that keeps the active filters, or null on the last page. */
  nextHref: string | null;
  query: LibraryQueryView;
  /** Any filter other than the default "active" status is applied. */
  filtered: boolean;
  deleted: boolean;
  timeZone: string | null;
};

const card = "rounded-[18px] border border-line bg-surface shadow-[0_2px_0_rgba(15,23,42,.035)]";
const tile = "rounded-[14px] border border-line bg-surface shadow-[0_2px_0_rgba(15,23,42,.035)]";
/** Dropdown with a floating mini-label (DESIGN.md §4.4); border uses control for AA. */
const dropdown =
  "relative flex h-[47px] flex-col justify-center rounded-[13px] border border-control bg-surface pr-8 pl-3";
const selectClass = "w-full appearance-none bg-transparent text-[12.5px] font-semibold text-ink outline-none";

const TONE_TILE = {
  sky: "tile-sky",
  violet: "tile-violet",
  coral: "tile-coral",
  amber: "tile-amber",
} as const;

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; tone: keyof typeof TONE_TILE }> = {
  all: { icon: LayoutGrid, tone: "sky" },
  vocabulary: { icon: Layers, tone: "violet" },
  reading: { icon: FileText, tone: "amber" },
  listening: { icon: Headphones, tone: "coral" },
  speaking: { icon: Mic, tone: "sky" },
};

const SKILL_STYLE: Record<SkillKey, { icon: LucideIcon; tone: keyof typeof TONE_TILE }> = {
  vocabulary: { icon: Layers, tone: "violet" },
  reading: { icon: FileText, tone: "amber" },
  listening: { icon: Headphones, tone: "coral" },
  speaking: { icon: Mic, tone: "sky" },
};

const TOPIC_TONES = ["tile-sky", "tile-violet", "tile-coral", "tile-amber", "tile-violet", "tile-sky"] as const;

function SectionHeader({
  id,
  title,
  subtitle,
  action,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-[16px] font-extrabold text-ink">
          {title}
        </h2>
        {subtitle ? <p className="hidden text-[11px] text-copy md:block">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <a href={href} className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-accent-strong hover:underline">
      {copy.viewAll}
      <ArrowRight aria-hidden="true" size={14} strokeWidth={2.2} />
    </a>
  );
}

/** Marks sample content for assistive tech; the visual stays as drawn (DEC-035). */
function SampleNote() {
  return <span className="sr-only"> ({copy.sample})</span>;
}

function Filters({ query }: { query: LibraryQueryView }) {
  return (
    <form
      method="get"
      aria-label={copy.filtersLabel}
      className="grid grid-cols-2 gap-2.5 md:flex md:flex-nowrap md:items-center md:gap-[10px]"
    >
      {/* Search has no backend yet: drawn, disabled, never submitted. */}
      <label className="col-span-2 flex h-[43px] items-center gap-3 rounded-[14px] border border-control bg-surface px-4 md:min-w-0 md:flex-1">
        <Search aria-hidden="true" size={20} strokeWidth={2} className="text-muted" />
        <span className="sr-only">{copy.searchLabel}</span>
        <input
          type="search"
          disabled
          placeholder={copy.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-muted disabled:cursor-default"
        />
      </label>

      <label className={`${dropdown} md:w-[134px] md:shrink-0`}>
        <span className="text-[9px] font-semibold text-copy">{copy.language}</span>
        <select name="language" defaultValue={query.language ?? "all"} className={selectClass}>
          <option value="all">{copy.allLanguages}</option>
          {listLanguages().map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
      </label>

      {/* Level and Skill have no data model: disabled, no name, never submitted. */}
      <label className={`${dropdown} md:w-[114px] md:shrink-0`}>
        <span className="text-[9px] font-semibold text-copy">
          {copy.level}
          <span className="sr-only"> ({copy.comingSoon})</span>
        </span>
        <select disabled defaultValue="" className={`${selectClass} disabled:cursor-default`}>
          <option value="">{LIBRARY_PLACEHOLDERS.levels}</option>
        </select>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
      </label>

      <label className={`${dropdown} md:w-[120px] md:shrink-0`}>
        <span className="text-[9px] font-semibold text-copy">
          {copy.skill}
          <span className="sr-only"> ({copy.comingSoon})</span>
        </span>
        <select disabled defaultValue="" className={`${selectClass} disabled:cursor-default`}>
          <option value="">{LIBRARY_PLACEHOLDERS.skillOptions}</option>
        </select>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
      </label>

      {/* Status is real and not in the Hi-fi: it is the only way to reach archived lessons. */}
      <label className={`${dropdown} md:w-[112px] md:shrink-0`}>
        <span className="text-[9px] font-semibold text-copy">{copy.status}</span>
        <select name="status" defaultValue={query.status ?? "active"} className={selectClass}>
          <option value="active">{copy.statusActive}</option>
          <option value="draft">{en.lessonStatus.draft}</option>
          <option value="ready">{en.lessonStatus.ready}</option>
          <option value="archived">{en.lessonStatus.archived}</option>
        </select>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
      </label>

      {query.tag ? <input type="hidden" name="tag" value={query.tag} /> : null}

      <div className="col-span-2 flex items-center gap-4 md:col-span-1 md:shrink-0 md:gap-3">
        <button type="submit" className={`${buttonClass.secondary} h-[43px] min-h-0 flex-1 rounded-[14px] md:flex-none md:px-3`}>
          <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={2} />
          {copy.apply}
        </button>
        <Link href="/library" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-accent-strong hover:underline">
          <RotateCcw aria-hidden="true" size={15} strokeWidth={2.2} />
          {copy.reset}
        </Link>
      </div>
    </form>
  );
}

/** Content-type tabs: only "All Content" exists today; the rest are sample tabs (DEC-035). */
function Categories() {
  return (
    <ul aria-label={copy.categoriesLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:px-0">
      {LIBRARY_PLACEHOLDERS.categories.map((category) => {
        const style = CATEGORY_STYLE[category.key];
        const Icon = style.icon;
        const active = category.key === "all";
        return (
          <li key={category.key} className="shrink-0">
            <span
              aria-current={active ? "true" : undefined}
              aria-disabled={active ? undefined : "true"}
              className={`flex h-8 items-center rounded-full px-3 text-[11px] font-semibold md:h-[70px] md:gap-[10px] md:rounded-[16px] md:px-[11px] ${
                active
                  ? "bg-grad-active text-accent-strong md:shadow-[inset_0_0_0_1.8px_#7c5cf0]"
                  : "border border-line bg-surface text-ink"
              }`}
            >
              <span aria-hidden="true" className={`hidden size-[46px] shrink-0 items-center justify-center rounded-[13px] md:flex ${TONE_TILE[style.tone]}`}>
                <Icon size={22} strokeWidth={1.8} />
              </span>
              <span className="flex flex-col">
                <span className={`text-[11px] md:text-[12.5px] md:font-extrabold ${active ? "text-accent-strong" : "text-ink"}`}>
                  {category.title}
                </span>
                <span className="hidden text-[10px] font-normal text-muted md:block">{category.body}</span>
              </span>
              {active ? null : <SampleNote />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ContinueLearning({ lesson }: { lesson: LessonSummary }) {
  const language = getLanguage(lesson.languageCode);
  return (
    <div className={`${card} flex flex-col gap-3 p-3 md:h-[101px] md:flex-row md:items-center md:gap-0 md:px-[14px] md:py-0`}>
      <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-[21px]">
        <LessonThumb code={lesson.languageCode} className="h-[64px] w-[74px] shrink-0 rounded-[12px] md:h-[75px] md:w-[153px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div>
            <LanguageBadge code={lesson.languageCode} level={lesson.levelLabel} />
          </div>
          <h3 lang={language.htmlLang} className="truncate text-[14px] font-extrabold text-ink md:text-[15px]">
            {lesson.title}
          </h3>
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="h-2 flex-1 rounded-full bg-soft md:max-w-[464px]" />
            <span className="text-[11px] font-semibold text-muted">{copy.notTracked}</span>
          </div>
        </div>
      </div>
      <Link
        href={`/lessons/${lesson.id}`}
        className={`${buttonClass.primary} h-[41px] min-h-0 rounded-[14px] text-[12.5px] md:ml-6 md:w-[163px]`}
      >
        <Play aria-hidden="true" size={16} strokeWidth={2} />
        {copy.continue}
      </Link>
    </div>
  );
}

function SkillCards() {
  return (
    <ul className="grid grid-cols-4 gap-2 md:gap-[15px]">
      {LIBRARY_PLACEHOLDERS.skills.map((skill) => {
        const style = SKILL_STYLE[skill.key];
        const Icon = style.icon;
        return (
          <li key={skill.key}>
            <div
              aria-disabled="true"
              className={`flex h-full flex-col items-center gap-1 text-center md:h-[119px] md:items-stretch md:gap-0 md:p-[14px] md:text-left md:rounded-[18px] md:border md:border-line md:bg-surface md:shadow-[0_2px_0_rgba(15,23,42,.035)]`}
            >
              <div className="flex flex-col items-center gap-1 md:flex-row md:items-start md:gap-[22px]">
                <span aria-hidden="true" className={`flex size-[64px] shrink-0 items-center justify-center rounded-[15px] md:size-[56px] ${TONE_TILE[style.tone]}`}>
                  <Icon size={28} strokeWidth={1.8} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-ink md:text-[13px] md:font-extrabold">{skill.title}</span>
                  <span className="hidden text-[10.5px] leading-[1.5] text-copy md:block">{skill.body}</span>
                </span>
              </div>
              <span className="num mt-auto flex items-center gap-1.5 text-[9.5px] text-copy md:text-[11px] md:font-bold md:text-ink">
                {copy.skillCount(skill.count)}
                <ArrowRight aria-hidden="true" size={14} strokeWidth={2.2} className="hidden text-accent md:block" />
                <SampleNote />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LessonCard({ lesson, timeZone, showStatus }: { lesson: LessonSummary; timeZone: string | null; showStatus?: boolean }) {
  const language = getLanguage(lesson.languageCode);
  return (
    <div className={`${card} relative flex h-full items-center gap-3 p-2.5 md:h-[189px] md:flex-col md:items-stretch md:gap-0 md:px-4 md:pt-3 md:pb-3.5`}>
      <LessonThumb
        code={lesson.languageCode}
        icon={FileText}
        iconSize="sm"
        className="h-[64px] w-[78px] shrink-0 rounded-[12px] md:h-[62px] md:w-auto"
      />
      {/* No bookmark feature yet: drawn as in the Hi-fi, disabled. */}
      <button
        type="button"
        disabled
        aria-label={copy.bookmark}
        className="absolute top-3 right-3 z-10 flex size-[26px] items-center justify-center rounded-full bg-white/92 text-ink disabled:cursor-default md:top-[19px] md:right-[26px]"
      >
        <Bookmark aria-hidden="true" size={14} strokeWidth={2} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:mt-[5px] md:gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <LanguageBadge code={lesson.languageCode} level={lesson.levelLabel} />
          {showStatus ? <LessonStatusBadge status={lesson.status} /> : null}
        </div>
        <Link
          href={`/lessons/${lesson.id}`}
          lang={language.htmlLang}
          className="truncate pr-8 text-[13px] font-extrabold text-ink after:absolute after:inset-0 after:rounded-[18px] hover:underline md:pr-0 md:text-[13.5px]"
        >
          {lesson.title}
        </Link>
        <p className="hidden truncate text-[9.5px] text-muted md:block">
          {lesson.tags.length > 0 ? copy.topics(lesson.tags.join(", ")) : " "}
        </p>
        <p className="mt-auto flex items-center gap-3 text-[9.5px] font-medium text-copy">
          <span className="flex items-center gap-1.5">
            <BookOpen aria-hidden="true" size={13} strokeWidth={2} />
            {copy.lessonKind}
          </span>
          <span className="num flex items-center gap-1.5">
            <Clock aria-hidden="true" size={13} strokeWidth={2} />
            {mediumDate(lesson.updatedAt, timeZone)}
          </span>
        </p>
      </div>
    </div>
  );
}

function LessonGrid({ lessons, timeZone, showStatus }: { lessons: readonly LessonSummary[]; timeZone: string | null; showStatus?: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-4 md:gap-[11px]">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <LessonCard lesson={lesson} timeZone={timeZone} showStatus={showStatus} />
        </li>
      ))}
    </ul>
  );
}

function Topics({ lessons, complete }: { lessons: readonly LessonSummary[]; complete: boolean }) {
  const topics = topicsOf(lessons);
  if (topics.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-6 md:gap-[9px]">
      {topics.map((topic, index) => (
        <li key={topic.tag}>
          <Link
            href={`/library?tag=${encodeURIComponent(topic.tag)}`}
            className={`${tile} flex h-[48px] items-center gap-2.5 px-2 transition duration-150 ease-out hover:-translate-y-px hover:border-field md:h-[56px] md:gap-3`}
          >
            <span aria-hidden="true" className={`flex size-[34px] shrink-0 items-center justify-center rounded-[12px] md:size-[42px] ${TOPIC_TONES[index]}`}>
              <Hash size={19} strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[10.5px] font-extrabold text-ink">{topic.tag}</span>
              <span className="num text-[9.5px] text-muted">{en.home.topicCount(topic.count, complete)}</span>
            </span>
            <ArrowRight aria-hidden="true" size={14} strokeWidth={2} className="hidden shrink-0 text-muted md:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className={`${card} flex flex-col items-center gap-3 px-4 py-10 text-center`}>
      <div aria-hidden="true" className="relative mb-2 size-16">
        <div className="absolute inset-0 rotate-[-20deg] rounded-[60%_60%_60%_60%/80%_80%_40%_40%] bg-[linear-gradient(180deg,#7dd3fc,#a78bfa)] opacity-70" />
        <div className="absolute inset-0 rotate-20 rounded-[60%_60%_60%_60%/80%_80%_40%_40%] bg-[linear-gradient(180deg,#fca5a5,#c4b5fd)] opacity-70" />
      </div>
      <h3 className="text-[16px] font-extrabold text-ink">{filtered ? copy.noMatchTitle : copy.emptyTitle}</h3>
      <p className="max-w-md text-[13px] text-muted">{filtered ? copy.noMatchBody : copy.emptyBody}</p>
      {!filtered ? (
        <Link href="/lessons/new" className={`${buttonClass.primary} mt-2`}>
          <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
          {copy.newLesson}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Library laid out as the Hi-fi (DEC-035). Real: filters (language, status,
 * topic), the learner's lessons, Continue, Recommended, topics and pagination.
 * Sample (labelled for assistive tech): category tabs, skill cards, Level/Skill
 * dropdowns, search and bookmark — see library-placeholders.ts.
 */
export function LibraryView({ lessons, nextHref, query, filtered, deleted, timeZone }: LibraryViewProps) {
  const complete = nextHref === null;
  return (
    <div className="flex w-full flex-col gap-5 md:gap-[22px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-ink md:text-[28px]">{copy.title}</h1>
          <p className="hidden text-[12.5px] text-copy md:block">{copy.subtitle}</p>
        </div>
        <Link href="/lessons/new" className={`${buttonClass.primary} h-10 min-h-0 rounded-[14px]`}>
          <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
          {copy.newLesson}
        </Link>
      </header>

      {deleted ? <Alert tone="success" title={copy.deleted} role="status" /> : null}

      <Filters query={query} />

      {query.tag ? (
        <p className="flex items-center gap-2 text-[12.5px] text-copy">
          {copy.topic}:
          <Link
            href={`/library?${new URLSearchParams(Object.entries({ language: query.language ?? "", status: query.status ?? "" }).filter(([, v]) => v)).toString()}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-tag-bg px-3 font-bold text-tag-text hover:brightness-97"
          >
            {query.tag}
            <X aria-hidden="true" size={14} strokeWidth={2.2} />
            <span className="sr-only">({copy.removeTopic})</span>
          </Link>
        </p>
      ) : null}

      {filtered ? (
        <section aria-labelledby="results-title">
          <SectionHeader id="results-title" title={copy.resultsTitle} subtitle={copy.resultsSubtitle} />
          {lessons.length > 0 ? <LessonGrid lessons={lessons} timeZone={timeZone} showStatus /> : <EmptyState filtered />}
        </section>
      ) : (
        <>
          <Categories />

          {lessons.length > 0 ? (
            <section aria-labelledby="continue-title">
              <SectionHeader id="continue-title" title={copy.continueTitle} subtitle={copy.continueSubtitle} action={<ViewAll href="#your-lessons" />} />
              <ContinueLearning lesson={lessons[0]} />
            </section>
          ) : null}

          <section aria-labelledby="skills-title">
            <SectionHeader id="skills-title" title={copy.skillsTitle} subtitle={copy.skillsSubtitle} />
            <SkillCards />
          </section>

          {lessons.length > 0 ? (
            <section aria-labelledby="recommended-title">
              <SectionHeader
                id="recommended-title"
                title={copy.recommendedTitle}
                subtitle={copy.recommendedSubtitle}
                action={<ViewAll href="#your-lessons" />}
              />
              <LessonGrid lessons={lessons.slice(0, 4)} timeZone={timeZone} />
            </section>
          ) : null}

          {topicsOf(lessons).length > 0 ? (
            <section aria-labelledby="topics-title">
              <SectionHeader id="topics-title" title={copy.topicsTitle} subtitle={copy.topicsSubtitle} action={<ViewAll href="#your-lessons" />} />
              <Topics lessons={lessons} complete={complete} />
            </section>
          ) : null}
        </>
      )}

      {!filtered ? (
        <section id="your-lessons" aria-labelledby="your-lessons-title" className="scroll-mt-4">
          <SectionHeader id="your-lessons-title" title={copy.yourLessonsTitle} subtitle={copy.yourLessonsSubtitle} />
          {lessons.length > 0 ? <LessonGrid lessons={lessons} timeZone={timeZone} showStatus /> : <EmptyState filtered={false} />}
        </section>
      ) : null}

      {nextHref ? (
        <Link href={nextHref} className={`${buttonClass.secondary} self-center`}>
          {copy.loadMore}
        </Link>
      ) : null}
    </div>
  );
}
