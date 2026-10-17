-- Kiko identity security layer (hand-written; DEC-006, DEC-007).
--
-- Applied by the migration identity (DIRECT_URL, `postgres`), never by the web
-- runtime. Prisma cannot model these objects, so they are versioned here:
--   1. CHECK constraints for invariants not expressible in schema.prisma
--   2. Reference data (languages, roles)
--   3. kiko_app runtime role (NOLOGIN here; an operator sets LOGIN + password)
--   4. Least-privilege grants, revocations and RLS
--   5. Controlled admission functions (SECURITY DEFINER)
--
-- Ownership of individual rows is enforced by the application DAL; kiko_app
-- policies are table-wide. RLS here blocks every other database role.

-- 1. Invariants --------------------------------------------------------------

ALTER TABLE kiko.language
  ADD CONSTRAINT language_code_check CHECK (code IN ('zh', 'ja', 'en'));

ALTER TABLE kiko.role
  ADD CONSTRAINT role_code_check CHECK (code IN ('OWNER', 'LEARNER'));

ALTER TABLE kiko.user_profile
  ADD CONSTRAINT user_profile_provider_check CHECK (auth_provider IN ('supabase')),
  ADD CONSTRAINT user_profile_subject_check CHECK (length(btrim(auth_subject)) BETWEEN 1 AND 255),
  ADD CONSTRAINT user_profile_revision_check CHECK (authorization_revision >= 1),
  ADD CONSTRAINT user_profile_version_check CHECK (version >= 1),
  ADD CONSTRAINT user_profile_interface_language_check CHECK (interface_language IN ('vi')),
  -- IANA validity is checked by the application; the database bounds the value.
  ADD CONSTRAINT user_profile_timezone_check CHECK (timezone IS NULL OR length(timezone) BETWEEN 1 AND 64),
  -- An onboarded profile always has a timezone (NULL-safe: IS NULL never yields UNKNOWN).
  ADD CONSTRAINT user_profile_onboarded_timezone_check CHECK (onboarded_at IS NULL OR timezone IS NOT NULL);

ALTER TABLE kiko.allowed_account
  ADD CONSTRAINT allowed_account_provider_check CHECK (auth_provider IN ('supabase')),
  ADD CONSTRAINT allowed_account_email_check
    CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320 AND email LIKE '_%@_%'),
  -- Subject and user are bound together or not at all.
  ADD CONSTRAINT allowed_account_binding_check CHECK ((bound_subject IS NULL) = (bound_user_id IS NULL));

ALTER TABLE kiko.audit_event
  ADD CONSTRAINT audit_event_action_check CHECK (length(action) BETWEEN 1 AND 100),
  ADD CONSTRAINT audit_event_result_check CHECK (result IN ('success', 'denied', 'failure'));

-- 2. Reference data ----------------------------------------------------------

INSERT INTO kiko.language (code) VALUES ('zh'), ('ja'), ('en') ON CONFLICT DO NOTHING;
INSERT INTO kiko.role (code) VALUES ('OWNER'), ('LEARNER') ON CONFLICT DO NOTHING;

-- 3. Runtime role ------------------------------------------------------------
-- Created without LOGIN so no credential lives in Git. An operator enables it:
--   ALTER ROLE kiko_app WITH LOGIN PASSWORD '<generated secret>';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kiko_app') THEN
    CREATE ROLE kiko_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

-- 4. Privileges ----------------------------------------------------------------

REVOKE ALL ON SCHEMA kiko FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA kiko FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA kiko FROM PUBLIC;

-- Supabase API roles must never reach Kiko tables, even if the schema is
-- exposed later. Guarded so the migration also runs on plain PostgreSQL.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA kiko FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA kiko FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA kiko FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

GRANT USAGE ON SCHEMA kiko TO kiko_app;

GRANT SELECT ON kiko.language, kiko.role TO kiko_app;

-- Profiles: read; update preference columns only. State, roles, revision and
-- identity binding are not writable by the runtime (no self-escalation path).
GRANT SELECT ON kiko.user_profile TO kiko_app;
GRANT UPDATE (timezone, onboarded_at, version, updated_at) ON kiko.user_profile TO kiko_app;

GRANT SELECT ON kiko.user_role TO kiko_app;

GRANT SELECT ON kiko.user_language_preference TO kiko_app;
GRANT INSERT (user_id, language_code, enabled, created_at, updated_at) ON kiko.user_language_preference TO kiko_app;
GRANT UPDATE (enabled, updated_at) ON kiko.user_language_preference TO kiko_app;

-- Audit: append only.
GRANT INSERT (occurred_at, actor_user_id, action, target_type, target_id, result) ON kiko.audit_event TO kiko_app;
GRANT USAGE ON SEQUENCE kiko.audit_event_id_seq TO kiko_app;

-- allowed_account / allowed_account_role: no runtime grants. Admission goes
-- through the functions below; administration uses the operator identity.

ALTER TABLE kiko.language ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.role ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.allowed_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.allowed_account_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.user_language_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiko.audit_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY kiko_app_read ON kiko.language FOR SELECT TO kiko_app USING (true);
CREATE POLICY kiko_app_read ON kiko.role FOR SELECT TO kiko_app USING (true);
CREATE POLICY kiko_app_read ON kiko.user_profile FOR SELECT TO kiko_app USING (true);
CREATE POLICY kiko_app_update ON kiko.user_profile FOR UPDATE TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_read ON kiko.user_role FOR SELECT TO kiko_app USING (true);
CREATE POLICY kiko_app_all ON kiko.user_language_preference FOR ALL TO kiko_app USING (true) WITH CHECK (true);
CREATE POLICY kiko_app_insert ON kiko.audit_event FOR INSERT TO kiko_app WITH CHECK (true);

-- 5. Admission functions -------------------------------------------------------
-- SECURITY DEFINER with an empty search_path and fully qualified names. The
-- caller (web runtime) must already have verified the provider session and that
-- the email is confirmed; these functions only decide Kiko admission.

-- Whether an email may receive a sign-in code. Lets the sign-in form avoid
-- creating provider identities for addresses that were never admitted.
CREATE FUNCTION kiko.is_email_admissible(p_auth_provider text, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM kiko.allowed_account a
    WHERE a.auth_provider = p_auth_provider
      AND a.email = lower(btrim(p_email))
      AND a.status = 'active'
  );
$$;

-- Returns the Kiko user id for a verified provider identity, creating the
-- profile and copying admitted roles on first sign-in. Returns NULL when the
-- identity is not admitted. Idempotent and safe under concurrent first logins.
CREATE FUNCTION kiko.admit_identity(p_auth_provider text, p_auth_subject text, p_email text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id uuid;
  v_bound_subject text;
  v_admitted_by uuid;
  v_user_id uuid;
BEGIN
  IF p_auth_subject IS NULL OR length(btrim(p_auth_subject)) = 0 OR p_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- Existing profile: identity is already bound; state is checked by the caller.
  SELECT p.id INTO v_user_id
  FROM kiko.user_profile p
  WHERE p.auth_provider = p_auth_provider AND p.auth_subject = p_auth_subject;
  IF FOUND THEN
    RETURN v_user_id;
  END IF;

  -- Lock the admission row so concurrent first sign-ins serialize.
  SELECT a.id, a.bound_subject, a.admitted_by
    INTO v_account_id, v_bound_subject, v_admitted_by
  FROM kiko.allowed_account a
  WHERE a.auth_provider = p_auth_provider
    AND a.email = lower(btrim(p_email))
    AND a.status = 'active'
  FOR UPDATE;

  IF NOT FOUND OR (v_bound_subject IS NOT NULL AND v_bound_subject <> p_auth_subject) THEN
    INSERT INTO kiko.audit_event (action, target_type, result)
    VALUES ('account.admission', 'user_profile', 'denied');
    RETURN NULL;
  END IF;

  BEGIN
    INSERT INTO kiko.user_profile (auth_provider, auth_subject, state)
    VALUES (p_auth_provider, p_auth_subject, 'active')
    RETURNING id INTO v_user_id;
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent request admitted the same identity first.
    SELECT p.id INTO v_user_id
    FROM kiko.user_profile p
    WHERE p.auth_provider = p_auth_provider AND p.auth_subject = p_auth_subject;
    RETURN v_user_id;
  END;

  INSERT INTO kiko.user_role (user_id, role_code, assigned_by)
  SELECT v_user_id, r.role_code, v_admitted_by
  FROM kiko.allowed_account_role r
  WHERE r.allowed_account_id = v_account_id;

  UPDATE kiko.allowed_account
  SET bound_subject = p_auth_subject, bound_user_id = v_user_id, updated_at = now()
  WHERE id = v_account_id;

  INSERT INTO kiko.audit_event (actor_user_id, action, target_type, target_id, result)
  VALUES (v_user_id, 'account.admission', 'user_profile', v_user_id::text, 'success');

  RETURN v_user_id;
END;
$$;

-- Functions are executable by PUBLIC by default; restrict to the runtime role.
REVOKE ALL ON FUNCTION kiko.is_email_admissible(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION kiko.admit_identity(text, text, text) FROM PUBLIC;

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION kiko.is_email_admissible(text, text) FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON FUNCTION kiko.admit_identity(text, text, text) FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION kiko.is_email_admissible(text, text) TO kiko_app;
GRANT EXECUTE ON FUNCTION kiko.admit_identity(text, text, text) TO kiko_app;
