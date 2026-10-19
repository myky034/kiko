/**
 * Post-sign-in redirect targets (DEC-018). Only exact, known internal paths are
 * accepted; anything else (absolute URLs, protocol-relative `//host`, backslash
 * tricks, encoded slashes, other paths) falls back to the dashboard. Targets are
 * resolved against the configured app origin, never the request Host header.
 */

export const DEFAULT_AFTER_SIGN_IN = "/";

const ALLOWED_AFTER_SIGN_IN = new Set(["/", "/onboarding"]);

export function safeAfterSignInPath(candidate: unknown): string {
  if (typeof candidate !== "string") return DEFAULT_AFTER_SIGN_IN;
  return ALLOWED_AFTER_SIGN_IN.has(candidate) ? candidate : DEFAULT_AFTER_SIGN_IN;
}

/** Absolute URL on the app origin for an internal path. */
export function appUrl(origin: string, path: string): URL {
  const url = new URL(path, origin);
  if (url.origin !== new URL(origin).origin) {
    // Defensive: callers pass internal paths only.
    return new URL(DEFAULT_AFTER_SIGN_IN, origin);
  }
  return url;
}

/** Sign-in error codes the sign-in page may display; anything else is ignored. */
export const SIGN_IN_ERRORS = {
  oauth_cancelled: "Bạn đã hủy đăng nhập Google.",
  oauth_failed: "Không đăng nhập được bằng Google. Vui lòng thử lại.",
  config: "Kiko chưa được cấu hình đăng nhập. Hãy kiểm tra cấu hình máy chủ.",
} as const;

export type SignInErrorCode = keyof typeof SIGN_IN_ERRORS;

export function signInErrorMessage(code: unknown): string | null {
  return typeof code === "string" && Object.hasOwn(SIGN_IN_ERRORS, code)
    ? SIGN_IN_ERRORS[code as SignInErrorCode]
    : null;
}
