import { z } from "zod";

/** Same normalization as the database CHECK on kiko.allowed_account.email. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .max(320)
  .pipe(z.email())
  .transform(normalizeEmail);

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/);
