import "server-only";
import type { ShellLearning } from "@/components/app-shell";
import { accountSummary, type AccountSummary } from "@/modules/identity/display";
import type { Actor } from "@/modules/identity/types";
import { setLearningLanguage } from "@/app/actions";
import { getLearningContext } from "@/server/learning-language";

/** Props every signed-in page passes to AppShell: account menu and learning-language switcher. */
export async function shellContext(actor: Actor): Promise<{ account: AccountSummary; learning?: ShellLearning }> {
  const { current, options } = await getLearningContext(actor);
  return {
    account: accountSummary(actor),
    learning: current ? { current, options, action: setLearningLanguage } : undefined,
  };
}
