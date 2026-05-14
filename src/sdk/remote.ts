/**
 * RemoteSurface: a platform-neutral browse/now-playing model.
 *
 * CarPlay (`CPListTemplate` / `CPNowPlayingTemplate`) and Android Auto
 * (`MediaBrowserServiceCompat` + `MediaSessionCompat`) consume this same
 * structure. The native bridges are responsible for translating it into
 * `CPListItem` or `MediaBrowserCompat.MediaItem` instances.
 */

import type { GalaxyResponse, Media } from '@/galaxy/types';
import { selectAutomotiveStream } from '@/playback/selectStream';
import type { QueueItem } from '@/playback/PlayUpPlaybackModule';

export type RemoteBrowseNode = {
  id: string;
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  playable: boolean;
  children?: RemoteBrowseNode[];
  /** Set on leaves: the queue item to enqueue and play. */
  queueItem?: QueueItem;
};

export type RemoteNowPlaying = {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  durationMs: number;
  positionMs: number;
  playing: boolean;
};

export type RemoteTransportCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'seek'; positionMs: number }
  | { type: 'playId'; id: string };

export type RemoteSurface = {
  root: RemoteBrowseNode;
  /** Flat queue, in browse order, ready to hand to a `PlayUpPlaybackModule`. */
  queue: QueueItem[];
};

export function buildRemoteSurface(galaxy: GalaxyResponse, allowFull = true): RemoteSurface {
  const queue: QueueItem[] = [];
  const children: RemoteBrowseNode[] = [];

  for (const media of galaxy.items) {
    const item = mediaToQueueItem(media, allowFull);
    if (!item) continue;
    queue.push(item);
    children.push({
      id: item.id,
      title: item.title,
      subtitle: item.artist,
      artworkUrl: item.artworkUrl || undefined,
      playable: true,
      queueItem: item,
    });
  }

  return {
    queue,
    root: {
      id: 'root',
      title: galaxy.rubric || 'PlayUP',
      playable: false,
      children,
    },
  };
}

function mediaToQueueItem(media: Media, allowFull: boolean): QueueItem | null {
  const delivery = selectAutomotiveStream(media, allowFull);
  if (!delivery) return null;
  return {
    id: media.id,
    url: delivery.url,
    title: media.title,
    artist: media.artist,
    artworkUrl: media.artworkUrl ?? '',
  };
}
