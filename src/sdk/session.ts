/**
 * PlayUpSession: cross-surface session state, persisted in Supabase.
 *
 * The phone app, CarPlay scene, and Android Auto service all read and write
 * the same row keyed by `session_id` so a user can switch surfaces and
 * resume mid-track without re-loading the queue.
 */

import { getSessionId, supabase } from '@/lib/supabase';

export type PlayUpSession = {
  sessionId: string;
  trackId: string | null;
  positionMs: number;
  queueIds: string[];
  surface: 'phone' | 'carplay' | 'androidauto' | 'web';
  updatedAt: string;
};

export type PlayUpSessionStore = {
  load(): Promise<PlayUpSession | null>;
  save(s: Omit<PlayUpSession, 'sessionId' | 'updatedAt'>): Promise<void>;
};

export function createSessionStore(): PlayUpSessionStore {
  return {
    async load() {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('playback_sessions')
        .select('session_id, track_id, position_ms, queue_ids, surface, updated_at')
        .eq('session_id', getSessionId())
        .maybeSingle();
      if (error || !data) return null;
      return {
        sessionId: data.session_id,
        trackId: data.track_id,
        positionMs: data.position_ms ?? 0,
        queueIds: (data.queue_ids ?? []) as string[],
        surface: (data.surface ?? 'web') as PlayUpSession['surface'],
        updatedAt: data.updated_at,
      };
    },
    async save(s) {
      if (!supabase) return;
      const { error } = await supabase.from('playback_sessions').upsert(
        {
          session_id: getSessionId(),
          track_id: s.trackId,
          position_ms: s.positionMs,
          queue_ids: s.queueIds,
          surface: s.surface,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' },
      );
      if (error) console.warn('PlayUpSession save failed', error.message);
    },
  };
}
