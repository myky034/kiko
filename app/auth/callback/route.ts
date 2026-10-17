import { NextResponse, type NextRequest } from "next/server";
import { handleOAuthCallback } from "@/modules/identity/oauth-callback";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getAppOrigin } from "@/server/config/env";

/**
 * OAuth (PKCE) return point registered in Supabase's Redirect URLs. Exchanges
 * the code for a session cookie and redirects to an allow-listed internal path
 * on the configured origin (DEC-018). Admission is checked on the next page.
 */
export async function GET(request: NextRequest) {
  let origin: string;
  try {
    origin = getAppOrigin();
  } catch {
    return new NextResponse("Kiko is not configured.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const supabase = await createSupabaseServerClient();
  const target = await handleOAuthCallback({
    origin,
    searchParams: request.nextUrl.searchParams,
    exchangeCode: async (code) => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return !error;
    },
  });

  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
