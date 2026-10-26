import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  CircleCheck,
  Layers,
  LayoutGrid,
  List,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, buttonClass } from "@/components/ui";
import { mediumDate } from "@/modules/i18n/dates";
import { en } from "@/modules/i18n/en";
import { getLanguage, type LanguageCode } from "@/modules/language/registry";
import type {
  DeckView,
  VocabularyDetail,
  VocabularyListFilter,
  VocabularySummary,
} from "@/modules/vocabulary/types";

const copy = en.vocabulary;

export type VocabularyTab = "overview" | "character" | "examples" | "notes";

export type VocabularyViewProps = {
  language: LanguageCode;
  items: readonly VocabularySummary[];
  total: number;
  activeTotal: number;
  page: number;
  pageCount: number;
  filter: VocabularyListFilter;
  /** Raw query, to build links that keep the current filters. */
  query: Record<string, string | undefined>;
  view: "list" | "cards";
  decks: readonly DeckView[];
  selected: VocabularyDetail | null;
  tab: VocabularyTab;
  /** Words offered in the "add related word" picker (same language, excluding the selected one). */
  relationOptions: readonly { id: string; surface: string }[];
  deleted: boolean;
  error: string | null;
  timeZone: string | null;
  actions: {
    star: (vocabularyId: string, starred: boolean) => Promise<void>;
    archive: (vocabularyId: string, formData: FormData) => Promise<void>;
    unarchive: (vocabularyId: string, formData: FormData) => Promise<void>;
    relate: (vocabularyId: string, formData: FormData) => Promise<void>;
    unrelate: (vocabularyId: string, formData: FormData) => Promise<void>;
  };
};

const card = "rounded-[16px] border border-line bg-surface shadow-[0_2px_0_rgba(15,23,42,.035)]";
const dropdown =
  "relative flex h-[43px] flex-col justify-center rounded-[12px] border border-control bg-surface pr-8 pl-3";
const selectClass = "w-full appearance-none bg-transparent text-[12.5px] font-semibold text-ink outline-none";

function href(query: Record<string, string | undefined>, changes: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes })) if (value) params.set(key, value);
  const text = params.toString();
  return text ? `/vocabulary?${text}` : "/vocabulary";
}

function Chip({ children, tone = "tag" }: { children: ReactNode; tone?: "tag" | "soft" }) {
  return (
    <span
      className={`inline-flex min-h-[22px] items-center rounded-full px-2.5 text-[10.5px] font-bold ${
        tone === "tag" ? "bg-tag-bg text-tag-text" : "bg-soft text-copy"
      }`}
    >
      {children}
    </span>
  );
}

/** Learning/Weak/Mastered come from review (KIKO-016): shown as a labelled placeholder until then. */
function StatusPlaceholder() {
  return (
    <span className="text-caption font-semibold text-muted">
      {copy.statusNotTracked}
      <span className="sr-only"> ({copy.stats.notTracked})</span>
    </span>
  );
}

function Stat({ icon: Icon, tone, value, label }: { icon: LucideIcon; tone: string; value: ReactNode; label: string }) {
  return (
    <div className={`${card} flex items-center gap-3 px-4 py-3`}>
      <span aria-hidden="true" className={`flex size-11 shrink-0 items-center justify-center rounded-[13px] ${tone}`}>
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <div className="flex flex-col">
        <span className="num text-[20px] leading-tight font-extrabold text-ink">{value}</span>
        <span className="text-caption text-muted">{label}</span>
      </div>
    </div>
  );
}

function Filters({ filter, decks, query }: { filter: VocabularyListFilter; decks: readonly DeckView[]; query: VocabularyViewProps["query"] }) {
  return (
    <form method="get" aria-label={copy.filtersLabel} className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap md:items-end md:gap-2.5">
      {query.view ? <input type="hidden" name="view" value={query.view} /> : null}
      {query.size ? <input type="hidden" name="size" value={query.size} /> : null}
      <label className={`${dropdown} md:w-[108px]`}>
        <span className="text-[9px] font-semibold text-copy">{copy.status}</span>
        <select name="archived" defaultValue={filter.archived ? "1" : ""} className={selectClass}>
          <option value="">{copy.statusActive}</option>
          <option value="1">{copy.statusArchived}</option>
        </select>
        <ChevronDown aria-hidden="true" size={15} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
      </label>
      <label className={`${dropdown} md:w-[124px]`}>
        <span className="text-[9px] font-semibold text-copy">{copy.decks}</span>
        <select name="deck" defaultValue={filter.deckId ?? ""} className={selectClass}>
          <option value="">{copy.allDecks}</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={15} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
      </label>
      <label className={`${dropdown} md:w-[112px]`}>
        <span className="text-[9px] font-semibold text-copy">{copy.tags}</span>
        <input name="tag" defaultValue={filter.tag ?? ""} placeholder={copy.allTags} className={`${selectClass} placeholder:font-normal placeholder:text-muted`} />
      </label>
      <label className={`${dropdown} md:w-[128px]`}>
        <span className="text-[9px] font-semibold text-copy">{copy.source}</span>
        <select name="source" defaultValue={filter.source} className={selectClass}>
          <option value="all">{copy.sources.all}</option>
          <option value="lesson">{copy.sources.lesson}</option>
          <option value="manual">{copy.sources.manual}</option>
        </select>
        <ChevronDown aria-hidden="true" size={15} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
      </label>
      <label className={`${dropdown} md:w-[150px]`}>
        <span className="text-[9px] font-semibold text-copy">{copy.sort}</span>
        <select name="sort" defaultValue={filter.sort} className={selectClass}>
          <option value="recent">{copy.sorts.recent}</option>
          <option value="alphabetical">{copy.sorts.alphabetical}</option>
        </select>
        <ChevronDown aria-hidden="true" size={15} strokeWidth={2} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
      </label>
      <label className="col-span-2 flex h-[43px] cursor-pointer items-center gap-2 rounded-[12px] border border-control bg-surface px-3 text-[12.5px] font-semibold text-ink md:col-span-1">
        <input type="checkbox" name="starred" value="1" defaultChecked={filter.starred} className="size-4 accent-[#5a3bd6]" />
        <Star aria-hidden="true" size={15} strokeWidth={2} className="text-[#f5b50a]" />
        {copy.starredOnly}
      </label>
      <div className="col-span-2 flex items-center gap-3 md:col-span-1">
        <button type="submit" className={`${buttonClass.secondary} h-[43px] min-h-0 flex-1 rounded-[12px] px-3 md:flex-none`}>
          <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={2} />
          {copy.apply}
        </button>
        <Link href={query.view ? `/vocabulary?view=${query.view}` : "/vocabulary"} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-accent-strong hover:underline">
          <RotateCcw aria-hidden="true" size={15} strokeWidth={2.2} />
          {copy.reset}
        </Link>
      </div>
    </form>
  );
}

function ViewToggle({ view, query }: { view: "list" | "cards"; query: VocabularyViewProps["query"] }) {
  const item = (value: "list" | "cards", label: string, Icon: LucideIcon) => (
    <Link
      href={href(query, { view: value === "list" ? undefined : value, page: undefined })}
      aria-current={view === value ? "true" : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] ${
        view === value ? "bg-grad-active font-bold text-accent-strong" : "font-medium text-copy hover:text-ink"
      }`}
    >
      <Icon aria-hidden="true" size={15} strokeWidth={2} />
      {label}
    </Link>
  );
  return (
    <nav aria-label={copy.viewLabel} className="inline-flex rounded-full border border-line bg-surface p-1">
      {item("list", copy.viewList, List)}
      {item("cards", copy.viewCards, LayoutGrid)}
    </nav>
  );
}

function WordLink({ word, query, selected, children, className }: { word: VocabularySummary; query: VocabularyViewProps["query"]; selected: boolean; children: ReactNode; className: string }) {
  return (
    <Link href={href(query, { word: word.id, tab: undefined })} aria-current={selected ? "true" : undefined} className={className}>
      {children}
    </Link>
  );
}

function ListView({ items, query, selectedId, timeZone }: { items: readonly VocabularySummary[]; query: VocabularyViewProps["query"]; selectedId: string | null; timeZone: string | null }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_80px_96px] gap-3 border-b border-line px-4 py-3 text-[11px] font-bold text-copy md:grid">
        <span>{copy.columns.word}</span>
        <span>{copy.columns.meaning}</span>
        <span>{copy.columns.tags}</span>
        <span>{copy.columns.status}</span>
        <span>{copy.columns.added}</span>
      </div>
      <ul className="divide-y divide-divider">
        {items.map((word) => {
          const selected = word.id === selectedId;
          const language = getLanguage(word.languageCode);
          return (
            <li key={word.id}>
              <WordLink
                word={word}
                query={query}
                selected={selected}
                className={`grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_80px_96px] md:items-center md:gap-3 ${
                  selected ? "bg-grad-active shadow-[inset_0_0_0_1.8px_#7c5cf0]" : "hover:bg-mist"
                }`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5">
                    <span lang={language.htmlLang} className="truncate text-[14px] font-extrabold text-ink">
                      {word.surface}
                    </span>
                    {word.starred ? <Star aria-label={copy.starred} size={13} strokeWidth={2} className="shrink-0 fill-[#f5b50a] text-[#f5b50a]" /> : null}
                  </span>
                  {word.readings[0] ? <span className="truncate text-[11px] text-muted">{word.readings[0]}</span> : null}
                </span>
                <span className="truncate text-[12.5px] text-ink">{word.meaning}</span>
                <span className="flex flex-wrap gap-1">
                  {word.tags.slice(0, 2).map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                  {word.tags.length > 2 ? <Chip tone="soft">+{word.tags.length - 2}</Chip> : null}
                </span>
                <span className="hidden md:block">{word.archived ? <Chip tone="soft">{copy.statusArchived}</Chip> : <StatusPlaceholder />}</span>
                <span className="num hidden text-[11.5px] text-copy md:block">{mediumDate(word.createdAt, timeZone)}</span>
              </WordLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const CARD_TONES: Record<LanguageCode, string> = {
  ja: "bg-[linear-gradient(135deg,#7dd3fc,#a78bfa)]",
  zh: "bg-[linear-gradient(135deg,#fcd34d,#fca5a5)]",
  en: "bg-[linear-gradient(135deg,#a78bfa,#7dd3fc)]",
};

function CardsView({ items, query, selectedId }: { items: readonly VocabularySummary[]; query: VocabularyViewProps["query"]; selectedId: string | null }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((word) => {
        const selected = word.id === selectedId;
        const language = getLanguage(word.languageCode);
        return (
          <li key={word.id}>
            <WordLink
              word={word}
              query={query}
              selected={selected}
              className={`${card} flex h-full flex-col gap-2 p-2.5 transition duration-150 ease-out hover:-translate-y-px ${
                selected ? "bg-grad-active shadow-[inset_0_0_0_1.8px_#7c5cf0]" : ""
              }`}
            >
              <span aria-hidden="true" className={`relative flex h-[84px] items-center justify-center overflow-hidden rounded-[12px] ${CARD_TONES[word.languageCode]}`}>
                <span className="absolute -top-6 -right-6 size-20 rounded-full bg-white/28" />
                <span lang={language.htmlLang} className="relative max-w-[90%] truncate text-[26px] font-extrabold text-ink/80">
                  {[...word.surface].slice(0, 4).join("")}
                </span>
                {word.starred ? (
                  <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border border-[#f5d56b] bg-[#fff7db]">
                    <Star size={13} strokeWidth={2} className="fill-[#f5b50a] text-[#f5b50a]" />
                  </span>
                ) : null}
              </span>
              <span className="flex min-w-0 flex-col px-1">
                <span lang={language.htmlLang} className="truncate text-[16px] font-extrabold text-ink">
                  {word.surface}
                </span>
                {word.readings[0] ? <span className="truncate text-[11px] text-muted">{word.readings[0]}</span> : null}
                <span className="mt-1 truncate text-[12.5px] text-ink">{word.meaning}</span>
              </span>
              <span className="mt-auto flex flex-wrap gap-1 px-1 pb-1">
                {word.tags.slice(0, 2).map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </span>
            </WordLink>
          </li>
        );
      })}
    </ul>
  );
}

function Pagination({ page, pageCount, query }: { page: number; pageCount: number; query: VocabularyViewProps["query"] }) {
  if (pageCount <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  return (
    <nav aria-label={copy.pageOf(page, pageCount)} className="flex flex-wrap items-center gap-1.5">
      {page > 1 ? (
        <Link href={href(query, { page: String(page - 1) })} aria-label={copy.previous} className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-surface text-copy hover:bg-mist">
          <ArrowLeft aria-hidden="true" size={15} strokeWidth={2.2} />
        </Link>
      ) : null}
      {pages.map((p, index) => (
        <span key={p} className="flex items-center gap-1.5">
          {index > 0 && p - pages[index - 1] > 1 ? <span aria-hidden="true" className="px-1 text-muted">…</span> : null}
          <Link
            href={href(query, { page: p === 1 ? undefined : String(p) })}
            aria-current={p === page ? "page" : undefined}
            className={`num flex size-8 items-center justify-center rounded-[9px] text-[12.5px] ${
              p === page ? "bg-grad-cta font-bold text-white" : "font-medium text-ink hover:bg-mist"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(query, { page: String(page + 1) })} aria-label={copy.next} className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-surface text-copy hover:bg-mist">
          <ArrowRight aria-hidden="true" size={15} strokeWidth={2.2} />
        </Link>
      ) : null}
    </nav>
  );
}

/** Saved sentence with the selection highlighted (code points). */
function Occurrence({ text, start, end, lang }: { text: string; start: number; end: number; lang: string }) {
  const points = [...text];
  return (
    <span lang={lang}>
      {points.slice(0, start).join("")}
      <mark className="rounded-[4px] bg-tag-bg px-0.5 font-bold text-ink">{points.slice(start, end).join("")}</mark>
      {points.slice(end).join("")}
    </span>
  );
}

function DetailPanel({
  word,
  tab,
  query,
  relationOptions,
  actions,
  timeZone,
}: {
  word: VocabularyDetail;
  tab: VocabularyTab;
  query: VocabularyViewProps["query"];
  relationOptions: VocabularyViewProps["relationOptions"];
  actions: VocabularyViewProps["actions"];
  timeZone: string | null;
}) {
  const language = getLanguage(word.languageCode);
  const showCharacter = word.languageCode !== "en";
  const tabs: { key: VocabularyTab; label: string }[] = [
    { key: "overview", label: copy.tabs.overview },
    ...(showCharacter ? [{ key: "character" as const, label: copy.tabs.character }] : []),
    { key: "examples", label: `${copy.tabs.examples}${word.examples.length ? ` (${word.examples.length})` : ""}` },
    { key: "notes", label: copy.tabs.notes },
  ];
  return (
    <aside aria-labelledby="word-title" className={`${card} flex flex-col gap-4 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="word-title" lang={language.htmlLang} className="text-[24px] leading-tight font-extrabold break-words text-ink">
            {word.surface}
          </h2>
          {word.readings.length > 0 ? <p className="mt-1 text-[13px] text-copy">{word.readings.join(" · ")}</p> : null}
        </div>
        <form action={actions.star.bind(null, word.id, !word.starred)}>
          <button
            type="submit"
            aria-pressed={word.starred}
            aria-label={word.starred ? copy.unstar : copy.star}
            className={`flex size-10 items-center justify-center rounded-full border ${
              word.starred ? "border-[#f5d56b] bg-[#fff7db]" : "border-line bg-surface hover:bg-mist"
            }`}
          >
            <Star aria-hidden="true" size={18} strokeWidth={2} className={word.starred ? "fill-[#f5b50a] text-[#f5b50a]" : "text-muted"} />
          </button>
        </form>
      </div>

      <nav aria-label={copy.tabs.overview} className="flex gap-0.5 overflow-x-auto rounded-full border border-line bg-surface p-1">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={href(query, { word: word.id, tab: item.key === "overview" ? undefined : item.key })}
            aria-current={tab === item.key ? "page" : undefined}
            className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11.5px] whitespace-nowrap ${tab === item.key ? "bg-grad-active font-bold text-accent-strong" : "font-medium text-copy hover:text-ink"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold text-copy">{copy.meaning}</p>
            <p className="text-[15px] font-bold text-ink">{word.meaning}</p>
          </div>
          {word.usage ? (
            <div>
              <p className="text-[11px] font-bold text-copy">{copy.usage}</p>
              <p className="text-[13px] whitespace-pre-wrap text-ink">{word.usage}</p>
            </div>
          ) : null}
          {word.occurrences.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-bold text-copy">{copy.fromLessons}</p>
              <ul className="flex flex-col gap-2">
                {word.occurrences.map((occurrence) => (
                  <li key={`${occurrence.lessonId}:${occurrence.start}:${occurrence.createdAt.toISOString()}`} className="rounded-[12px] bg-grad-explain p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.8)]">
                    <p className="text-[13px] text-ink">
                      <Occurrence text={occurrence.sourceText} start={occurrence.start} end={occurrence.end} lang={language.htmlLang} />
                    </p>
                    <Link href={`/lessons/${occurrence.lessonId}`} className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-strong hover:underline">
                      <BookOpen aria-hidden="true" size={13} strokeWidth={2} />
                      <span lang={language.htmlLang}>{occurrence.lessonTitle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="mb-2 text-[11px] font-bold text-copy">{copy.relatedWords}</p>
            {word.related.length > 0 ? (
              <ul className="divide-y divide-divider">
                {word.related.map((related) => (
                  <li key={related.id} className="flex items-center justify-between gap-2 py-2">
                    <Link href={href(query, { word: related.id, tab: undefined })} className="min-w-0 hover:underline">
                      <span lang={language.htmlLang} className="text-[13px] font-bold text-ink">
                        {related.surface}
                      </span>
                      {related.readings[0] ? <span className="ml-2 text-[11px] text-muted">{related.readings[0]}</span> : null}
                    </Link>
                    <span className="flex items-center gap-2">
                      <Chip>{copy.relationKinds[related.kind]}</Chip>
                      <form action={actions.unrelate.bind(null, word.id)}>
                        <input type="hidden" name="relatedId" value={related.id} />
                        <button type="submit" aria-label={`${copy.remove}: ${related.surface}`} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-soft hover:text-danger-text">
                          <X aria-hidden="true" size={14} strokeWidth={2.2} />
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-muted">{copy.noRelated}</p>
            )}
            {relationOptions.length > 0 && !word.archived ? (
              <form action={actions.relate.bind(null, word.id)} className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <label className="col-span-2 flex flex-col gap-1 text-[11px] font-bold text-copy">
                  {copy.relationWord}
                  <select name="relatedId" required className="h-9 rounded-[10px] border border-control bg-surface px-2 text-[12.5px] text-ink">
                    {relationOptions.map((option) => (
                      <option key={option.id} value={option.id} lang={language.htmlLang}>
                        {option.surface}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-bold text-copy">
                  {copy.relationKind}
                  <select name="kind" defaultValue="related" className="h-9 rounded-[10px] border border-control bg-surface px-2 text-[12.5px] text-ink">
                    <option value="related">{copy.relationKinds.related}</option>
                    <option value="synonym">{copy.relationKinds.synonym}</option>
                    <option value="antonym">{copy.relationKinds.antonym}</option>
                  </select>
                </label>
                <button type="submit" className={`${buttonClass.soft} min-h-9 self-end`}>
                  <Plus aria-hidden="true" size={14} strokeWidth={2.2} />
                  {copy.addRelation}
                </button>
              </form>
            ) : null}
          </div>
          <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-[12.5px]">
            <dt className="font-bold text-copy">{copy.columns.status}</dt>
            <dd>{word.archived ? <Chip tone="soft">{copy.statusArchived}</Chip> : <StatusPlaceholder />}</dd>
            <dt className="font-bold text-copy">{copy.added}</dt>
            <dd className="num text-ink">{mediumDate(word.createdAt, timeZone)}</dd>
            <dt className="font-bold text-copy">{copy.tags}</dt>
            <dd className="flex flex-wrap gap-1">{word.tags.length ? word.tags.map((tag) => <Chip key={tag}>{tag}</Chip>) : <span className="text-muted">—</span>}</dd>
            <dt className="font-bold text-copy">{copy.decks}</dt>
            <dd className="flex flex-wrap gap-1">{word.decks.length ? word.decks.map((deck) => <Chip key={deck.id} tone="soft">{deck.title}</Chip>) : <span className="text-muted">—</span>}</dd>
          </dl>
        </div>
      ) : null}

      {tab === "character" ? <p className="text-[12.5px] text-muted">{copy.characterSoon}</p> : null}

      {tab === "examples" ? (
        word.examples.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {word.examples.map((example, index) => (
              <li key={index} className="rounded-[12px] bg-grad-explain p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.8)]">
                <p lang={language.htmlLang} className="text-[14px] font-bold text-ink">
                  {example.text}
                </p>
                {example.reading ? <p className="text-[11.5px] text-copy">{example.reading}</p> : null}
                {example.translation ? <p className="text-[12px] text-ink">{example.translation}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-muted">{copy.noExamples}</p>
        )
      ) : null}

      {tab === "notes" ? (
        word.notes ? <p className="text-[13px] whitespace-pre-wrap text-ink">{word.notes}</p> : <p className="text-[12.5px] text-muted">{copy.noNotes}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
        {/* Practice and flashcards arrive with KIKO-029 / KIKO-016. */}
        <button type="button" disabled aria-label={`${copy.practice} (${copy.comingSoon})`} className={`${buttonClass.primary} min-h-10`}>
          <Play aria-hidden="true" size={16} strokeWidth={2} />
          {copy.practice}
        </button>
        <button type="button" disabled aria-label={`${copy.addToFlashcards} (${copy.comingSoon})`} className={`${buttonClass.secondary} min-h-10`}>
          <Layers aria-hidden="true" size={16} strokeWidth={2} />
          {copy.addToFlashcards}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {!word.archived ? (
          <Link href={`/vocabulary/${word.id}/edit`} className={`${buttonClass.secondary} min-h-10`}>
            <Pencil aria-hidden="true" size={16} strokeWidth={2} />
            {en.lesson.edit}
          </Link>
        ) : null}
        <form action={(word.archived ? actions.unarchive : actions.archive).bind(null, word.id)}>
          <input type="hidden" name="expectedVersion" value={word.version} />
          <button type="submit" className={`${buttonClass.secondary} min-h-10`}>
            {word.archived ? <ArchiveRestore aria-hidden="true" size={16} strokeWidth={2} /> : <Archive aria-hidden="true" size={16} strokeWidth={2} />}
            {word.archived ? copy.unarchive : copy.archive}
          </button>
        </form>
        <Link href={`/vocabulary/${word.id}/delete`} className={`${buttonClass.danger} min-h-10`}>
          <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
          {copy.deleteLink}
        </Link>
      </div>
    </aside>
  );
}

/**
 * My Vocabulary, laid out as the Hi-fi (DEC-044). Real: the learner's words in
 * the header language, filters, list/cards, details, stars, decks, relations.
 * Labelled placeholders: Learning/Weak/Mastered, Study Now, Practice,
 * Add to flashcards (KIKO-016/029), the Character tab and search (FR23).
 */
export function VocabularyView(props: VocabularyViewProps) {
  const { language, items, total, activeTotal, page, pageCount, filter, query, view, decks, selected, tab, deleted, error } = props;
  const filtered = Boolean(filter.archived || filter.tag || filter.deckId || filter.starred || filter.source !== "all");
  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight text-ink md:text-[28px]">{copy.title}</h1>
          <p className="hidden text-[12.5px] text-copy md:block">
            {copy.subtitle} <span className="font-semibold text-ink">{getLanguage(language).label}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/vocabulary/decks" className={`${buttonClass.secondary} min-h-10`}>
            <Layers aria-hidden="true" size={16} strokeWidth={2} />
            {copy.manageDecks}
          </Link>
          <Link href="/vocabulary/new" className={`${buttonClass.secondary} min-h-10`}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
            {copy.newWord}
          </Link>
          <button type="button" disabled aria-label={`${copy.studyNow} (${copy.comingSoon})`} className={`${buttonClass.primary} min-h-10`}>
            <Play aria-hidden="true" size={16} strokeWidth={2} />
            {copy.studyNow}
          </button>
        </div>
      </header>

      {deleted ? <Alert tone="success" title={copy.deleted} role="status" /> : null}
      {error ? (
        <Alert tone="error" title={en.lesson.actionFailed} role="alert">
          {error}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={BookOpen} tone="tile-sky" value={activeTotal} label={copy.stats.total} />
        <Stat icon={RotateCcw} tone="tile-violet" value={<StatusPlaceholder />} label={copy.stats.learning} />
        <Stat icon={TriangleAlert} tone="tile-coral" value={<StatusPlaceholder />} label={copy.stats.weak} />
        <Stat icon={CircleCheck} tone="tile-sky" value={<StatusPlaceholder />} label={copy.stats.mastered} />
      </div>

      <Filters filter={filter} decks={decks} query={query} />

      <div className={`grid grid-cols-1 gap-5 ${selected ? "xl:grid-cols-[minmax(0,1fr)_330px]" : ""}`}>
        <section aria-label={copy.title} className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-copy">{copy.deckWords(total)}</p>
            <ViewToggle view={view} query={query} />
          </div>
          {items.length === 0 ? (
            <div className={`${card} flex flex-col items-center gap-3 px-4 py-10 text-center`}>
              <h2 className="text-[16px] font-extrabold text-ink">{filtered ? copy.noMatchTitle : copy.emptyTitle}</h2>
              <p className="max-w-md text-[13px] text-muted">{filtered ? copy.noMatchBody : copy.emptyBody}</p>
              {!filtered ? (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Link href="/library" className={buttonClass.secondary}>
                    {en.shell.nav.library}
                  </Link>
                  <Link href="/vocabulary/new" className={buttonClass.primary}>
                    <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
                    {copy.newWord}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : view === "cards" ? (
            <CardsView items={items} query={query} selectedId={selected?.id ?? null} />
          ) : (
            <ListView items={items} query={query} selectedId={selected?.id ?? null} timeZone={props.timeZone} />
          )}
          <Pagination page={page} pageCount={pageCount} query={query} />
        </section>
        {selected ? (
          <DetailPanel word={selected} tab={tab} query={query} relationOptions={props.relationOptions} actions={props.actions} timeZone={props.timeZone} />
        ) : null}
      </div>
    </div>
  );
}
