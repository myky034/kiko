import { appUrl, safeAfterSignInPath, type SignInErrorCode } from "./redirect";

export type OAuthCallbackInput = {
  /** Canonical app origin from configuration. */
  origin: string;
  searchParams: URLSearchParams;
  /** Exchanges the PKCE authorization code; true when a session was created. */
  exchangeCode: (code: string) => Promise<boolean>;
};

function signInError(origin: string, code: SignInErrorCode): URL {
  const url = appUrl(origin, "/sign-in");
  url.searchParams.set("error", code);
  return url;
}

/**
 * Handles the provider redirect back to /auth/callback and returns where to
 * send the browser. A session only establishes identity; Kiko admission,
 * account state and roles are still resolved by the page the user lands on.
 */
export async function handleOAuthCallback({
  origin,
  searchParams,
  exchangeCode,
}: OAuthCallbackInput): Promise<URL> {
  const providerError = searchParams.get("error");
  if (providerError) {
    return signInError(origin, providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed");
  }

  const code = searchParams.get("code");
  if (!code || code.length > 512) return signInError(origin, "oauth_failed");

  let exchanged = false;
  try {
    exchanged = await exchangeCode(code);
  } catch {
    exchanged = false;
  }
  if (!exchanged) return signInError(origin, "oauth_failed");

  return appUrl(origin, safeAfterSignInPath(searchParams.get("next")));
}
