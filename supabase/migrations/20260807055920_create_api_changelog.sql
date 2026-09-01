/*
# Create API version changelog table

## Purpose
Tracks API version changes so the mobile/PWA app can detect when a new
version is available and gracefully handle backwards-incompatible changes.
Older installed app versions can read the changelog to show users what
changed and prompt them to update.

## New Tables
- `api_versions`
  - `id` (serial, primary key)
  - `version` (text, unique) — semver string e.g. "v1.2.0"
  - `released_at` (timestamptz) — when this version went live
  - `summary` (text) — short one-line description
  - `changes` (jsonb) — structured list of changes: [{ type, description }]
  - `breaking` (boolean) — whether this version has breaking changes
  - `min_app_version` (text) — minimum app build that can use this API version
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled. Any authenticated user can read the changelog.
- Only service role can insert/update (via edge functions or migrations).
*/

CREATE TABLE IF NOT EXISTS api_versions (
  id serial PRIMARY KEY,
  version text UNIQUE NOT NULL,
  released_at timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  breaking boolean NOT NULL DEFAULT false,
  min_app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_api_versions" ON api_versions;
CREATE POLICY "select_api_versions"
ON api_versions FOR SELECT
TO authenticated USING (true);

INSERT INTO api_versions (version, summary, changes, breaking, min_app_version)
VALUES
  ('v1.0.0', 'Initial API release', '[{"type":"added","description":"Dashboard endpoint with agency stats, arrears trend, and expiring leases"},{"type":"added","description":"Full CRUD for properties, leases, contacts, payments, and rent reviews"}]'::jsonb, false, '1.0.0')
ON CONFLICT (version) DO NOTHING;

INSERT INTO api_versions (version, summary, changes, breaking, min_app_version)
VALUES
  ('v1.1.0', 'Added rent reviews and occupancy metrics', '[{"type":"added","description":"Rent reviews CRUD with approval workflow"},{"type":"added","description":"Occupancy rate and pending rent reviews in dashboard stats"},{"type":"changed","description":"Dashboard response now includes arrears_trend and expiring_leases arrays"}]'::jsonb, false, '1.0.0')
ON CONFLICT (version) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_api_versions_released_at ON api_versions (released_at DESC);
