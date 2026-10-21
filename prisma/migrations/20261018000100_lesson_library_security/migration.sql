-- KIKO-008 lesson library: invariants, immutability, grants and RLS
-- (DEC-020 … DEC-024). Hand-written; applied by the migration identity.
--
-- Counting rule (DEC-022): Unicode code points via char_length on a UTF-8
-- database; each CRLF counts once (CR and LF already count once). The same
-- rule is implemented in modules/content/segmentation.ts.

-- 1. Helper functions (IMMUTABLE, usable in CHECK constraints) ----------------

CREATE FUNCTION kiko.content_length(p_text text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT char_length(replace(p_text, E'\r\n', E'\n'));
$$;

-- Topics ("chủ đề", DEC-023): ≤ 5 distinct, non-null, trimmed, 1–32 code points.
CREATE FUNCTION kiko.tags_valid(p_tags text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT p_tags IS NOT NULL
    AND cardinality(p_tags) <= 5
    AND array_position(p_tags, NULL) IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p_tags) AS t(tag)
      WHERE char_length(t.tag) NOT BETWEEN 1 AND 32
         OR t.tag <> btrim(t.tag)
         OR strpos(t.tag, E'\n') > 0
         OR strpos(t.tag, E'\r') > 0
    )
    AND cardinality(p_tags) = (SELECT count(DISTINCT t.tag) FROM unnest(p_tags) AS t(tag));
$$;

-- 2. Invariants ------------------------------------------------------------------

ALTER TABLE kiko.lesson
  ADD CONSTRAINT lesson_title_check
    CHECK (char_length(title) BETWEEN 1 AND 200 AND title = btrim(title)
           AND strpos(title, E'\n') = 0 AND strpos(title, E'\r') = 0),
  ADD CONSTRAINT lesson_source_note_check
    CHECK (source_note IS NULL OR (kiko.content_length(source_note) BETWEEN 1 AND 1000 AND source_note = btrim(source_note))),
  ADD CONSTRAINT lesson_level_label_check
    CHECK (level_label IS NULL OR (char_length(level_label) BETWEEN 1 AND 32 AND level_label = btrim(level_label)
           AND strpos(level_label, E'\n') = 0 AND strpos(level_label, E'\r') = 0)),
  ADD CONSTRAINT lesson_tags_check CHECK (kiko.tags_valid(tags)),
  ADD CONSTRAINT lesson_client_request_id_check
    CHECK (client_request_id IS NULL OR char_length(client_request_id) BETWEEN 1 AND 64),
  ADD CONSTRAINT lesson_version_check CHECK (version >= 1),
  -- NULL-safe: IS NULL never yields UNKNOWN.
  ADD CONSTRAINT lesson_archived_check CHECK ((status = 'archived') = (archived_at IS NOT NULL)),
  ADD CONSTRAINT lesson_ready_check CHECK (status <> 'ready' OR active_transcript_id IS NOT NULL);

ALTER TABLE kiko.transcript_version
  ADD CONSTRAINT transcript_version_no_check CHECK (version_no >= 1),
  ADD CONSTRAINT transcript_version_rule_check CHECK (segmentation_rule IN ('line-v1')),
  ADD CONSTRAINT transcript_version_source_length_check CHECK (kiko.content_length(source_text) <= 100000),
  ADD CONSTRAINT transcript_version_published_check CHECK ((state = 'published') = (published_at IS NOT NULL));

-- At most one draft revision per lesson.
CREATE UNIQUE INDEX transcript_version_one_draft_per_lesson
  ON kiko.transcript_version (lesson_id) WHERE state = 'draft';

ALTER TABLE kiko.segment
  ADD CONSTRAINT segment_position_check CHECK (position BETWEEN 0 AND 1999),
  ADD CONSTRAINT segment_text_check
    CHECK (char_length(text) BETWEEN 1 AND 2000 AND strpos(text, E'\n') = 0 AND strpos(text, E'\r') = 0);

-- 3. Immutability and lifecycle guards ------------------------------------------
-- Errors use SQLSTATE 55000 (object_not_in_prerequisite_state).

CREATE FUNCTION kiko.transcript_version_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Allowed only as part of deleting the whole lesson (the lesson row is
    -- already gone when the cascade reaches its versions).
    IF EXISTS (SELECT 1 FROM kiko.lesson l WHERE l.id = OLD.lesson_id) THEN
      RAISE EXCEPTION 'transcript versions are deleted only with their lesson' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.state = 'published' THEN
    RAISE EXCEPTION 'published transcript versions are immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.lesson_id <> OLD.lesson_id OR NEW.owner_id <> OLD.owner_id OR NEW.version_no <> OLD.version_no
     OR NEW.segmentation_rule <> OLD.segmentation_rule THEN
    RAISE EXCEPTION 'transcript version identity is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transcript_version_guard
  BEFORE UPDATE OR DELETE ON kiko.transcript_version
  FOR EACH ROW EXECUTE FUNCTION kiko.transcript_version_guard();

CREATE FUNCTION kiko.segment_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_state kiko.transcript_state;
BEGIN
  SELECT tv.state INTO v_state
  FROM kiko.transcript_version tv
  WHERE tv.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.transcript_version_id ELSE NEW.transcript_version_id END;

  -- Parent already removed: cascade from deleting the lesson.
  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF v_state = 'published' THEN
    RAISE EXCEPTION 'segments of a published transcript version are immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER segment_guard
  BEFORE INSERT OR UPDATE OR DELETE ON kiko.segment
  FOR EACH ROW EXECUTE FUNCTION kiko.segment_guard();

CREATE FUNCTION kiko.lesson_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id <> OLD.owner_id THEN
      RAISE EXCEPTION 'lesson owner is immutable' USING ERRCODE = '55000';
    END IF;
    IF NEW.language_code <> OLD.language_code AND EXISTS (
      SELECT 1 FROM kiko.transcript_version tv WHERE tv.lesson_id = OLD.id AND tv.state = 'published'
    ) THEN
      RAISE EXCEPTION 'lesson language is locked after the first publish' USING ERRCODE = '55000';
    END IF;
  END IF;
  IF NEW.active_transcript_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.active_transcript_id IS DISTINCT FROM OLD.active_transcript_id)
     AND NOT EXISTS (
       SELECT 1 FROM kiko.transcript_version tv
       WHERE tv.id = NEW.active_transcript_id AND tv.state = 'published'
     ) THEN
    RAISE EXCEPTION 'the active transcript must be a published version' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_guard
  BEFORE INSERT OR UPDATE ON kiko.lesson
  FOR EACH ROW EXECUTE FUNCTION kiko.lesson_guard();

-- 4. Privileges -------------------------------------------------------------------

REVOKE ALL ON kiko.lesson, kiko.transcript_version, kiko.segment FROM PUBLIC;
REVOKE ALL ON FUNCTION kiko.content_length(text), kiko.tags_valid(text[]) FROM PUBLIC;

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON kiko.lesson, kiko.transcript_version, kiko.segment FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON FUNCTION kiko.content_length(text), kiko.tags_valid(text[]) FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

-- CHECK constraints call these as the writing role.
GRANT EXECUTE ON FUNCTION kiko.content_length(text), kiko.tags_valid(text[]) TO kiko_app;

-- Lessons: owner_id is never updatable by the runtime.
GRANT SELECT, DELETE ON kiko.lesson TO kiko_app;
GRANT INSERT (owner_id, language_code, title, status, source_note, tags, level_label, active_transcript_id,
              client_request_id, version, archived_at, created_at, updated_at) ON kiko.lesson TO kiko_app;
GRANT UPDATE (language_code, title, status, source_note, tags, level_label, active_transcript_id,
              version, archived_at, updated_at) ON kiko.lesson TO kiko_app;

-- Versions: no DELETE (removed only with the lesson, via cascade as owner).
GRANT SELECT ON kiko.transcript_version TO kiko_app;
GRANT INSERT (lesson_id, owner_id, language_code, version_no, state, source_text, segmentation_rule,
              created_at, published_at) ON kiko.transcript_version TO kiko_app;
GRANT UPDATE (state, published_at, source_text) ON kiko.transcript_version TO kiko_app;

-- Segments: replaced while the version is a draft; never updated in place.
GRANT SELECT, DELETE ON kiko.segment TO kiko_app;
GRANT INSERT (transcript_version_id, owner_id, language_code, position, text) ON kiko.segment TO kiko_app;

ALTER TABLE kiko.lesson ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.transcript_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.segment ENABLE ROW LEVEL SECURITY;

-- Ownership of rows is enforced by the application DAL (DEC-006); RLS blocks
-- every other database role.
CREATE POLICY kiko_app_all ON kiko.lesson FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.transcript_version FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_all ON kiko.segment FOR ALL TO kiko_app USING (true) WITH CHECK (true);
