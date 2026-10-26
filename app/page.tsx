import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardView, type HomeLessons } from "@/components/dashboard-view";
import { listLessons } from "@/modules/content/lessons";
import { loadDashboard, needsOnboarding } from "@/modules/identity/dashboard";
import { getAccessDependencies, requireActiveActor } from "@/server/identity";
import { getLessonRepository } from "@/server/lessons";
import { getLearningContext } from "@/server/learning-language";
import { shellContext } from "@/server/shell";
import { signOut } from "./actions";

export default async function HomePage() {
  const actor = await requireActiveActor();
  if (needsOnboarding(actor)) redirect("/onboarding");

  const { repository } = await getAccessDependencies();
  const data = await loadDashboard(actor, repository);

  // The learner's own active lessons in the current learning language, newest first (one page).
  let home: HomeLessons = { lessons: [], complete: true };
  const { current } = await getLearningContext(actor);
  if (data.isLearner && current) {
    const result = await listLessons(actor, getLessonRepository(), { language: current });
    if (result.status === "ok") home = { lessons: result.value.items, complete: result.value.nextCursor === null };
  }

  return (
    <AppShell currentPath="/" signOutAction={signOut} {...(await shellContext(actor))}>
      <DashboardView data={data} home={home} />
    </AppShell>
  );
}
