import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import type { DashboardData } from "@/modules/identity/dashboard";

const learner: DashboardData = {
  isLearner: true,
  isOwner: false,
  timezone: "Asia/Ho_Chi_Minh",
  languages: ["zh", "en"],
};

describe("DashboardView", () => {
  it("shows the learner's languages with lang attributes and timezone", () => {
    render(<DashboardView data={learner} />);
    expect(screen.getByText("中文").getAttribute("lang")).toBe("zh");
    expect(screen.getByText("English").getAttribute("lang")).toBe("en");
    expect(screen.queryByText("日本語")).toBeNull();
    expect(screen.getByText("Asia/Ho_Chi_Minh")).toBeDefined();
  });

  it("shows honest empty states and no fabricated numbers", () => {
    const { container } = render(<DashboardView data={learner} />);
    expect(screen.getByText(/Chưa có bài học nào/)).toBeDefined();
    expect(screen.getByText(/Chưa có thẻ ôn tập/)).toBeDefined();
    // No counts, streaks or percentages: the only digits are in the timezone name.
    const text = (container.textContent ?? "").replace("Asia/Ho_Chi_Minh", "");
    expect(text).not.toMatch(/\d/);
  });

  it("shows only the administration notice for an Owner-only account", () => {
    render(
      <DashboardView data={{ isLearner: false, isOwner: true, timezone: null, languages: [] }} />,
    );
    expect(screen.getByRole("heading", { name: "Quản trị" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Học tiếp" })).toBeNull();
  });
});

describe("AppShell", () => {
  it("links only to implemented routes and offers a POST sign-out", () => {
    const signOut = async () => {};
    const { container } = render(
      <AppShell currentPath="/" signOutAction={signOut}>
        <p>content</p>
      </AppShell>,
    );
    const sidebar = screen.getByRole("navigation", { name: "Điều hướng học tập" });
    const links = within(sidebar).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/"]);
    expect(links[0].getAttribute("aria-current")).toBe("page");
    for (const item of sidebar.querySelectorAll('[aria-disabled="true"]')) {
      expect(item.closest("a")).toBeNull();
    }
    expect(screen.getByRole("button", { name: "Đăng xuất" }).closest("form")).not.toBeNull();
    expect(container.querySelector('a[href*="sign-out"]')).toBeNull();
  });
});
