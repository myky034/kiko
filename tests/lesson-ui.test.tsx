import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LessonForm } from "@/components/lesson-form";
import { LessonStatusBadge, SegmentList } from "@/components/lesson-parts";
import { listLanguages } from "@/modules/language/registry";

const noop = async () => ({ errors: {} });
const defaults = { title: "", languageCode: "ja", tags: "", levelLabel: "", sourceNote: "", content: "" };

describe("SegmentList", () => {
  it("renders segments as text, verbatim, with the lesson language", () => {
    const { container } = render(
      <SegmentList
        languageCode="ja"
        segments={[
          { position: 0, text: "<script>alert(1)</script>" },
          { position: 1, text: "  前に空白" },
        ]}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>").getAttribute("lang")).toBe("ja");
    expect(container.querySelectorAll("p")[1].textContent).toBe("  前に空白");
  });

  it("shows an empty state without fake content", () => {
    render(<SegmentList languageCode="en" segments={[]} />);
    expect(screen.getByText("Bài chưa có đoạn nào.")).toBeDefined();
  });
});

describe("LessonStatusBadge", () => {
  it("states the status in text, not only color", () => {
    render(<LessonStatusBadge status="archived" />);
    expect(screen.getByText("Đã lưu trữ")).toBeDefined();
  });
});

describe("LessonForm counters", () => {
  function renderForm() {
    render(
      <LessonForm
        action={noop}
        defaults={defaults}
        languages={listLanguages()}
        hidden={{ clientRequestId: "x" }}
        languageLocked={false}
        submitLabel="Lưu"
      />,
    );
    return screen.getByLabelText("Nội dung");
  }

  it("counts segments and code points like the server, emoji = 1, line break = 1", () => {
    const textarea = renderForm();
    fireEvent.change(textarea, { target: { value: "😀\n\n　\nabc" } });
    expect(screen.getByText(/2 đoạn · 8 \/ 100\.000 ký tự/)).toBeDefined();
  });

  it("warns live with the line number when a segment is too long, without truncating", () => {
    const textarea = renderForm() as HTMLTextAreaElement;
    const long = "😀".repeat(2001);
    fireEvent.change(textarea, { target: { value: `ok\n${long}` } });
    expect(screen.getByText("Dòng 2: đoạn dài 2.001 ký tự, vượt giới hạn 2.000.")).toBeDefined();
    expect(textarea.value).toBe(`ok\n${long}`);
    expect(textarea.getAttribute("maxlength")).toBeNull();
  });

  it("submits the language even when the select is locked", () => {
    const { container } = render(
      <LessonForm
        action={noop}
        defaults={{ ...defaults, languageCode: "zh" }}
        languages={listLanguages()}
        hidden={{ expectedVersion: "2" }}
        languageLocked
        submitLabel="Lưu"
      />,
    );
    const hidden = container.querySelector('input[type="hidden"][name="languageCode"]') as HTMLInputElement;
    expect(hidden.value).toBe("zh");
    expect((screen.getByLabelText("Ngôn ngữ") as HTMLSelectElement).disabled).toBe(true);
  });
});
