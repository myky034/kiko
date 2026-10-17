"use server";

import { redirect } from "next/navigation";
import { saveOnboarding, type OnboardingErrors } from "@/modules/identity/onboarding";
import { getAccessDependencies } from "@/server/identity";

export type OnboardingFormState = {
  errors: OnboardingErrors;
  /** Echo of the submitted values so the form keeps the user's input on error. */
  values?: { languages: string[]; timezone: string };
};

export async function submitOnboarding(
  _previous: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const outcome = await saveOnboarding(await getAccessDependencies(), formData);

  switch (outcome.status) {
    case "saved":
      return redirect("/");
    case "unauthenticated":
      return redirect("/sign-in");
    case "denied":
      return redirect("/access-denied");
    case "invalid":
      return {
        errors: outcome.errors,
        values: {
          languages: formData.getAll("languages").map(String),
          timezone: String(formData.get("timezone") ?? ""),
        },
      };
  }
}
