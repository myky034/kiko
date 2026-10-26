import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Flame,
  Hash,
  Headphones,
  Mic,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { topicsOf } from "@/modules/content/topics";
import type { LessonSummary } from "@/modules/content/types";
import type { DashboardData } from "@/modules/identity/dashboard";
import { dayPart, longDate, mediumDate, weekdayIndex } from "@/modules/i18n/dates";
import { en } from "@/modules/i18n/en";
import { getLanguage } from "@/modules/language/registry";
import { LanguageBadge, LessonThumb } from "@/components/lesson-parts";
import { IconTile, buttonClass, type Tone } from "@/components/ui";

const copy = en.home;

export type HomeLessons = {
  /** The actor's most recently updated active lessons (first page). */
  lessons: readonly LessonSummary[];
  /** True when the page held every active lesson, so counts are exact. */
  complete: boolean;
};

/** Card surface as drawn: white, 1px line, 2px ink drop at 3.5 %. */
const card = "rounded-[16px] border border-line bg-surface shadow-[0_2px_0_rgba(15,23,42,.035)]";
const tileCard = "rounded-[14px] border border-line bg-surface shadow-[0_2px_0_rgba(15,23,42,.035)]";

function SectionHeader({ id, title, subtitle, action }: { id: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[15px] font-extrabold text-ink md:text-[20px]">
          {title}
        </h2>
        {action}
      </div>
      {subtitle ? <p className="hidden text-[14px] text-copy md:block">{subtitle}</p> : null}
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-strong hover:underline md:text-[12.5px]">
      {copy.viewAll}
      <ArrowRight aria-hidden="true" size={14} strokeWidth={2.2} />
    </Link>
  );
}

/** Empty progress track: no fill is drawn when there is no value (DESIGN.md §4.5). */
function EmptyTrack({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-2 rounded-full bg-soft ${className}`} />;
}

function WeekStrip({ today }: { today: number }) {
  return (
    <ol aria-label={copy.weekLabel} className="flex justify-between gap-2 md:justify-end md:gap-[23px]">
      {copy.weekdays.map((day, index) => {
        const isToday = index === today;
        return (
          <li key={day} className="flex w-7 flex-col items-center gap-1.5 md:w-auto">
            {isToday ? (
              <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-violet/22">
                <span className="size-[18px] rounded-full bg-grad-cta" />
              </span>
            ) : (
              <span aria-hidden="true" className="flex size-6 items-center justify-center">
                <span className="size-[18px] rounded-full border border-line bg-surface" />
              </span>
            )}
            <span className={`num text-[10px] ${isToday ? "font-bold text-ink" : "font-medium text-copy"}`}>
              {day}
              {isToday ? <span className="sr-only"> ({copy.today})</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ContinueLearning({ lesson, timeZone }: { lesson: LessonSummary | null; timeZone: string | null }) {
  if (!lesson) {
    return (
      <div className={`${card} flex flex-col gap-4 p-3 md:flex-row md:items-center md:gap-6 md:p-[15px]`}>
        <div className="flex items-center gap-4 md:flex-1 md:gap-6">
          <LessonThumb code="ja" icon={Plus} className="h-[76px] w-[86px] shrink-0 rounded-[12px] md:h-[111px] md:w-[189px]" />
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-[13px] font-extrabold text-ink md:text-[22px]">{copy.noLessonTitle}</h3>
            <p className="text-[12px] text-muted md:text-[13.5px]">{copy.noLessonBody}</p>
          </div>
        </div>
        <Link href="/lessons/new" className={`${buttonClass.primary} h-10 rounded-[14px] md:h-12 md:w-[168px] md:text-[15px]`}>
          <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
          {copy.newLesson}
        </Link>
      </div>
    );
  }

  const language = getLanguage(lesson.languageCode);
  return (
    <div className={`${card} flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-6 md:p-[15px]`}>
      <div className="flex min-w-0 items-center gap-4 md:flex-1 md:gap-6">
        <LessonThumb code={lesson.languageCode} className="h-[76px] w-[86px] shrink-0 rounded-[12px] md:h-[111px] md:w-[189px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-1.5">
          <div>
            <LanguageBadge code={lesson.languageCode} level={lesson.levelLabel} />
          </div>
          <h3 lang={language.htmlLang} className="truncate text-[13px] font-extrabold text-ink md:text-[22px]">
            {lesson.title}
          </h3>
          <p className="hidden text-[13.5px] text-muted md:block">
            {copy.updated(mediumDate(lesson.updatedAt, timeZone))}
            {lesson.tags.length > 0 ? ` · ${copy.topics(lesson.tags.join(", "))}` : null}
          </p>
          <div className="mt-1 flex items-center gap-3 md:mt-2">
            <EmptyTrack className="flex-1 md:max-w-[419px]" />
            <span className="text-[11px] font-semibold text-muted md:text-[12px]">{copy.notTracked}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-3 md:w-[168px] md:items-end">
        <Link
          href={`/lessons/${lesson.id}`}
          className={`${buttonClass.primary} h-10 rounded-[14px] md:h-12 md:w-[168px] md:text-[15px]`}
        >
          {copy.continue}
          <ArrowRight aria-hidden="true" size={16} strokeWidth={2.2} />
        </Link>
        <Link
          href={`/lessons/${lesson.id}`}
          className="hidden items-center gap-1 text-[12.5px] font-semibold text-accent-strong hover:underline md:inline-flex"
        >
          {copy.viewDetails}
          <ArrowRight aria-hidden="true" size={14} strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
}

type PlanItem = { title: string; detail: string; icon: LucideIcon; tone: Tone; href?: string };

function TodaysPlan({ readyCount, complete }: { readyCount: number; complete: boolean }) {
  // Only reading has real data (ready lessons); the other activities are not built yet.
  const items: PlanItem[] = [
    { title: copy.plan.vocabulary, detail: copy.comingSoon, icon: BookOpen, tone: "sky" },
    { title: copy.plan.speaking, detail: copy.comingSoon, icon: Mic, tone: "violet" },
    { title: copy.plan.listening, detail: copy.comingSoon, icon: Headphones, tone: "coral" },
    {
      title: copy.plan.reading,
      detail: copy.readyLessons(readyCount, complete),
      icon: FileText,
      tone: "amber",
      href: readyCount > 0 ? "/library?status=ready" : undefined,
    },
  ];
  return (
    <ul className={`${card} grid grid-cols-1 divide-y divide-divider md:grid-cols-4 md:gap-3 md:divide-y-0 md:border-0 md:bg-transparent md:shadow-none`}>
      {items.map((item) => {
        const body = (
          <>
            <IconTile icon={item.icon} tone={item.tone} size="md" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11.5px] font-bold text-ink md:text-[12.5px]">{item.title}</span>
              <span className="num text-[10.5px] text-muted md:text-[11.5px]">{item.detail}</span>
            </span>
            <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full border-[1.6px] border-field bg-surface" />
            <span className="sr-only">({copy.notDone})</span>
          </>
        );
        const box =
          "flex items-center gap-3 px-2.5 py-2 md:h-[68px] md:rounded-[14px] md:border md:border-line md:bg-surface md:px-[11px] md:py-0 md:shadow-[0_2px_0_rgba(15,23,42,.035)]";
        return (
          <li key={item.title}>
            {item.href ? (
              <Link href={item.href} className={`${box} hover:bg-mist`}>
                {body}
              </Link>
            ) : (
              <div className={box}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const SKILLS = [
  { key: "vocabulary", icon: BookOpen, className: "text-sky-deep" },
  { key: "reading", icon: FileText, className: "text-amber-deep" },
  { key: "listening", icon: Headphones, className: "text-coral-deep" },
  { key: "speaking", icon: Mic, className: "text-violet-deep" },
] as const;

/** Progress tracking does not exist yet: every value is an explicit "—", never an invented number. */
function LearningProgress() {
  return (
    <div className={`${card} grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 p-4 md:flex md:h-[157px] md:gap-0 md:px-6 md:py-0`}>
      <div className="row-span-2 flex items-center gap-6 md:row-span-1 md:w-[310px]">
        <div className="relative size-[86px] shrink-0 rounded-full border-[14px] border-soft md:size-[100px]">
          <span className="absolute inset-0 flex items-center justify-center text-[20px] font-extrabold text-ink md:text-[22px]">
            {copy.noValue}
            <span className="sr-only"> {copy.noValueLabel}</span>
          </span>
        </div>
        <div className="hidden flex-col gap-1 md:flex">
          <p className="text-[15px] font-bold text-ink">{copy.overallTitle}</p>
          <p className="text-[12.5px] text-muted">{copy.overallBody}</p>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 md:hidden">
        <p className="text-[11px] font-bold text-ink">{copy.overallTitle}</p>
        <p className="text-[10.5px] text-muted">{copy.overallBody}</p>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-line pt-3 md:h-[108px] md:w-[185px] md:justify-center md:border-t-0 md:border-l md:pt-0 md:pl-[26px]">
        <p className="order-2 text-[10px] text-muted md:order-none md:text-[12.5px] md:font-semibold md:text-copy">{copy.streakTitle}</p>
        <p className="flex items-center gap-2 text-[15px] font-extrabold text-ink md:text-[20px]">
          <Flame aria-hidden="true" size={24} strokeWidth={1.8} className="text-field" />
          {copy.noValue}
          <span className="sr-only"> {copy.noValueLabel}</span>
        </p>
        <p className="hidden text-[12px] text-muted md:block">{copy.streakBody}</p>
      </div>
      <div className="hidden h-[108px] flex-1 flex-col justify-center gap-[9px] border-l border-line pl-7 md:flex">
        <p className="text-[12px] font-bold text-ink">{copy.skillsTitle}</p>
        {SKILLS.map((skill) => {
          const Icon = skill.icon;
          return (
            <div key={skill.key} className="flex items-center gap-3">
              <Icon aria-hidden="true" size={16} strokeWidth={2} className={skill.className} />
              <span className="w-[82px] text-[12.5px] font-medium text-copy">{copy.skills[skill.key]}</span>
              <EmptyTrack className="flex-1" />
              <span className="w-8 text-right text-[12px] font-semibold text-muted">
                {copy.noValue}
                <span className="sr-only"> {copy.noValueLabel}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecommendedCard({ lesson, timeZone }: { lesson: LessonSummary; timeZone: string | null }) {
  const language = getLanguage(lesson.languageCode);
  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className={`${tileCard} flex h-full items-center gap-3 p-2.5 transition duration-150 ease-out hover:-translate-y-px hover:border-field md:h-[146px] md:flex-col md:items-stretch md:gap-0 md:p-[11px] md:pt-[9px]`}
    >
      <LessonThumb
        code={lesson.languageCode}
        icon={FileText}
        iconSize="sm"
        className="h-[60px] w-[68px] shrink-0 rounded-[9px] md:h-[54px] md:w-auto"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:mt-[7px] md:gap-[5px]">
        <div>
          <LanguageBadge code={lesson.languageCode} level={lesson.levelLabel} />
        </div>
        <p lang={language.htmlLang} className="truncate text-[12px] font-bold text-ink md:text-[13px]">
          {lesson.title}
        </p>
        <p className="mt-auto flex items-center justify-between gap-2 text-[10.5px] text-muted md:text-[11.5px]">
          <span className="flex items-center gap-1.5">
            <BookOpen aria-hidden="true" size={14} strokeWidth={2} />
            {copy.lessonKind}
          </span>
          <span className="num flex items-center gap-1.5 font-medium">
            <Clock aria-hidden="true" size={14} strokeWidth={2} />
            {mediumDate(lesson.updatedAt, timeZone)}
          </span>
        </p>
      </div>
    </Link>
  );
}

const TOPIC_TONES = ["tile-sky", "tile-violet", "tile-coral", "tile-amber", "tile-violet", "tile-sky"] as const;

function BrowseByTopic({ lessons, complete }: { lessons: readonly LessonSummary[]; complete: boolean }) {
  const topics = topicsOf(lessons);
  if (topics.length === 0) {
    return <p className={`${tileCard} px-4 py-4 text-[12.5px] text-muted`}>{copy.topicsEmpty}</p>;
  }
  return (
    <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0 md:pb-0">
      {topics.map((topic, index) => (
        <li key={topic.tag} className="w-[64px] shrink-0 md:w-auto">
          <Link
            href={`/library?tag=${encodeURIComponent(topic.tag)}`}
            className={`${tileCard} flex h-full flex-col items-center gap-1.5 px-1.5 py-2.5 text-center transition duration-150 ease-out hover:-translate-y-px hover:border-field md:h-[54px] md:flex-row md:gap-[7px] md:px-2 md:py-0 md:text-left`}
          >
            <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-[11px] ${TOPIC_TONES[index]}`}>
              <Hash size={18} strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[9.5px] font-bold text-ink md:text-[10.5px]">{topic.tag}</span>
              <span className="num hidden text-[10px] text-muted md:block">{copy.topicCount(topic.count, complete)}</span>
            </span>
            <ArrowRight aria-hidden="true" size={13} strokeWidth={2} className="hidden shrink-0 text-muted md:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Home, laid out as the Hi-fi (DEC-033). Real data: greeting, date and week
 * (learner's zone) and their own recent lessons and tags in the current
 * learning language (chosen in the header switcher).
 * Activities with no data yet are labelled placeholders, never invented numbers.
 */
export function DashboardView({
  data,
  home = { lessons: [], complete: true },
  now = new Date(),
}: {
  data: DashboardData;
  home?: HomeLessons;
  now?: Date;
}) {
  const timeZone = data.timezone;
  const lessons = home.lessons;
  const continueLesson = lessons[0] ?? null;
  const readyCount = lessons.filter((lesson) => lesson.status === "ready").length;

  return (
    <div className="flex w-full flex-col gap-6 md:gap-[22px]">
      <header className="-mx-4 flex flex-col gap-3 border-b border-line px-4 pb-4 md:mx-0 md:flex-row md:items-start md:justify-between md:border-0 md:px-0 md:pb-0">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-ink md:text-[28px]">
            {copy.greeting[dayPart(now, timeZone)]}
          </h1>
          <p className="text-[12px] text-copy md:text-[14px]">{copy.subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end md:pt-1">
          <p className="num hidden text-[11.5px] font-medium text-copy md:block">{longDate(now, timeZone)}</p>
          <WeekStrip today={weekdayIndex(now, timeZone)} />
        </div>
      </header>

      {data.isLearner ? (
        <>
          <section aria-labelledby="continue-title">
            <h2 id="continue-title" className="mb-3 text-[15px] font-extrabold text-ink md:sr-only">
              {copy.continueTitle}
            </h2>
            <ContinueLearning lesson={continueLesson} timeZone={timeZone} />
          </section>

          <section aria-labelledby="plan-title">
            <SectionHeader id="plan-title" title={copy.planTitle} subtitle={copy.planSubtitle} />
            <TodaysPlan readyCount={readyCount} complete={home.complete} />
          </section>

          <section aria-labelledby="progress-title">
            <SectionHeader id="progress-title" title={copy.progressTitle} subtitle={copy.progressSubtitle} />
            <LearningProgress />
          </section>

          <section aria-labelledby="recommended-title">
            <SectionHeader
              id="recommended-title"
              title={copy.recommendedTitle}
              subtitle={copy.recommendedSubtitle}
              action={lessons.length > 0 ? <ViewAll href="/library" /> : undefined}
            />
            {lessons.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {lessons.slice(0, 4).map((lesson) => (
                  <li key={lesson.id}>
                    <RecommendedCard lesson={lesson} timeZone={timeZone} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`${tileCard} px-4 py-4 text-[12.5px] text-muted`}>{copy.recommendedEmpty}</p>
            )}
          </section>

          <section aria-labelledby="topics-title">
            <SectionHeader
              id="topics-title"
              title={copy.topicsTitle}
              subtitle={copy.topicsSubtitle}
              action={topicsOf(lessons).length > 0 ? <ViewAll href="/library" /> : undefined}
            />
            <BrowseByTopic lessons={lessons} complete={home.complete} />
          </section>
        </>
      ) : (
        <p className="text-copy">{en.dashboard.notLearner}</p>
      )}

      {data.isOwner ? (
        <section aria-labelledby="admin-title">
          <div className={`${card} flex items-start gap-4 p-4`}>
            <IconTile icon={ShieldCheck} tone="amber" />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id="admin-title" className="text-[15px] font-extrabold text-ink">
                {en.dashboard.adminTitle}
              </h2>
              <p className="text-[12.5px] text-muted">{en.dashboard.adminBody}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

