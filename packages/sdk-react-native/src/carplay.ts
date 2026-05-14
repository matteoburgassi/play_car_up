/**
 * CarPlay JS bridge.
 *
 * Talks to the native `PlayUpCarPlay` module (Swift) through React Native's
 * `NativeModules` and `NativeEventEmitter`. The native side owns the
 * CarPlay scene templates; this JS side owns the playback module and feeds
 * it a `RemoteSurface`.
 *
 * iOS-only. On other platforms, methods are no-ops.
 */
import type {
  RemoteNowPlaying,
  RemoteSurface,
  RemoteTransportCommand,
} from '../../../src/sdk/remote';
import { createSurfaceBridge, type SurfaceBridge } from './surfaceBridge';
import type { PlayUpPlaybackModule } from '../../../src/playback/PlayUpPlaybackModule';

type Native = {
  setSurface(payload: SerializedSurface): Promise<void>;
  setNowPlaying(np: RemoteNowPlaying): Promise<void>;
};

type SerializedSurface = {
  rootId: string;
  rootTitle: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    artworkUrl?: string;
  }>;
};

let bridge: SurfaceBridge | null = null;

export const PlayUpCarPlay = {
  async attach(playback: PlayUpPlaybackModule, surface: RemoteSurface): Promise<void> {
    if (!isIOS()) return;
    const { native, emitter } = await loadNative();
    if (!native || !emitter) return;

    bridge?.dispose();
    bridge = createSurfaceBridge({
      playback,
      surface,
      onNowPlaying: (np) => { void native.setNowPlaying(np); },
      onSurface: (s) => { void native.setSurface(serialize(s)); },
    });

    emitter.removeAllListeners('PlayUpCarPlayCommand');
    emitter.addListener('PlayUpCarPlayCommand', (cmd: RemoteTransportCommand) => {
      void bridge?.dispatch(cmd);
    });
  },
  detach(): void {
    bridge?.dispose();
    bridge = null;
  },
};

function isIOS(): boolean {
  try {
    const { Platform } = require('react-native') as typeof import('react-native');
    return Platform.OS === 'ios';
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
    const native = (RN.NativeModules as Record<string, Native | undefined>).PlayUpCarPlay ?? null;
    const emitter = native ? new RN.NativeEventEmitter(native as never) : null;
    return { native, emitter };
  } catch {
    return { native: null, emitter: null };
  }
}

function serialize(s: RemoteSurface): SerializedSurface {
  return {
    rootId: s.root.id,
    rootTitle: s.root.title,
    items: (s.root.children ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      artworkUrl: c.artworkUrl,
    })),
  };
}
