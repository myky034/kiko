# Kiko — Tài liệu dự án

Mục lục các tài liệu trong `docs/`. Tên file là duy nhất trong toàn thư mục, nên các tài liệu nhắc nhau bằng tên trơn (ví dụ `PROJECT_SPEC.md`). Bảng dưới cho biết mỗi file nằm ở thư mục nào. Quy tắc làm việc cho agent nằm ở [`../AGENTS.md`](../AGENTS.md).

Trạng thái của từng nội dung (Proposed / Accepted / Deferred) được ghi trong chính tài liệu và trong `DECISIONS.md`; mục lục này không thay đổi trạng thái nào.

## Quyết định

| Tài liệu | Nội dung |
|---|---|
| [DECISIONS.md](DECISIONS.md) | Decision register: quyết định đã chốt, quyết định phái sinh khi triển khai, và vấn đề còn mở |

## `product/` — Sản phẩm

| Tài liệu | Nội dung |
|---|---|
| [PROJECT_SPEC.md](product/PROJECT_SPEC.md) | Đặc tả dự án: phạm vi, yêu cầu chức năng (FR), tiêu chí nghiệm thu |
| [PRD.md](product/PRD.md) | Product Requirements Document (bản nháp dựa trên nghiên cứu) |
| [FEATURE_PRIORITIZATION.md](product/FEATURE_PRIORITIZATION.md) | Ưu tiên tính năng cho UX/UI và lát cắt thiết kế đầu tiên |

## `research/` — Nghiên cứu người dùng

| Tài liệu | Nội dung |
|---|---|
| [RESEARCH_INSIGHTS.md](research/RESEARCH_INSIGHTS.md) | Insight nghiên cứu và sổ quyết định sản phẩm theo mức bằng chứng |
| [USER_RESEARCH_SYNTHESIS.md](research/USER_RESEARCH_SYNTHESIS.md) | Tổng hợp nghiên cứu người dùng |
| [PERSONAS_AND_JTBD.md](research/PERSONAS_AND_JTBD.md) | Proto-persona và Jobs To Be Done |
| [USER_JOURNEY_MAP.md](research/USER_JOURNEY_MAP.md) | Bản đồ hành trình người dùng (giả định) cho các luồng học chính |

## `ux/` — Trải nghiệm và giao diện

| Tài liệu | Nội dung |
|---|---|
| [INFORMATION_ARCHITECTURE.md](ux/INFORMATION_ARCHITECTURE.md) | Kiến trúc thông tin và cấu trúc điều hướng |
| [USER_FLOWS.md](ux/USER_FLOWS.md) | Luồng người dùng chính và các nhánh ngoại lệ |
| [UI_SPEC.md](ux/UI_SPEC.md) | Đặc tả màn hình, tương tác và trạng thái responsive |
| [DESIGN.md](ux/DESIGN.md) | Đặc tả UI “Quiet Bloom”: token, component, màn hình, trạng thái (đang áp dụng, DEC-026) |
| [DESIGN_SYSTEM.md](ux/DESIGN_SYSTEM.md) | Design system "Soft Learning System" — đã được thay bởi DESIGN.md, giữ để tham khảo |

## `engineering/` — Kỹ thuật

| Tài liệu | Nội dung |
|---|---|
| [ARCHITECTURE.md](engineering/ARCHITECTURE.md) | Kiến trúc giải pháp: module, luồng dữ liệu, triển khai, vận hành |
| [ACCESS_CONTROL.md](engineering/ACCESS_CONTROL.md) | Role, quyền, ownership và cách thực thi |
| [DATA_MODEL.md](engineering/DATA_MODEL.md) | Thực thể, quan hệ, ràng buộc, lưu giữ dữ liệu |
| [IMPLEMENTATION_PLAN.md](engineering/IMPLEMENTATION_PLAN.md) | Kế hoạch triển khai theo lát cắt (KIKO-001 → KIKO-025) |
| [TEST_PLAN.md](engineering/TEST_PLAN.md) | Chiến lược kiểm thử, môi trường, release gate, bằng chứng |
