import { z } from "zod";
import { parseTags } from "@/modules/content/lesson-input";
import { codePointLength, contentLength } from "@/modules/content/segmentation";
import { en } from "@/modules/i18n/en";
import type { RelationKind, VocabularyInput } from "./types";

/** Limits in code points (DEC-022); mirrored by the vocabulary_security CHECKs. */
export const VOCABULARY_LIMITS = {
  surface: 100,
  meaning: 500,
  notes: 2_000,
  usage: 500,
  readings: 5,
  reading: 200,
  examples: 5,
  example: 500,
  decksPerWord: 20,
  relations: 20,
  deckTitle: 100,
} as const;

export type VocabularyField =
  | "surface"
  | "meaning"
  | "readings"
  | "notes"
  | "usage"
  | "tags"
  | "examples"
  | "decks"
  | "selection"
  | "form";

export type VocabularyFormErrors = Partial<Record<VocabularyField, string>>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: VocabularyFormErrors };

const copy = en.vocabulary;
const LINE_BREAK = /[\r\n]/;
const uuidSchema = z.uuid();

const WORD_FIELDS = [
  "surface",
  "meaning",
  "reading",
  "notes",
  "usage",
  "tags",
  "starred",
  "exampleText",
  "exampleReading",
  "exampleTranslation",
  "deckId",
] as const;

function isFrameworkField(name: string): boolean {
  return name.startsWith("$ACTION");
}

export function hasOnlyAllowed(formData: FormData, fields: readonly string[]): boolean {
  const allowed = new Set(fields);
  return [...new Set(formData.keys())].every((name) => allowed.has(name) || isFrameworkField(name));
}

function single(formData: FormData, name: string): string | null {
  const values = formData.getAll(name);
  if (values.length !== 1 || typeof values[0] !== "string") return null;
  return values[0];
}

function all(formData: FormData, name: string): string[] | null {
  const values = formData.getAll(name);
  return values.every((value) => typeof value === "string") ? (values as string[]) : null;
}

/** Trimmed single-line text; null when empty and optional. */
function line(label: string, raw: string | null, max: number, optional: boolean): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = (raw ?? "").trim();
  if (value.length === 0) return optional ? { ok: true, value: null } : { ok: false, error: copy.errors.required(label) };
  if (LINE_BREAK.test(value)) return { ok: false, error: copy.errors.noLineBreaks(label) };
  if (codePointLength(value) > max) return { ok: false, error: copy.errors.tooLong(label, max) };
  return { ok: true, value };
}

/** Trimmed multi-line text; null when empty. */
function block(label: string, raw: string | null, max: number): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = (raw ?? "").trim();
  if (value.length === 0) return { ok: true, value: null };
  if (contentLength(value) > max) return { ok: false, error: copy.errors.tooLong(label, max) };
  return { ok: true, value };
}

export type ParsedWordForm = { word: VocabularyInput; deckIds: string[] };

/**
 * Parses the word form with an explicit allowlist (`extraFields` adds e.g.
 * clientRequestId / expectedVersion). Empty reading/example rows are dropped.
 * `surfaceFallback` fills an empty surface (the selected text when saving from a lesson).
 */
export function parseWordForm(
  formData: FormData,
  extraFields: readonly string[],
  surfaceFallback?: string,
): ParseResult<ParsedWordForm> {
  if (!hasOnlyAllowed(formData, [...WORD_FIELDS, ...extraFields])) {
    return { ok: false, errors: { form: en.form.invalidFields } };
  }
  const errors: VocabularyFormErrors = {};

  const surfaceRaw = single(formData, "surface");
  const surface = line(copy.surface, surfaceRaw && surfaceRaw.trim() ? surfaceRaw : (surfaceFallback ?? surfaceRaw), VOCABULARY_LIMITS.surface, false);
  if (!surface.ok) errors.surface = surface.error;

  const meaning = line(copy.meaning, single(formData, "meaning"), VOCABULARY_LIMITS.meaning, false);
  if (!meaning.ok) errors.meaning = meaning.error;

  const readings: string[] = [];
  for (const raw of all(formData, "reading") ?? []) {
    const reading = line("Reading", raw, VOCABULARY_LIMITS.reading, true);
    if (!reading.ok) errors.readings = reading.error;
    else if (reading.value && !readings.includes(reading.value)) readings.push(reading.value);
  }
  if (readings.length > VOCABULARY_LIMITS.readings) errors.readings = copy.errors.tooMany("readings", VOCABULARY_LIMITS.readings);

  const notes = block(copy.notes, single(formData, "notes"), VOCABULARY_LIMITS.notes);
  if (!notes.ok) errors.notes = notes.error;
  const usage = block(copy.usage, single(formData, "usage"), VOCABULARY_LIMITS.usage);
  if (!usage.ok) errors.usage = usage.error;

  const tags = parseTags(single(formData, "tags") ?? "");
  if (!tags.ok) errors.tags = tags.error;

  const starredRaw = formData.getAll("starred");
  if (starredRaw.length > 1 || (starredRaw.length === 1 && starredRaw[0] !== "on")) errors.form = en.form.invalidFields;

  const texts = all(formData, "exampleText") ?? [];
  const exampleReadings = all(formData, "exampleReading") ?? [];
  const translations = all(formData, "exampleTranslation") ?? [];
  if (exampleReadings.length > texts.length || translations.length > texts.length) errors.form = en.form.invalidFields;
  const examples: VocabularyInput["examples"] = [];
  texts.forEach((rawText, index) => {
    const text = line(copy.exampleText, rawText, VOCABULARY_LIMITS.example, true);
    const reading = line(copy.exampleReading, exampleReadings[index] ?? "", VOCABULARY_LIMITS.example, true);
    const translation = line(copy.exampleTranslation, translations[index] ?? "", VOCABULARY_LIMITS.example, true);
    for (const result of [text, reading, translation]) if (!result.ok) errors.examples = result.error;
    if (text.ok && text.value && reading.ok && translation.ok) {
      examples.push({ text: text.value, reading: reading.value, translation: translation.value });
    } else if (text.ok && !text.value && ((reading.ok && reading.value) || (translation.ok && translation.value))) {
      errors.examples = copy.errors.required(copy.exampleText);
    }
  });
  if (examples.length > VOCABULARY_LIMITS.examples) errors.examples = copy.errors.tooMany("examples", VOCABULARY_LIMITS.examples);

  const deckIds = [...new Set(all(formData, "deckId") ?? [])];
  if (deckIds.some((id) => !uuidSchema.safeParse(id).success)) errors.decks = copy.errors.unknownDeck;
  if (deckIds.length > VOCABULARY_LIMITS.decksPerWord) errors.decks = copy.errors.tooMany("decks", VOCABULARY_LIMITS.decksPerWord);

  if (Object.keys(errors).length > 0 || !surface.ok || !meaning.ok || !notes.ok || !usage.ok || !tags.ok) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      word: {
        surface: surface.value!,
        meaning: meaning.value!,
        notes: notes.value,
        usage: usage.value,
        tags: tags.tags,
        starred: starredRaw.length === 1,
        readings,
        examples,
      },
      deckIds,
    },
  };
}

export function parseUuid(value: unknown): string | null {
  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parsePositiveInt(raw: string | null, max = 2_147_483_647): number | null {
  if (raw === null || !/^\d{1,10}$/.test(raw)) return null;
  const value = Number(raw);
  return value <= max ? value : null;
}

export function field(formData: FormData, name: string): string | null {
  return single(formData, name);
}

export function parseDeckTitle(formData: FormData): { ok: true; value: string } | { ok: false; error: string } {
  const title = line(copy.decks, single(formData, "title"), VOCABULARY_LIMITS.deckTitle, false);
  return title.ok ? { ok: true, value: title.value! } : title;
}

export function parseRelationKind(raw: string | null): RelationKind | null {
  return raw === "related" || raw === "synonym" || raw === "antonym" ? raw : null;
}
