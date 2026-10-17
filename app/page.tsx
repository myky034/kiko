import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import { loadDashboard, needsOnboarding } from "@/modules/identity/dashboard";
import { getAccessDependencies, requireActiveActor } from "@/server/identity";
import { signOut } from "./actions";

export default async function HomePage() {
  const actor = await requireActiveActor();
  if (needsOnboarding(actor)) redirect("/onboarding");

  const { repository } = await getAccessDependencies();
  const data = await loadDashboard(actor, repository);

  return (
    <AppShell currentPath="/" signOutAction={signOut}>
      <DashboardView data={data} />
    </AppShell>
  );
}
