-- Kiko profile preferences (DEC-037; resolves OPEN-010, persists DEC-036).
--
-- Applied by the migration identity (DIRECT_URL), never by the web runtime.
--   1. user_profile.interface_language accepts 'en' (the UI language, DEC-029)
--      and defaults to it; existing rows only ever held the old default 'vi'.
--   2. user_profile.display_name: name shown in the account menu. Seeded once
--      from the verified Google profile, editable later; display only.
--   3. user_profile.current_learning_language: the header switcher's choice.
--      A composite FK keeps it one of the user's own language preferences.
--   4. GIN index on lesson.tags for topic browsing/counts.
--   5. Column-level grants for the runtime role (no other privilege changes).

-- Prisma-managed schema ---------------------------------------------------------

ALTER TABLE "kiko"."user_profile"
  ADD COLUMN "display_name" TEXT,
  ADD COLUMN "current_learning_language" TEXT,
  ALTER COLUMN "interface_language" SET DEFAULT 'en';

CREATE INDEX "lesson_tags_idx" ON "kiko"."lesson" USING GIN ("tags");

-- Invariants (hand-written) --------------------------------------------------------

ALTER TABLE kiko.user_profile DROP CONSTRAINT user_profile_interface_language_check;

UPDATE kiko.user_profile SET interface_language = 'en' WHERE interface_language = 'vi';

ALTER TABLE kiko.user_profile
  ADD CONSTRAINT user_profile_interface_language_check CHECK (interface_language IN ('en', 'vi')),
  -- NULL-safe: IS NULL short-circuits, so UNKNOWN never passes a bad value.
  ADD CONSTRAINT user_profile_display_name_check CHECK (
    display_name IS NULL
    OR (char_length(display_name) BETWEEN 1 AND 80
        AND display_name = btrim(display_name)
        AND display_name !~ '[[:cntrl:]]')
  ),
  -- The current learning language must be one of this user's preference rows.
  -- MATCH SIMPLE: a NULL language skips the check. Deleting the preference row
  -- clears only the language column (PostgreSQL 15+ column list).
  ADD CONSTRAINT user_profile_current_learning_language_fkey
    FOREIGN KEY (id, current_learning_language)
    REFERENCES kiko.user_language_preference (user_id, language_code)
    ON UPDATE NO ACTION
    ON DELETE SET NULL (current_learning_language);

-- Runtime privileges ---------------------------------------------------------------
-- interface_language stays read-only for kiko_app until a language switcher exists.

GRANT UPDATE (display_name, current_learning_language) ON kiko.user_profile TO kiko_app;
