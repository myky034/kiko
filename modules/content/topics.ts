import type { LessonSummary } from "./types";

export type TopicCount = { tag: string; count: number };

/** Most-used tags across the given lessons (ties alphabetical), for "Browse by Topic". */
export function topicsOf(lessons: readonly LessonSummary[], limit = 6): TopicCount[] {
  const counts = new Map<string, number>();
  for (const lesson of lessons) for (const tag of lesson.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
