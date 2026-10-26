import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SegmentReader } from "@/components/segment-reader";
import { VocabularyView, type VocabularyViewProps } from "@/components/vocabulary-view";
import type { VocabularyDetail, VocabularySummary } from "@/modules/vocabulary/types";

const noop = async () => {};

const word: VocabularySummary = {
  id: "22222222-2222-4222-8222-222222222222",
  languageCode: "zh",
  surface: "早上",
  meaning: "morning",
  readings: ["zǎo shang"],
  tags: ["daily life", "time", "hsk1"],
  starred: true,
  archived: false,
  createdAt: new Date("2026-10-20T03:00:00Z"),
  occurrenceCount: 1,
};

const detail: VocabularyDetail = {
  ...word,
  notes: null,
  usage: "Used before noon.",
  examples: [{ text: "早上好！", reading: null, translation: "Good morning!" }],
  version: 3,
  updatedAt: new Date(),
  occurrences: [{ lessonId: "l1", lessonTitle: "晨间", sourceText: "我每天早上跑步。", selectedText: "早上", start: 3, end: 5, createdAt: new Date() }],
  decks: [],
  related: [],
};

function props(overrides: Partial<VocabularyViewProps> = {}): VocabularyViewProps {
  return {
    language: "zh",
    items: [word],
    total: 1,
    activeTotal: 1,
    page: 1,
    pageCount: 1,
    filter: { language: "zh", archived: false, tag: null, deckId: null, starred: false, source: "all", sort: "recent", page: 1, pageSize: 12 },
    query: {},
    view: "list",
    decks: [],
    selected: null,
    tab: "overview",
    relationOptions: [],
    deleted: false,
    error: null,
    timeZone: "Asia/Ho_Chi_Minh",
    actions: { star: noop, archive: noop, unarchive: noop, relate: noop, unrelate: noop },
    ...overrides,
  };
}

describe("VocabularyView", () => {
  it("shows the real total and labelled placeholders for review-based stats and actions", () => {
    render(<VocabularyView {...props()} />);
    expect(screen.getByText("Total words").previousElementSibling?.textContent).toBe("1");
    expect(screen.getAllByText("(Not tracked yet)").length).toBeGreaterThanOrEqual(3);
    expect((screen.getByRole("button", { name: /Study Now/ }) as HTMLButtonElement).disabled).toBe(true);
    // Language comes from the header switcher only: no second language picker on the page.
    expect(screen.queryByRole("button", { name: "English" })).toBeNull();
  });

  it("lists words with lang attributes and links that keep filters", () => {
    render(<VocabularyView {...props({ query: { sort: "alphabetical" } })} />);
    const link = screen.getByText("早上").closest("a")!;
    expect(screen.getByText("早上").getAttribute("lang")).toBe("zh");
    expect(link.getAttribute("href")).toBe(`/vocabulary?sort=alphabetical&word=${word.id}`);
    expect(screen.getByText("+1")).toBeDefined();
  });

  it("shows the saved sentence, star toggle and disabled practice actions in the detail panel", () => {
    render(<VocabularyView {...props({ selected: detail })} />);
    const panel = screen.getByRole("complementary");
    expect(within(panel).getByText("早上", { selector: "mark" })).toBeDefined();
    expect(within(panel).getByRole("link", { name: "晨间" }).getAttribute("href")).toBe("/lessons/l1");
    expect(within(panel).getByRole("button", { name: "Remove star" }).getAttribute("aria-pressed")).toBe("true");
    expect((within(panel).getByRole("button", { name: /Practice/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(panel).getByRole("link", { name: /Delete permanently/ }).getAttribute("href")).toBe(`/vocabulary/${word.id}/delete`);
  });

  it("explains an empty library and keeps the filter field names the server expects", () => {
    const { container } = render(<VocabularyView {...props({ items: [], total: 0, activeTotal: 0 })} />);
    expect(screen.getByRole("heading", { name: "No words yet" })).toBeDefined();
    const names = [...container.querySelectorAll("form[aria-label='Filter words'] [name]")].map((el) => el.getAttribute("name"));
    expect(names).toEqual(["archived", "deck", "tag", "source", "sort", "starred"]);
  });
});

describe("SegmentReader", () => {
  const segments = [{ position: 0, text: "😀今日は良い天気" }];

  it("underlines saved selections by code points", () => {
    const { container } = render(
      <SegmentReader lessonId="l1" versionNo={2} language="ja" htmlLang="ja" segments={segments} saved={[{ position: 0, start: 6, end: 8 }]} action={async () => ({ errors: {} })} similarAction={async () => []} />,
    );
    expect(container.querySelector("span.underline")?.textContent).toBe("天気");
  });

  it("opens the save form from the keyboard button with the selection fields the server needs", () => {
    const { container } = render(
      <SegmentReader lessonId="l1" versionNo={2} language="ja" htmlLang="ja" segments={segments} saved={[]} action={async () => ({ errors: {} })} similarAction={async () => []} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add word/ }));
    const form = container.querySelector("form")!;
    const hidden = Object.fromEntries([...form.querySelectorAll("input[type=hidden]")].map((el) => [el.getAttribute("name"), (el as HTMLInputElement).value]));
    expect(hidden).toMatchObject({ lessonId: "l1", versionNo: "2", position: "0", mode: "new", phrase: "" });
    expect(hidden.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(form.querySelector('input[name="selectedText"]')).toBeNull();
    expect(screen.getByLabelText("Word or phrase")).toBe(document.activeElement);
  });
});
