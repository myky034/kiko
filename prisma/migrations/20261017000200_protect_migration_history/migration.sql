-- Protect Prisma Migrate's history table (DEC-016).
--
-- Prisma keeps applied migrations in public._prisma_migrations. On Supabase,
-- default privileges grant every new table in `public` to anon, authenticated
-- and service_role, and the Data API exposes `public`, so the history would be
-- readable and writable with the publishable key. Remove those grants and
-- enable RLS without policies. The migration identity owns the table and is
-- unaffected (RLS is not forced on the owner).

DO $$
DECLARE
  api_role text;
BEGIN
  IF to_regclass('public._prisma_migrations') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public._prisma_migrations FROM PUBLIC;

  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON public._prisma_migrations FROM %I', api_role);
    END IF;
  END LOOP;
END
$$;
