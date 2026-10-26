import "server-only";
import type { VocabularyRepository } from "@/modules/vocabulary/types";
import { createPrismaVocabularyRepository } from "@/server/db/vocabulary-repository";
import { getPrisma } from "@/server/db/prisma";

export function getVocabularyRepository(): VocabularyRepository {
  return createPrismaVocabularyRepository(getPrisma);
}
