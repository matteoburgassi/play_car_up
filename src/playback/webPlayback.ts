import type {
  Listener,
  PlaybackEvents,
  PlayUpPlaybackModule,
  PlayerState,
  QueueItem,
} from './PlayUpPlaybackModule';

type Bag = { [K in keyof PlaybackEvents]: Set<Listener<K>> };

class WebPlayback implements PlayUpPlaybackModule {
  private audio: HTMLAudioElement;
  private queue: QueueItem[] = [];
  private index = -1;
  private listeners: Bag = {
    state: new Set(),
    positionMs: new Set(),
    durationMs: new Set(),
    trackIndex: new Set(),
    error: new Set(),
  };
  private posTimer: number | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.addEventListener('waiting', () => this.emitState('buffering'));
    this.audio.addEventListener('playing', () => this.emitState('ready'));
    this.audio.addEventListener('pause', () => {
      if (!this.audio.ended) this.emitState('ready');
    });
    this.audio.addEventListener('ended', () => this.emitState('ended'));
    this.audio.addEventListener('error', () => {
      const msg = this.audio.error?.message ?? 'audio error';
      this.emit('error', msg);
      this.emitState('error');
    });
    this.audio.addEventListener('loadedmetadata', () => {
      const ms = isFinite(this.audio.duration) ? Math.round(this.audio.duration * 1000) : 0;
      this.emit('durationMs', ms);
    });
  }

  async setQueue(items: QueueItem[]): Promise<void> {
    this.queue = items.slice();
    this.index = -1;
    this.emit('trackIndex', -1);
  }

  async playItemAt(index: number): Promise<void> {
    if (index < 0 || index >= this.queue.length) return;
    this.index = index;
    const item = this.queue[index];
    this.audio.src = item.url;
    this.emit('trackIndex', index);
    this.emitState('buffering');
    try {
      await this.audio.play();
      this.startTicker();
    } catch (e) {
      this.emit('error', (e as Error).message);
      this.emitState('error');
    }
  }

  async play(): Promise<void> {
    if (this.index < 0 && this.queue.length > 0) {
      return this.playItemAt(0);
    }
    try {
      await this.audio.play();
      this.startTicker();
    } catch (e) {
      this.emit('error', (e as Error).message);
      this.emitState('error');
    }
  }

  async pause(): Promise<void> {
    this.audio.pause();
    this.stopTicker();
  }

  async seekTo(ms: number): Promise<void> {
    if (!isFinite(ms)) return;
    this.audio.currentTime = ms / 1000;
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
    return () => {
      this.listeners[event].delete(listener as never);
    };
  }

  private emit<K extends keyof PlaybackEvents>(event: K, value: PlaybackEvents[K]) {
    for (const fn of this.listeners[event]) (fn as Listener<K>)(value);
  }

  private emitState(s: PlayerState) {
    this.emit('state', s);
  }

  private startTicker() {
    if (this.posTimer != null) return;
    this.posTimer = window.setInterval(() => {
      this.emit('positionMs', Math.round(this.audio.currentTime * 1000));
    }, 500);
  }

  private stopTicker() {
    if (this.posTimer != null) {
      clearInterval(this.posTimer);
      this.posTimer = null;
    }
  }
}

let instance: PlayUpPlaybackModule | null = null;
export function getPlayback(): PlayUpPlaybackModule {
  if (!instance) instance = new WebPlayback();
  return instance;
}
