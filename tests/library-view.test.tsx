import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LibraryView } from "@/components/library-view";
import type { LessonSummary } from "@/modules/content/types";

const lessons: LessonSummary[] = [
  { id: "l1", title: "你好", languageCode: "zh", status: "ready", tags: ["daily life"], updatedAt: new Date("2026-10-19T02:00:00Z") },
  { id: "l2", title: "Small talk", languageCode: "en", status: "draft", tags: ["daily life", "travel"], updatedAt: new Date("2026-10-18T02:00:00Z") },
];

const base = { lessons, nextHref: null, query: {}, filtered: false, deleted: false, timeZone: "Asia/Ho_Chi_Minh" };

describe("LibraryView", () => {
  it("keeps the real filters submittable and the sample ones inert", () => {
    const { container } = render(<LibraryView {...base} query={{ language: "zh", status: "archived" }} filtered />);
    const form = screen.getByRole("form", { name: "Filter lessons" });
    expect((form.querySelector('select[name="language"]') as HTMLSelectElement).value).toBe("zh");
    const status = form.querySelector('select[name="status"]') as HTMLSelectElement;
    expect(status.value).toBe("archived");
    expect([...status.options].map((option) => option.value)).toContain("archived");
    // Search, Level and Skill are drawn but never submitted.
    for (const control of form.querySelectorAll("input[type=search], select:not([name])")) {
      expect((control as HTMLInputElement).disabled).toBe(true);
      expect(control.getAttribute("name")).toBeNull();
    }
    expect(within(form).getByRole("link", { name: /Reset/ }).getAttribute("href")).toBe("/library");
    expect(container.querySelector('a[href="/lessons/new"]')).not.toBeNull();
  });

  it("keeps an active topic filter in the form", () => {
    render(<LibraryView {...base} query={{ tag: "travel" }} filtered />);
    const form = screen.getByRole("form", { name: "Filter lessons" });
    expect((form.querySelector('input[name="tag"]') as HTMLInputElement).value).toBe("travel");
  });

  it("shows only results when filtered, without the sample sections", () => {
    render(<LibraryView {...base} query={{ language: "en" }} filtered />);
    expect(screen.getByRole("heading", { name: "Results" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Browse by Skill" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Continue Learning" })).toBeNull();
  });

  it("builds Continue, Recommended, topics and the full grid from real lessons", () => {
    render(<LibraryView {...base} />);
    const continueSection = screen.getByRole("region", { name: "Continue Learning" });
    expect(within(continueSection).getByRole("link", { name: /Continue/ }).getAttribute("href")).toBe("/lessons/l1");
    const all = screen.getByRole("region", { name: "Your Lessons" });
    expect(within(all).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/lessons/l1", "/lessons/l2"]);
    const topics = screen.getByRole("region", { name: "Browse by Topic" });
    expect(within(topics).getByText("2 lessons")).toBeDefined();
    // Real lesson cards never carry an invented progress percentage.
    expect(document.body.textContent).not.toMatch(/\d+%/);
  });

  it("marks topic counts partial and keeps filters in Load more", () => {
    render(<LibraryView {...base} nextHref="/library?status=ready&cursor=abc" />);
    expect(screen.getByText("2+ lessons")).toBeDefined();
    expect(screen.getByRole("link", { name: "Load more" }).getAttribute("href")).toBe("/library?status=ready&cursor=abc");
  });

  it("labels the sample skill counts for assistive tech", () => {
    render(<LibraryView {...base} />);
    const skills = screen.getByRole("region", { name: "Browse by Skill" });
    expect(within(skills).getAllByText("(sample data)").length).toBe(4);
  });

  it("shows the empty state with a create action when there are no lessons", () => {
    render(<LibraryView {...base} lessons={[]} />);
    expect(screen.getByRole("heading", { name: "No lessons yet" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Continue Learning" })).toBeNull();
  });
});
