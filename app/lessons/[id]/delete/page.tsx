import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DeleteLessonForm } from "@/components/delete-lesson-form";
import { getLesson } from "@/modules/content/lessons";
import { getLessonRepository, requireLearner } from "@/server/lessons";
import { signOut } from "../../../actions";
import { deleteLessonAction } from "../../actions";

export const metadata: Metadata = { title: "Xóa bài học · Kiko" };

export default async function DeleteLessonPage({ params }: PageProps<"/lessons/[id]/delete">) {
  const actor = await requireLearner();
  const { id } = await params;
  const result = await getLesson(actor, getLessonRepository(), id);
  if (result.status !== "ok") notFound();
  const lesson = result.value;

  return (
    <AppShell currentPath="/library" signOutAction={signOut}>
      <div className="mx-auto flex max-w-reading flex-col gap-6">
        <Link href={`/lessons/${lesson.id}`} className="text-supporting font-medium text-primary-strong">
          ← Quay lại bài học
        </Link>
        <h1 className="text-page-title font-bold">Xóa vĩnh viễn bài học?</h1>
        <div className="flex flex-col gap-2 text-foreground">
          <p>
            Thao tác này xóa bài <strong>{lesson.title}</strong> cùng <strong>mọi phiên bản nội dung</strong> — bản đang học,
            bản sửa chưa công bố và các phiên bản cũ — và toàn bộ đoạn trong đó. <strong>Không hoàn tác được.</strong>
          </p>
          <p className="text-muted-foreground">
            Nếu chỉ muốn ẩn bài, hãy dùng “Lưu trữ” — có thể bỏ lưu trữ bất cứ lúc nào. Khi bài đã có dữ liệu học liên quan (từ
            vựng, lượt luyện), Kiko sẽ không cho xóa vĩnh viễn. Bản sao lưu của hệ thống có thể còn giữ dữ liệu tới khi hết hạn.
          </p>
        </div>
        <DeleteLessonForm action={deleteLessonAction.bind(null, lesson.id)} version={lesson.version} />
      </div>
    </AppShell>
  );
}
