/**
 * Android Auto JS bridge.
 *
 * Talks to the native `PlayUpAndroidAuto` module (Kotlin), which fronts a
 * `MediaBrowserServiceCompat` and `MediaSessionCompat`. The native service
 * publishes the browse tree to Android Auto and forwards transport callbacks
 * here as `RemoteTransportCommand` events.
 *
 * Android-only. On other platforms, methods are no-ops.
 */
import type {
  RemoteNowPlaying,
  RemoteSurface,
  RemoteTransportCommand,
} from '../../../src/sdk/remote';
import { createSurfaceBridge, type SurfaceBridge } from './surfaceBridge';
import type { PlayUpPlaybackModule } from '../../../src/playback/PlayUpPlaybackModule';

type Native = {
  setBrowseTree(payload: SerializedTree): Promise<void>;
  setPlaybackState(np: RemoteNowPlaying): Promise<void>;
};

type SerializedTree = {
  rootId: string;
  rootTitle: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    artworkUrl?: string;
    playable: boolean;
  }>;
};

let bridge: SurfaceBridge | null = null;

export const PlayUpAndroidAuto = {
  async attach(playback: PlayUpPlaybackModule, surface: RemoteSurface): Promise<void> {
    if (!isAndroid()) return;
    const { native, emitter } = await loadNative();
    if (!native || !emitter) return;

    bridge?.dispose();
    bridge = createSurfaceBridge({
      playback,
      surface,
      onNowPlaying: (np) => { void native.setPlaybackState(np); },
      onSurface: (s) => { void native.setBrowseTree(serialize(s)); },
    });

    emitter.removeAllListeners('PlayUpAndroidAutoCommand');
    emitter.addListener('PlayUpAndroidAutoCommand', (cmd: RemoteTransportCommand) => {
      void bridge?.dispatch(cmd);
    });
  },
  detach(): void {
    bridge?.dispose();
    bridge = null;
  },
};

function isAndroid(): boolean {
  try {
    const { Platform } = require('react-native') as typeof import('react-native');
    return Platform.OS === 'android';
  } catch {
    return false;
  }
}

async function loadNative(): Promise<{
  native: Native | null;
  emitter: import('react-native').NativeEventEmitter | null;
}> {
  try {
    const RN = require('react-native') as typeof import('react-native');
    const native = (RN.NativeModules as Record<string, Native | undefined>).PlayUpAndroidAuto ?? null;
    const emitter = native ? new RN.NativeEventEmitter(native as never) : null;
    return { native, emitter };
  } catch {
    return { native: null, emitter: null };
  }
}

function serialize(s: RemoteSurface): SerializedTree {
  return {
    rootId: s.root.id,
    rootTitle: s.root.title,
    items: (s.root.children ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      artworkUrl: c.artworkUrl,
      playable: c.playable,
    })),
  };
}
