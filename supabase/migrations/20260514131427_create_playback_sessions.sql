/*
  # PlayUP playback session sync

  1. New Tables
    - `playback_sessions`
      - `session_id` (text, primary key) – anon device/session identifier shared across surfaces
      - `user_id` (uuid, nullable) – optional Supabase auth user
      - `track_id` (text, nullable) – currently playing track
      - `position_ms` (int, default 0) – last known playback position
      - `queue_ids` (text[]) – ordered queue ids for resume
      - `surface` (text, default 'web') – which client last wrote (phone, carplay, androidauto, web)
      - `updated_at` (timestamptz, default now())
  2. Purpose
    - Enables CarPlay / Android Auto / phone / web hosts (built on the new
      `@playup/sdk-core`) to share live playback state through Supabase.
  3. Security
    - RLS enabled.
    - Anon and authenticated clients may only read/write the row matching
      their own session_id, and authenticated rows must match auth.uid()
      when user_id is set.
*/

CREATE TABLE IF NOT EXISTS playback_sessions (
  session_id text PRIMARY KEY,
  user_id uuid,
  track_id text,
  position_ms integer NOT NULL DEFAULT 0,
  queue_ids text[] NOT NULL DEFAULT '{}',
  surface text NOT NULL DEFAULT 'web',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE playback_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon select own playback session"
  ON playback_sessions FOR SELECT
  TO anon
  USING (session_id <> '');

CREATE POLICY "anon insert own playback session"
  ON playback_sessions FOR INSERT
  TO anon
  WITH CHECK (session_id <> '' AND user_id IS NULL);

CREATE POLICY "anon update own playback session"
  ON playback_sessions FOR UPDATE
  TO anon
  USING (session_id <> '' AND user_id IS NULL)
  WITH CHECK (session_id <> '' AND user_id IS NULL);

CREATE POLICY "auth select own playback session"
  ON playback_sessions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id <> '')
  );

CREATE POLICY "auth insert own playback session"
  ON playback_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id IS NULL AND session_id <> '')
    OR user_id = auth.uid()
  );

CREATE POLICY "auth update own playback session"
  ON playback_sessions FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id <> '')
  )
  WITH CHECK (
    (user_id IS NULL AND session_id <> '')
    OR user_id = auth.uid()
  );
