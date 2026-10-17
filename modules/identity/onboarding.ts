import { z } from "zod";
import { LANGUAGE_CODES, type LanguageCode } from "@/modules/language/registry";
import { isSupportedTimeZone } from "@/modules/language/timezones";
import { AuthorizationError, requirePermission } from "@/server/policy/permissions";
import { resolveAccess, type AccessDependencies } from "./access";

export type OnboardingField = "languages" | "timezone";

export type OnboardingInput = {
  languages: LanguageCode[];
  timezone: string;
};

export type OnboardingErrors = Partial<Record<OnboardingField | "form", string>>;

export type ParseOnboardingResult =
  | { ok: true; value: OnboardingInput }
  | { ok: false; errors: OnboardingErrors };

const ALLOWED_FIELDS: ReadonlySet<string> = new Set<OnboardingField>(["languages", "timezone"]);

/** Hidden fields React/Next add to progressively enhanced Server Action forms. */
function isFrameworkField(name: string): boolean {
  return name.startsWith("$ACTION");
}

const onboardingSchema = z
  .object({
    languages: z
      .array(z.enum(LANGUAGE_CODES, { error: "Ngôn ngữ không được hỗ trợ." }))
      .min(1, { error: "Chọn ít nhất một ngôn ngữ để học." })
      .max(LANGUAGE_CODES.length),
    timezone: z
      .string({ error: "Chọn múi giờ." })
      .refine(isSupportedTimeZone, { error: "Múi giờ không hợp lệ." }),
  })
  .strict();

/**
 * Validates onboarding form data with an explicit allowlist. Any field other
 * than `languages` and `timezone` (for example role, state or a user id) makes
 * the whole submission invalid instead of being silently ignored.
 */
export function parseOnboardingForm(formData: FormData): ParseOnboardingResult {
  for (const name of new Set(formData.keys())) {
    if (!ALLOWED_FIELDS.has(name) && !isFrameworkField(name)) {
      return { ok: false, errors: { form: "Biểu mẫu chứa trường không hợp lệ." } };
    }
  }

  const timezone = formData.getAll("timezone");
  const result = onboardingSchema.safeParse({
    languages: [...new Set(formData.getAll("languages"))],
    timezone: timezone.length === 1 ? timezone[0] : undefined,
  });

  if (!result.success) {
    const errors: OnboardingErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      const key: OnboardingField | "form" =
        field === "languages" || field === "timezone" ? field : "form";
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }

  // Keep registry order so storage and display stay deterministic.
  const selected = new Set(result.data.languages);
  return {
    ok: true,
    value: {
      languages: LANGUAGE_CODES.filter((code) => selected.has(code)),
      timezone: result.data.timezone,
    },
  };
}

export type SaveOnboardingOutcome =
  | { status: "saved" }
  | { status: "invalid"; errors: OnboardingErrors }
  | { status: "unauthenticated" }
  | { status: "denied" };

/**
 * Saves the actor's own onboarding choices. The target profile is always the
 * actor resolved from the verified session; no id is read from the form.
 * Retrying the same submission converges to the same state (no duplicates,
 * first onboarding time preserved).
 */
export async function saveOnboarding(
  deps: AccessDependencies,
  formData: FormData,
): Promise<SaveOnboardingOutcome> {
  const access = await resolveAccess(deps);
  if (access.status === "unauthenticated") return { status: "unauthenticated" };
  if (access.status === "denied") return { status: "denied" };

  const { actor } = access;
  try {
    requirePermission(actor, "profile.update_self");
  } catch (error) {
    if (error instanceof AuthorizationError) return { status: "denied" };
    throw error;
  }

  const parsed = parseOnboardingForm(formData);
  if (!parsed.ok) {
    // Unexpected fields (e.g. role/state/user id) are a security signal;
    // ordinary validation mistakes are not audited.
    if (parsed.errors.form) {
      await deps.repository.recordAudit({
        actorUserId: actor.userId,
        action: "profile.onboarding",
        targetType: "user_profile",
        targetId: actor.userId,
        result: "denied",
      });
    }
    return { status: "invalid", errors: parsed.errors };
  }

  const result = await deps.repository.saveOnboarding({
    userId: actor.userId,
    expectedRevision: actor.authorizationRevision,
    timezone: parsed.value.timezone,
    languages: parsed.value.languages,
  });

  // Suspension or a role change committed after access was resolved.
  if (result === "stale_authorization") return { status: "denied" };
  return { status: "saved" };
}
