/*
# Create backup log table

## Purpose
Records database backup events so admins can see when backups were
triggered, what tables were included, and the row counts at backup time.

## New Tables
- `backup_log`
  - `id` (serial, primary key)
  - `triggered_by` (uuid) — the user who triggered the backup
  - `status` (text) — "completed" | "failed" | "in_progress"
  - `tables_backed_up` (jsonb) — array of table names
  - `row_counts` (jsonb) — { table_name: row_count }
  - `total_rows` (integer) — sum of all row counts
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled. Only authenticated users can read backup logs.
- Only service role can insert (via edge function).
*/

CREATE TABLE IF NOT EXISTS backup_log (
  id serial PRIMARY KEY,
  triggered_by uuid,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'in_progress')),
  tables_backed_up jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_rows integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backup_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_backup_log" ON backup_log;
CREATE POLICY "select_backup_log"
ON backup_log FOR SELECT
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_backup_log_created_at ON backup_log (created_at DESC);
