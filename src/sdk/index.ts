/**
 * @playup/sdk-core public surface.
 *
 * Platform hosts (web, React Native, CarPlay scene, Android Auto service)
 * import only from this barrel so the contract stays stable while the
 * underlying implementations evolve.
 */

export type {
  PlayUpPlaybackModule,
  PlayerState,
  PlaybackEvents,
  Listener,
  QueueItem,
} from '@/playback/PlayUpPlaybackModule';

export { selectAudioStream, selectAutomotiveStream } from '@/playback/selectStream';

export type {
  GalaxyEnv,
  GalaxyMode,
} from '@/galaxy/client';
export {
  buildContentListUrl,
  buildRubricUrl,
  buildSmartConfigUrl,
  fetchGalaxyRubric,
  loadSmartConfig,
  resolveMode,
} from '@/galaxy/client';

export type {
  GalaxyResponse,
  Media,
  SmartConfig,
  StreamDelivery,
} from '@/galaxy/types';

export type {
  RemoteBrowseNode,
  RemoteNowPlaying,
  RemoteSurface,
  RemoteTransportCommand,
} from './remote';
export { buildRemoteSurface } from './remote';

export type { PlayUpSession, PlayUpSessionStore } from './session';
export { createSessionStore } from './session';

export type { RecentPlay } from '@/lib/playHistory';
export { fetchRecent, recordPlay } from '@/lib/playHistory';
