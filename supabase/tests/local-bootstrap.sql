-- Minimal Supabase platform fixtures for disposable PostgreSQL only.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::UUID $$;
CREATE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$ SELECT '{}'::JSONB $$;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO service_role;
