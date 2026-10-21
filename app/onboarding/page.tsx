import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { needsOnboarding } from "@/modules/identity/dashboard";
import { listLanguages } from "@/modules/language/registry";
import { listSupportedTimeZones } from "@/modules/language/timezones";
import { en } from "@/modules/i18n/en";
import { getServerEnv } from "@/server/config/env";
import { requireActiveActor } from "@/server/identity";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: en.app.pageTitle(en.onboarding.pageTitle) };

export default async function OnboardingPage() {
  const actor = await requireActiveActor();
  if (!needsOnboarding(actor)) redirect("/");

  const defaultTimezone = actor.timezone ?? getServerEnv().KIKO_DEFAULT_TIMEZONE;

  return (
    <AuthLayout title={en.onboarding.title} description={en.onboarding.subtitle}>
      <OnboardingForm
        languages={listLanguages()}
        timezones={listSupportedTimeZones([defaultTimezone])}
        defaultTimezone={defaultTimezone}
      />
    </AuthLayout>
  );
}
