import { getSessionId, supabase } from './supabase';
import type { QueueItem } from '@/playback/PlayUpPlaybackModule';

export async function recordPlay(item: QueueItem): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('play_history').insert({
    session_id: getSessionId(),
    track_id: item.id,
    title: item.title,
    artist: item.artist,
    artwork_url: item.artworkUrl,
    stream_url: item.url,
  });
  if (error) console.warn('recordPlay failed', error.message);
}

export type RecentPlay = {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  played_at: string;
};

export async function fetchRecent(limit = 10): Promise<RecentPlay[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('play_history')
    .select('id, track_id, title, artist, played_at')
    .eq('session_id', getSessionId())
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('fetchRecent failed', error.message);
    return [];
  }
  return data ?? [];
}
