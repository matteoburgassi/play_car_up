/**
 * `expo-av`-backed implementation of `PlayUpPlaybackModule`.
 *
 * Mirrors the web implementation in `src/playback/webPlayback.ts` so callers
 * receive the same events on every platform. The instance is also used as the
 * source of truth for the CarPlay and Android Auto surface bridges – they
 * never own state, they only project this module's events.
 */
import type {
  Listener,
  PlaybackEvents,
  PlayerState,
  PlayUpPlaybackModule,
  QueueItem,
} from '../../../src/playback/PlayUpPlaybackModule';

// `expo-av` is provided by the host app (declared as a peer dependency).
// We import lazily at runtime to keep the package importable from
// non-RN tooling such as type-checks and tests.
type AudioModule = typeof import('expo-av');

type Bag = { [K in keyof PlaybackEvents]: Set<Listener<K>> };

let cached: PlayUpPlaybackModule | null = null;

export function getNativePlayback(): PlayUpPlaybackModule {
  if (!cached) cached = new NativePlayback();
  return cached;
}

class NativePlayback implements PlayUpPlaybackModule {
  private queue: QueueItem[] = [];
  private index = -1;
  private sound: import('expo-av').Audio.Sound | null = null;
  private listeners: Bag = {
    state: new Set(),
    positionMs: new Set(),
    durationMs: new Set(),
    trackIndex: new Set(),
    error: new Set(),
  };
  private mod: AudioModule | null = null;

  private async av(): Promise<AudioModule> {
    if (!this.mod) this.mod = await import('expo-av');
    return this.mod;
  }

  async setQueue(items: QueueItem[]): Promise<void> {
    this.queue = items.slice();
    this.index = -1;
    this.emit('trackIndex', -1);
  }

  async playItemAt(index: number): Promise<void> {
    if (index < 0 || index >= this.queue.length) return;
    const item = this.queue[index];
    const { Audio } = await this.av();

    if (this.sound) {
      try { await this.sound.unloadAsync(); } catch { /* noop */ }
      this.sound = null;
    }

    this.index = index;
    this.emit('trackIndex', index);
    this.emitState('buffering');

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: item.url },
        { shouldPlay: true },
        (status) => this.onStatus(status),
      );
      this.sound = sound;
    } catch (e) {
      this.emit('error', (e as Error).message);
      this.emitState('error');
    }
  }

  async play(): Promise<void> {
    if (this.index < 0 && this.queue.length > 0) return this.playItemAt(0);
    if (!this.sound) return;
    try { await this.sound.playAsync(); } catch (e) {
      this.emit('error', (e as Error).message);
    }
  }

  async pause(): Promise<void> {
    if (!this.sound) return;
    try { await this.sound.pauseAsync(); } catch { /* noop */ }
  }

  async seekTo(ms: number): Promise<void> {
    if (!this.sound || !isFinite(ms)) return;
    try { await this.sound.setPositionAsync(ms); } catch { /* noop */ }
    this.emit('positionMs', ms);
  }

  async skipToNext(): Promise<void> {
    if (this.index + 1 < this.queue.length) await this.playItemAt(this.index + 1);
  }

  async skipToPrevious(): Promise<void> {
    if (this.index > 0) await this.playItemAt(this.index - 1);
  }

  addListener<K extends keyof PlaybackEvents>(event: K, listener: Listener<K>): () => void {
    this.listeners[event].add(listener as never);
    return () => { this.listeners[event].delete(listener as never); };
  }

  private onStatus(status: import('expo-av').AVPlaybackStatus) {
    if (!status.isLoaded) {
      if ('error' in status && status.error) {
        this.emit('error', String(status.error));
        this.emitState('error');
      }
      return;
    }
    if (typeof status.durationMillis === 'number') {
      this.emit('durationMs', status.durationMillis);
    }
    this.emit('positionMs', status.positionMillis ?? 0);
    if (status.didJustFinish) {
      this.emitState('ended');
      void this.skipToNext();
      return;
    }
    if (status.isBuffering) this.emitState('buffering');
    else if (status.isPlaying) this.emitState('ready');
    else this.emitState('ready');
  }

  private emit<K extends keyof PlaybackEvents>(event: K, value: PlaybackEvents[K]) {
    for (const fn of this.listeners[event]) (fn as Listener<K>)(value);
  }

  private emitState(s: PlayerState) { this.emit('state', s); }
}
