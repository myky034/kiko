import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import HomePage from "@/app/page";

describe("home page shell", () => {
  it("shows the Kiko name and the three learning languages", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Kiko" }),
    ).toBeDefined();

    for (const label of ["Tiếng Trung", "Tiếng Nhật", "Tiếng Anh"]) {
      expect(screen.getByRole("heading", { level: 3, name: label })).toBeDefined();
    }
  });

  it("tags learning-language text with lang attributes", () => {
    const { container } = render(<HomePage />);

    expect(screen.getByText("中文").getAttribute("lang")).toBe("zh");
    expect(screen.getByText("日本語").getAttribute("lang")).toBe("ja");
    expect(screen.getByText("English").getAttribute("lang")).toBe("en");
    expect(container.querySelector('[lang="en-fonipa"]')).not.toBeNull();
    expect(container.querySelector('[lang="zh-Latn-pinyin"]')).not.toBeNull();
  });

  it("states honestly that no learning features exist yet", () => {
    render(<HomePage />);

    expect(screen.getByRole("status").textContent).toContain(
      "Chưa có đăng nhập, lưu trữ hay dữ liệu học",
    );
  });

  it("links only to implemented routes", () => {
    render(<HomePage />);

    const sidebar = screen.getByRole("navigation", {
      name: "Điều hướng học tập",
    });
    const links = within(sidebar).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/"]);
    expect(links[0].getAttribute("aria-current")).toBe("page");

    const unavailable = sidebar.querySelectorAll('[aria-disabled="true"]');
    expect(unavailable.length).toBeGreaterThan(0);
    for (const item of unavailable) {
      expect(item.closest("a")).toBeNull();
    }
  });

  it("does not claim stroke practice for English", () => {
    render(<HomePage />);

    const english = screen.getByRole("article", { name: "Tiếng Anh" });
    expect(within(english).getByText("Không áp dụng")).toBeDefined();
  });
});
