import { useEffect, useMemo, useState } from 'react';
import { fetchGalaxyRubric, loadSmartConfig, resolveMode } from '@/galaxy/client';
import type { GalaxyEnv } from '@/galaxy/client';
import type { GalaxyResponse, Media } from '@/galaxy/types';
import { selectAudioStream } from '@/playback/selectStream';
import { getPlayback } from '@/playback/webPlayback';
import type { QueueItem, PlayerState } from '@/playback/PlayUpPlaybackModule';
import { TrackList } from './TrackList';
import { MiniPlayer } from './MiniPlayer';
import { NowPlaying } from './NowPlaying';
import { recordPlay } from '@/lib/playHistory';

const env: GalaxyEnv = {
  smartConfigUrl: (import.meta.env.VITE_SMARTCONFIG_URL as string) || undefined,
  smartConfigLogin: (import.meta.env.VITE_SMARTCONFIG_LOGIN as string) || undefined,
  smartConfigPass: (import.meta.env.VITE_SMARTCONFIG_PASS as string) || undefined,
  smartConfigApplicationId:
    (import.meta.env.VITE_SMARTCONFIG_APPLICATION_ID as string) || undefined,
  smartConfigWantedVersion:
    (import.meta.env.VITE_SMARTCONFIG_WANTED_VERSION as string) || undefined,
  apiKey: (import.meta.env.VITE_GALAXY_API_KEY as string) || undefined,
  apiSecretKey: (import.meta.env.VITE_GALAXY_API_SECRET_KEY as string) || undefined,
  campaignId: (import.meta.env.VITE_GALAXY_CAMPAIGN_ID as string) || undefined,
  languageCode: (import.meta.env.VITE_GALAXY_LANGUAGE_CODE as string) || undefined,
  countryCode: (import.meta.env.VITE_GALAXY_COUNTRY_CODE as string) || undefined,
  rubricId: (import.meta.env.VITE_GALAXY_RUBRIC_ID as string) || undefined,
  rubricPath: (import.meta.env.VITE_GALAXY_RUBRIC_PATH as string) || undefined,
};

export function App() {
  const [data, setData] = useState<GalaxyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackIndex, setTrackIndex] = useState(-1);
  const [state, setState] = useState<PlayerState>('idle');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [npOpen, setNpOpen] = useState(false);

  const mode = resolveMode(env);
  const playback = useMemo(() => getPlayback(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await loadSmartConfig(env);
        const res = await fetchGalaxyRubric(env, cfg);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const offs = [
      playback.addListener('state', setState),
      playback.addListener('positionMs', setPosition),
      playback.addListener('durationMs', setDuration),
      playback.addListener('trackIndex', setTrackIndex),
      playback.addListener('error', (m) => setError(m)),
    ];
    return () => { offs.forEach((o) => o()); };
  }, [playback]);

  const queue: QueueItem[] = useMemo(() => {
    if (!data) return [];
    return data.items
      .map((m: Media) => {
        const d = selectAudioStream(m, true);
        if (!d) return null;
        return {
          id: m.id,
          url: d.url,
          title: m.title,
          artist: m.artist,
          artworkUrl: m.artworkUrl ?? '',
        } satisfies QueueItem;
      })
      .filter((x): x is QueueItem => !!x);
  }, [data]);

  const onPlayIndex = async (i: number) => {
    await playback.setQueue(queue);
    await playback.playItemAt(i);
    void recordPlay(queue[i]);
  };

  const playing = state === 'ready' || state === 'buffering';
  const current = trackIndex >= 0 ? queue[trackIndex] : undefined;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <h1>PlayUP</h1>
            <small>Galaxy POC</small>
          </div>
        </div>
        <span className={`mode-pill ${mode}`}>{mode === 'live' ? 'Live' : 'Mock'}</span>
      </header>

      {error && <div className="banner">{error}</div>}

      <div className="section-title">{data?.rubric ?? 'Tracks'}</div>

      {loading ? (
        <div className="list" style={{ padding: 8 }}>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : (
        <TrackList
          items={queue}
          activeIndex={trackIndex}
          playing={playing}
          onSelect={onPlayIndex}
        />
      )}

      {current && (
        <MiniPlayer
          item={current}
          playing={playing}
          onToggle={async () => {
            if (playing) await playback.pause();
            else await playback.play();
          }}
          onOpen={() => setNpOpen(true)}
          onNext={() => playback.skipToNext()}
        />
      )}

      {npOpen && current && (
        <NowPlaying
          item={current}
          state={state}
          positionMs={position}
          durationMs={duration}
          onClose={() => setNpOpen(false)}
          onToggle={async () => {
            if (playing) await playback.pause();
            else await playback.play();
          }}
          onSeek={(ms) => playback.seekTo(ms)}
          onNext={() => playback.skipToNext()}
          onPrev={() => playback.skipToPrevious()}
        />
      )}
    </div>
  );
}
