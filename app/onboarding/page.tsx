import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { needsOnboarding } from "@/modules/identity/dashboard";
import { listLanguages } from "@/modules/language/registry";
import { listSupportedTimeZones } from "@/modules/language/timezones";
import { getServerEnv } from "@/server/config/env";
import { requireActiveActor } from "@/server/identity";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Bắt đầu · Kiko" };

export default async function OnboardingPage() {
  const actor = await requireActiveActor();
  if (!needsOnboarding(actor)) redirect("/");

  const defaultTimezone = actor.timezone ?? getServerEnv().KIKO_DEFAULT_TIMEZONE;

  return (
    <AuthLayout title="Chào mừng đến Kiko" description="Cho Kiko biết bạn muốn học gì để bắt đầu.">
      <OnboardingForm
        languages={listLanguages()}
        timezones={listSupportedTimeZones([defaultTimezone])}
        defaultTimezone={defaultTimezone}
      />
    </AuthLayout>
  );
}
