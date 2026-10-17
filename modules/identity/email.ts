/** Same normalization as the database CHECK on kiko.allowed_account.email. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
