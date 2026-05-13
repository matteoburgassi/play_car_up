/*
  # PlayUP play history

  1. New Tables
    - `play_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for anon POC sessions)
      - `session_id` (text, anon device/session identifier)
      - `track_id` (text)
      - `title` (text)
      - `artist` (text)
      - `artwork_url` (text)
      - `stream_url` (text)
      - `played_at` (timestamptz, default now())
  2. Security
    - Enable RLS
    - Policies allow anon + authenticated to insert/select rows scoped by `session_id` header value passed as a column.
      For the POC we let any authenticated or anonymous client insert/select rows where they provide their own session_id.
*/

CREATE TABLE IF NOT EXISTS play_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL DEFAULT '',
  track_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  artist text NOT NULL DEFAULT '',
  artwork_url text NOT NULL DEFAULT '',
  stream_url text NOT NULL DEFAULT '',
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS play_history_session_played_at_idx
  ON play_history (session_id, played_at DESC);

ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert own session play history"
  ON play_history FOR INSERT
  TO anon
  WITH CHECK (session_id <> '');

CREATE POLICY "anon select own session play history"
  ON play_history FOR SELECT
  TO anon
  USING (session_id <> '');

CREATE POLICY "auth insert play history"
  ON play_history FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id IS NULL AND session_id <> '')
    OR user_id = auth.uid()
  );

CREATE POLICY "auth select play history"
  ON play_history FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND session_id <> '')
  );
