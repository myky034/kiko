/**
 * PLACEHOLDER — sample values for Library UI that has no data model yet
 * (owner request, DEC-035). Replace each entry when the feature exists; nothing
 * here describes the learner's real lessons, and nothing here may be written
 * back or used for decisions.
 *
 * - categories: content-type tabs (no content types yet; only "All" is real)
 * - skills: skill catalogue and lesson counts (no skill model yet)
 * - levels / skillOptions: filter values for the disabled Level and Skill dropdowns
 */

export type SkillKey = "vocabulary" | "reading" | "listening" | "speaking";

export const LIBRARY_PLACEHOLDERS = {
  categories: [
    { key: "all", title: "All Content", body: "Browse everything" },
    { key: "vocabulary", title: "Vocabulary", body: "Build your word bank" },
    { key: "reading", title: "Reading", body: "Read and understand" },
    { key: "listening", title: "Listening", body: "Listen and train" },
    { key: "speaking", title: "Speaking", body: "Practice and speak" },
  ],
  skills: [
    { key: "vocabulary", title: "Vocabulary", body: "Word lists, flashcards, and practice", count: 120 },
    { key: "reading", title: "Reading", body: "Short texts, articles, and comprehension", count: 80 },
    { key: "listening", title: "Listening", body: "Audio lessons and listening practice", count: 65 },
    { key: "speaking", title: "Speaking", body: "Conversations, pronunciation, and speaking drills", count: 70 },
  ],
  levels: "All Levels",
  skillOptions: "All Skills",
} as const satisfies {
  categories: readonly { key: string; title: string; body: string }[];
  skills: readonly { key: SkillKey; title: string; body: string; count: number }[];
  levels: string;
  skillOptions: string;
};
