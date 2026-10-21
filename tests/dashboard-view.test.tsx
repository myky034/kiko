import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import type { LessonSummary } from "@/modules/content/types";
import type { DashboardData } from "@/modules/identity/dashboard";

const learner: DashboardData = {
  isLearner: true,
  isOwner: false,
  timezone: "Asia/Ho_Chi_Minh",
  languages: ["zh", "en"],
};

// 2026-10-20T20:30Z is Tuesday evening in UTC but Wednesday 03:30 in Ho Chi Minh City.
const now = new Date("2026-10-20T20:30:00Z");

const lessons: LessonSummary[] = [
  { id: "l1", title: "你好", languageCode: "zh", status: "ready", tags: ["daily life"], updatedAt: new Date("2026-10-19T02:00:00Z") },
  { id: "l2", title: "Small talk", languageCode: "en", status: "draft", tags: ["daily life", "travel"], updatedAt: new Date("2026-10-18T02:00:00Z") },
];

describe("DashboardView", () => {
  it("no longer lists the learning languages under the greeting (they live in the header switcher)", () => {
    render(<DashboardView data={learner} now={now} />);
    expect(screen.queryByText("中文")).toBeNull();
    expect(screen.queryByRole("list", { name: "Learning:" })).toBeNull();
  });

  it("computes the greeting, date and today marker in the learner's time zone", () => {
    render(<DashboardView data={learner} now={now} />);
    expect(screen.getByRole("heading", { level: 1, name: "Good morning!" })).toBeDefined();
    expect(screen.getByText("Wed, Oct 21, 2026")).toBeDefined();
    expect(screen.getByText("(today)").parentElement?.textContent).toBe("Wed (today)");
  });

  it("shows honest placeholders and no fabricated numbers", () => {
    const { container } = render(<DashboardView data={learner} now={now} />);
    expect(screen.getByRole("link", { name: /New lesson/ }).getAttribute("href")).toBe("/lessons/new");
    expect(screen.getAllByText("Coming soon").length).toBe(3);
    // No counts, streaks or percentages: the only digits are in the real date.
    const text = (container.textContent ?? "").replace("Wed, Oct 21, 2026", "");
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(/%/);
  });

  it("builds Continue, Recommended and Topics from the passed lessons only", () => {
    render(<DashboardView data={learner} now={now} home={{ lessons, complete: true }} />);
    expect(screen.getByRole("link", { name: /Continue/ }).getAttribute("href")).toBe("/lessons/l1");
    const recommended = screen.getByRole("region", { name: "Recommended for You" });
    expect(
      within(recommended)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/library", "/lessons/l1", "/lessons/l2"]);
    const topics = screen.getByRole("region", { name: "Browse by Topic" });
    const topicLinks = within(topics).getAllByRole("link").slice(1);
    expect(topicLinks.map((link) => link.getAttribute("href"))).toEqual(["/library?tag=daily%20life", "/library?tag=travel"]);
    expect(within(topics).getByText("2 lessons")).toBeDefined();
    expect(screen.getByText("1 lesson ready")).toBeDefined();
  });

  it("marks counts as partial when there are more lessons than one page", () => {
    render(<DashboardView data={learner} now={now} home={{ lessons, complete: false }} />);
    expect(screen.getByText("2+ lessons")).toBeDefined();
  });

  it("shows only the administration notice for an Owner-only account", () => {
    render(<DashboardView data={{ isLearner: false, isOwner: true, timezone: null, languages: [] }} now={now} />);
    expect(screen.getByRole("heading", { name: "Administration" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Continue Learning" })).toBeNull();
  });
});

describe("AppShell", () => {
  it("links only to implemented routes (home, library) and offers a POST sign-out", () => {
    const signOut = async () => {};
    const { container } = render(
      <AppShell currentPath="/" signOutAction={signOut} account={{ initial: "V", name: "Vũ Mỹ Kỳ", roleLabel: "Learner" }}>
        <p>content</p>
      </AppShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Learning navigation" });
    const links = within(sidebar).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/library"]);
    expect(links[0].getAttribute("aria-current")).toBe("page");
    for (const item of sidebar.querySelectorAll('[aria-disabled="true"]')) {
      expect(item.closest("a")).toBeNull();
    }
    // Desktop top bar and mobile header each render the account menu with the same POST form.
    const signOutButtons = screen.getAllByRole("button", { name: "Sign out" });
    expect(signOutButtons.length).toBeGreaterThan(0);
    for (const button of signOutButtons) expect(button.closest("form")).not.toBeNull();
    expect(container.querySelector('a[href*="sign-out"]')).toBeNull();
    // The account menu shows the user's name, not the role.
    expect(screen.getAllByText("Vũ Mỹ Kỳ").length).toBeGreaterThan(0);
    // Notifications have no source: disabled, no unread indicator.
    for (const bell of screen.getAllByRole("button", { name: /Notifications/ })) {
      expect((bell as HTMLButtonElement).disabled).toBe(true);
    }
  });
});

describe("LanguageSwitcher in the header", () => {
  it("offers only the learner's languages as POST forms, marking the current one", () => {
    const action = async () => {};
    render(
      <AppShell
        currentPath="/"
        account={{ initial: "V", name: "Vũ Mỹ Kỳ", roleLabel: "Learner" }}
        learning={{ current: "zh", options: ["zh", "en"], action }}
      >
        <p>content</p>
      </AppShell>,
    );
    const triggers = screen.getAllByLabelText("Learning language: Chinese");
    expect(triggers.length).toBeGreaterThan(0);
    const chinese = screen.getAllByRole("button", { name: /Chinese/ })[0];
    expect(chinese.getAttribute("aria-pressed")).toBe("true");
    expect((chinese.closest("form")?.querySelector('input[name="language"]') as HTMLInputElement).value).toBe("zh");
    expect(screen.getAllByText("中文")[0].getAttribute("lang")).toBe("zh");
    expect(screen.getAllByRole("button", { name: /English/ })[0].getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("button", { name: /Japanese/ })).toBeNull();
  });

  it("is absent when the actor has no learning language", () => {
    render(
      <AppShell currentPath="/" account={{ initial: "O", name: "Owner", roleLabel: "Owner" }}>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.queryByLabelText(/Learning language/)).toBeNull();
  });
});
