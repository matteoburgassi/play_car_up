/**
 * Cross-platform playback contract. The web implementation lives in
 * `webPlayback.ts`. The Android implementation is the native Kotlin module
 * in `android/.../PlayUpPlaybackModule.kt`. Keeping the same API on both
 * sides means RN screens consume the module identically.
 */

export type QueueItem = {
  id: string;
  url: string;
  title: string;
  artist: string;
  artworkUrl: string;
};

export type PlayerState = 'idle' | 'buffering' | 'ready' | 'ended' | 'error';

export type PlaybackEvents = {
  state: PlayerState;
  positionMs: number;
  durationMs: number;
  trackIndex: number;
  error: string;
};

export type Listener<K extends keyof PlaybackEvents> = (value: PlaybackEvents[K]) => void;

export interface PlayUpPlaybackModule {
  setQueue(items: QueueItem[]): Promise<void>;
  playItemAt(index: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(ms: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
  addListener<K extends keyof PlaybackEvents>(event: K, listener: Listener<K>): () => void;
}
