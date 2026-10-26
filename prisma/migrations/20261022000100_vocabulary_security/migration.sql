-- KIKO-009 vocabulary: invariants, occurrence guard, grants and RLS
-- (PROJECT_SPEC FR04–FR05, DATA_MODEL §7, DEC-044). Hand-written; applied by
-- the migration identity, never by the web runtime.
--
-- Scope: every child row references its parent through a composite FK on
-- (id, owner_id, language_code) (see the vocabulary migration), so links across
-- owners or languages are rejected by the database. Counting follows DEC-022:
-- code points via char_length / kiko.content_length.

-- 1. Invariants ------------------------------------------------------------------

ALTER TABLE kiko.vocabulary_item
  ADD CONSTRAINT vocabulary_item_surface_check
    CHECK (char_length(surface) BETWEEN 1 AND 100 AND surface = btrim(surface)
           AND strpos(surface, E'\n') = 0 AND strpos(surface, E'\r') = 0),
  ADD CONSTRAINT vocabulary_item_surface_key_check CHECK (char_length(surface_key) BETWEEN 1 AND 100),
  ADD CONSTRAINT vocabulary_item_meaning_check
    CHECK (char_length(meaning) BETWEEN 1 AND 500 AND meaning = btrim(meaning)
           AND strpos(meaning, E'\n') = 0 AND strpos(meaning, E'\r') = 0),
  -- NULL-safe: IS NULL short-circuits, so UNKNOWN never lets a bad value through.
  ADD CONSTRAINT vocabulary_item_notes_check
    CHECK (notes IS NULL OR (kiko.content_length(notes) BETWEEN 1 AND 2000 AND notes = btrim(notes))),
  ADD CONSTRAINT vocabulary_item_usage_check
    CHECK (usage IS NULL OR (kiko.content_length(usage) BETWEEN 1 AND 500 AND usage = btrim(usage))),
  ADD CONSTRAINT vocabulary_item_tags_check CHECK (kiko.tags_valid(tags)),
  ADD CONSTRAINT vocabulary_item_client_request_id_check
    CHECK (client_request_id IS NULL OR char_length(client_request_id) BETWEEN 1 AND 64),
  ADD CONSTRAINT vocabulary_item_version_check CHECK (version >= 1);

ALTER TABLE kiko.pronunciation
  ADD CONSTRAINT pronunciation_notation_check CHECK (
    (language_code = 'zh' AND notation = 'pinyin')
    OR (language_code = 'ja' AND notation = 'kana')
    OR (language_code = 'en' AND notation = 'ipa')
  ),
  ADD CONSTRAINT pronunciation_value_check
    CHECK (char_length(value) BETWEEN 1 AND 200 AND value = btrim(value)
           AND strpos(value, E'\n') = 0 AND strpos(value, E'\r') = 0),
  ADD CONSTRAINT pronunciation_position_check CHECK (position BETWEEN 0 AND 4);

ALTER TABLE kiko.vocabulary_occurrence
  -- Offsets are code points into source_text, end exclusive; the selection is
  -- exactly that substring and has no surrounding whitespace.
  ADD CONSTRAINT vocabulary_occurrence_offsets_check
    CHECK (offset_start >= 0 AND offset_end > offset_start AND offset_end <= char_length(source_text)),
  ADD CONSTRAINT vocabulary_occurrence_selection_check
    CHECK (substring(source_text FROM offset_start + 1 FOR offset_end - offset_start) = selected_text
           AND selected_text !~ '^[[:space:]]' AND selected_text !~ '[[:space:]]$'),
  ADD CONSTRAINT vocabulary_occurrence_source_text_check CHECK (char_length(source_text) BETWEEN 1 AND 2000);

ALTER TABLE kiko.vocabulary_example
  ADD CONSTRAINT vocabulary_example_position_check CHECK (position BETWEEN 0 AND 4),
  ADD CONSTRAINT vocabulary_example_text_check
    CHECK (char_length(text) BETWEEN 1 AND 500 AND text = btrim(text)
           AND strpos(text, E'\n') = 0 AND strpos(text, E'\r') = 0),
  ADD CONSTRAINT vocabulary_example_reading_check
    CHECK (reading IS NULL OR (char_length(reading) BETWEEN 1 AND 500 AND reading = btrim(reading)
           AND strpos(reading, E'\n') = 0 AND strpos(reading, E'\r') = 0)),
  ADD CONSTRAINT vocabulary_example_translation_check
    CHECK (translation IS NULL OR (char_length(translation) BETWEEN 1 AND 500 AND translation = btrim(translation)
           AND strpos(translation, E'\n') = 0 AND strpos(translation, E'\r') = 0));

ALTER TABLE kiko.vocabulary_relation
  ADD CONSTRAINT vocabulary_relation_distinct_check CHECK (from_vocabulary_id <> to_vocabulary_id),
  ADD CONSTRAINT vocabulary_relation_kind_check CHECK (kind IN ('related', 'synonym', 'antonym'));

-- A relation is undirected: (a, b) and (b, a) are the same link.
CREATE UNIQUE INDEX vocabulary_relation_pair_key ON kiko.vocabulary_relation
  (LEAST(from_vocabulary_id, to_vocabulary_id), GREATEST(from_vocabulary_id, to_vocabulary_id));

ALTER TABLE kiko.deck
  ADD CONSTRAINT deck_title_check
    CHECK (char_length(title) BETWEEN 1 AND 100 AND title = btrim(title)
           AND strpos(title, E'\n') = 0 AND strpos(title, E'\r') = 0),
  ADD CONSTRAINT deck_version_check CHECK (version >= 1);

-- 2. Occurrence guard --------------------------------------------------------------
-- An occurrence points at a segment of a *published* version of the same lesson,
-- and its snapshot equals that segment's text. Draft segments are replaced on
-- every edit, so linking them would block editing (DEC-044). SQLSTATE 55000.

CREATE FUNCTION kiko.vocabulary_occurrence_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'vocabulary occurrences are immutable' USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM kiko.segment s
    JOIN kiko.transcript_version tv ON tv.id = s.transcript_version_id
    WHERE s.id = NEW.segment_id
      AND s.transcript_version_id = NEW.transcript_version_id
      AND tv.lesson_id = NEW.lesson_id
      AND tv.state = 'published'
      AND s.text = NEW.source_text
  ) THEN
    RAISE EXCEPTION 'an occurrence must reference a published segment of the same lesson with its exact text'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vocabulary_occurrence_guard
  BEFORE INSERT OR UPDATE ON kiko.vocabulary_occurrence
  FOR EACH ROW EXECUTE FUNCTION kiko.vocabulary_occurrence_guard();

-- 3. Privileges -----------------------------------------------------------------
-- owner_id and language_code are never updatable by the runtime; occurrences,
-- readings, examples, relations and deck memberships are insert/delete only.

REVOKE ALL ON kiko.vocabulary_item, kiko.pronunciation, kiko.vocabulary_occurrence, kiko.vocabulary_example,
              kiko.vocabulary_relation, kiko.deck, kiko.deck_item FROM PUBLIC;

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'REVOKE ALL ON kiko.vocabulary_item, kiko.pronunciation, kiko.vocabulary_occurrence, kiko.vocabulary_example, '
        'kiko.vocabulary_relation, kiko.deck, kiko.deck_item FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

GRANT SELECT, DELETE ON kiko.vocabulary_item TO kiko_app;
GRANT INSERT (owner_id, language_code, surface, surface_key, meaning, notes, usage, starred, tags,
              client_request_id, version, archived_at, created_at, updated_at) ON kiko.vocabulary_item TO kiko_app;
GRANT UPDATE (surface, surface_key, meaning, notes, usage, starred, tags, version, archived_at, updated_at)
  ON kiko.vocabulary_item TO kiko_app;

GRANT SELECT, DELETE ON kiko.pronunciation TO kiko_app;
GRANT INSERT (owner_id, vocabulary_id, language_code, notation, value, position) ON kiko.pronunciation TO kiko_app;

GRANT SELECT, DELETE ON kiko.vocabulary_occurrence TO kiko_app;
GRANT INSERT (owner_id, vocabulary_id, language_code, lesson_id, transcript_version_id, segment_id, source_text,
              selected_text, offset_start, offset_end, created_at) ON kiko.vocabulary_occurrence TO kiko_app;

GRANT SELECT, DELETE ON kiko.vocabulary_example TO kiko_app;
GRANT INSERT (owner_id, vocabulary_id, language_code, position, text, reading, translation)
  ON kiko.vocabulary_example TO kiko_app;

GRANT SELECT, DELETE ON kiko.vocabulary_relation TO kiko_app;
GRANT INSERT (owner_id, from_vocabulary_id, to_vocabulary_id, language_code, kind, created_at)
  ON kiko.vocabulary_relation TO kiko_app;

GRANT SELECT, DELETE ON kiko.deck TO kiko_app;
GRANT INSERT (owner_id, language_code, title, version, archived_at, created_at, updated_at) ON kiko.deck TO kiko_app;
GRANT UPDATE (title, version, archived_at, updated_at) ON kiko.deck TO kiko_app;

GRANT SELECT, DELETE ON kiko.deck_item TO kiko_app;
GRANT INSERT (deck_id, vocabulary_id, owner_id, language_code, added_at) ON kiko.deck_item TO kiko_app;

ALTER TABLE kiko.vocabulary_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.pronunciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.vocabulary_occurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.vocabulary_example ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.vocabulary_relation ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.deck ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.deck_item ENABLE ROW LEVEL SECURITY;

-- Ownership of rows is enforced by the application DAL (DEC-006); RLS blocks
-- every other database role.
CREATE POLICY kiko_app_all ON kiko.vocabulary_item FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.pronunciation FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.vocabulary_occurrence FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.vocabulary_example FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.vocabulary_relation FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.deck FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.deck_item FOR ALL TO kiko_app USING (true) WITH CHECK (true);
