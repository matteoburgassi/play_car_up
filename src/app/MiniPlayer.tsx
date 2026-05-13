import type { QueueItem } from '@/playback/PlayUpPlaybackModule';

type Props = {
  item: QueueItem;
  playing: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onNext: () => void;
};

export function MiniPlayer({ item, playing, onToggle, onOpen, onNext }: Props) {
  return (
    <div className="miniplayer" role="region" aria-label="Mini player">
      <div className="miniplayer-inner">
        <img className="miniplayer-art" src={item.artworkUrl} alt="" onClick={onOpen} />
        <div className="miniplayer-meta" onClick={onOpen}>
          <div className="miniplayer-title">{item.title}</div>
          <div className="miniplayer-sub">{item.artist}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" aria-label={playing ? 'Pause' : 'Play'} onClick={onToggle}>
            {playing ? '\u2225' : '\u25B6'}
          </button>
          <button className="icon-btn ghost" aria-label="Next" onClick={onNext}>
            {'\u23ED'}
          </button>
        </div>
      </div>
    </div>
  );
}
