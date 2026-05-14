/**
 * SurfaceBridge wires a `PlayUpPlaybackModule` and a `RemoteSurface` to a
 * native event sink (CarPlay or Android Auto). The native modules emit
 * `RemoteTransportCommand` values; the bridge applies them to the playback
 * module and pushes back the resulting `RemoteNowPlaying` snapshot.
 *
 * Both car platforms speak the same shape, so they can share this glue.
 */
import type { NativeEventSubscription } from 'react-native';
import type {
  PlayUpPlaybackModule,
  QueueItem,
} from '../../../src/playback/PlayUpPlaybackModule';
import type {
  RemoteNowPlaying,
  RemoteSurface,
  RemoteTransportCommand,
} from '../../../src/sdk/remote';

export type SurfaceBridgeOptions = {
  playback: PlayUpPlaybackModule;
  surface: RemoteSurface;
  onNowPlaying: (np: RemoteNowPlaying) => void;
  onSurface: (s: RemoteSurface) => void;
};

export type SurfaceBridge = {
  dispatch(cmd: RemoteTransportCommand): Promise<void>;
  dispose(): void;
};

export function createSurfaceBridge(opts: SurfaceBridgeOptions): SurfaceBridge {
  const { playback, surface, onNowPlaying, onSurface } = opts;
  let queue: QueueItem[] = surface.queue;
  let index = -1;
  let positionMs = 0;
  let durationMs = 0;
  let playing = false;

  onSurface(surface);

  const subs: Array<() => void> = [
    playback.addListener('trackIndex', (i) => { index = i; emit(); }),
    playback.addListener('positionMs', (p) => { positionMs = p; emit(); }),
    playback.addListener('durationMs', (d) => { durationMs = d; emit(); }),
    playback.addListener('state', (s) => {
      playing = s === 'ready' || s === 'buffering';
      emit();
    }),
  ];

  function emit() {
    const item = index >= 0 ? queue[index] : null;
    if (!item) return;
    onNowPlaying({
      trackId: item.id,
      title: item.title,
      artist: item.artist,
      artworkUrl: item.artworkUrl || undefined,
      durationMs,
      positionMs,
      playing,
    });
  }

  return {
    async dispatch(cmd) {
      switch (cmd.type) {
        case 'play': return playback.play();
        case 'pause': return playback.pause();
        case 'next': return playback.skipToNext();
        case 'previous': return playback.skipToPrevious();
        case 'seek': return playback.seekTo(cmd.positionMs);
        case 'playId': {
          const i = queue.findIndex((q) => q.id === cmd.id);
          if (i >= 0) {
            await playback.setQueue(queue);
            await playback.playItemAt(i);
          }
          return;
        }
      }
    },
    dispose() {
      for (const off of subs) off();
    },
  };
}

// `NativeEventSubscription` is referenced to keep the RN type dependency
// honest even though the bridge currently uses the JS-side event bus only.
export type _Reserved = NativeEventSubscription;
